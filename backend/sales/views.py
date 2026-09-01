from datetime import timedelta
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Sum, F
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from rest_framework.views import APIView

from weasyprint import HTML

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, serializers

from django_filters import rest_framework as filters

from drf_spectacular.utils import extend_schema, extend_schema_view

from core.permissions import IsShopMember, ManagerWriteOnlyMixin, IsShopManagerStrict

from core.schema import SHOP_PK_PARAMETER
from core.schema import shop_scoped_schema

from sales.models import Customer, Sale, SaleDetail

from sales.serializers import CustomerSerializer, SaleCreateSerializer, SaleSerializer

from sales.services import create_sale


@shop_scoped_schema
class CustomerViewSet(ManagerWriteOnlyMixin, viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsShopMember]
    search_fields = ["first_name", "last_name", "phone", "email"]
    ordering_fields = ["first_name", "loyalty_points", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Customer.objects.none()
        return Customer.objects.filter(merchant=self.request.shop.owner)

    def perform_create(self, serializer):
        serializer.save(merchant=self.request.shop.owner)


@extend_schema_view(
    create=extend_schema(
        request=SaleCreateSerializer,
        responses={201: SaleSerializer},
        summary="Créer une vente au comptoir",
        parameters=[SHOP_PK_PARAMETER]
    ),
    list=extend_schema(responses={200: SaleSerializer(many=True)}, parameters=[SHOP_PK_PARAMETER]),
    retrieve=extend_schema(responses={200: SaleSerializer}, parameters=[SHOP_PK_PARAMETER]),
)
class SaleViewSet(viewsets.ModelViewSet):
    class SaleFilter(filters.FilterSet):
        date_after = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
        date_before = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

        class Meta:
            model = Sale
            fields = ["customer", "employee", "has_sav", "date_after", "date_before"]

    permission_classes = [IsShopMember]
    http_method_names = ["get", "post", "head"]  # pas d'update/delete sur une vente actée
    filterset_class = SaleFilter
    search_fields = ["first_name", "last_name", "phone", "email"]
    ordering_fields = ["first_name", "loyalty_points", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Sale.objects.none()

        queryset = Sale.objects.filter(shop=self.request.shop).select_related(
            "customer", "employee__user"
        ).prefetch_related("saledetail_set__item")

        # Par défaut : uniquement les ventes du jour, sauf si une plage de dates
        # est explicitement demandée via date_after/date_before.
        params = self.request.query_params
        if self.action == "list" and "date_after" not in params and "date_before" not in params:
            today = timezone.localdate()
            queryset = queryset.filter(created_at__date=today)

        return queryset

    def get_serializer_class(self):
        return SaleCreateSerializer if self.action == "create" else SaleSerializer

    def create(self, request, *args, **kwargs):
        input_serializer = SaleCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        customer = None
        if data.get("customer_id"):
            customer = get_object_or_404(
                Customer, id=data["customer_id"], merchant=request.shop.owner
            )

        payment_data = {
            key: data[key] for key in [
                "sub_total", "grand_total", "tax_amount", "tax_percentage",
                "amount_paid", "amount_change", "total_mobile_money",
                "cash_payment_amount", "mobile_money_covers_total", "has_sav",
                "customer_name_override",
            ]
        }

        try:
            sale = create_sale(
                shop=request.shop,
                customer=customer,
                employee=request.employee,
                items_data=data["items"],
                payment_data=payment_data,
                allow_zero_stock=request.shop.settings.allow_zero_stock_sale,
            )
        except ValueError as e:
            raise serializers.ValidationError(str(e))

        return Response(SaleSerializer(sale).data, status=201)

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, *args, **kwargs):
        sale = self.get_object()
        html_string = render_to_string("sales/receipt.html", {
            "sale": sale,
            "shop": sale.shop,
            "shop_settings": sale.shop.settings,
            "request": request,
        })
        pdf_bytes = HTML(string=html_string, base_url=request.build_absolute_uri("/")).write_pdf(
            stylesheets=[],
            presentational_hints=True,
        )
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="recu-{sale.id}.pdf"'
        return response


class DashboardStatsView(APIView):
    permission_classes = [IsShopMember, IsShopManagerStrict]

    def get(self, request, shop_pk):
        shop = request.shop
        today = timezone.localdate()

        date_after = request.query_params.get("date_after") or (today - timedelta(days=30)).isoformat()
        date_before = request.query_params.get("date_before") or today.isoformat()

        sales = Sale.objects.filter(shop=shop, created_at__date__gte=date_after, created_at__date__lte=date_before)
        details = SaleDetail.objects.filter(sale__in=sales)

        revenue = sales.aggregate(total=Sum("grand_total"))["total"] or 0
        profit = details.aggregate(
            total=Sum(F("price") * F("quantity") - F("cost_price") * F("quantity"))
        )["total"] or 0

        top_items = (
            details.values("item__id", "item__name")
            .annotate(total_qty=Sum("quantity"))
            .order_by("-total_qty")[:10]
        )
        least_items = (
            details.values("item__id", "item__name")
            .annotate(total_qty=Sum("quantity"))
            .order_by("total_qty")[:5]
        )

        return Response({
            "revenue": revenue,
            "profit": profit,
            "sales_count": sales.count(),
            "top_items": [{"item_id": str(i["item__id"]), "name": i["item__name"], "quantity": i["total_qty"]} for i in
                          top_items if i["item__id"]],
            "least_items": [{"item_id": str(i["item__id"]), "name": i["item__name"], "quantity": i["total_qty"]} for i
                            in least_items if i["item__id"]],
        })
