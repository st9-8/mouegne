from django.shortcuts import get_object_or_404

from rest_framework import viewsets, serializers
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from core.permissions import IsShopMember

from core.schema import SHOP_PK_PARAMETER
from core.schema import shop_scoped_schema

from sales.models import Customer, Sale

from sales.serializers import CustomerSerializer, SaleCreateSerializer, SaleSerializer

from sales.services import create_sale


@shop_scoped_schema
class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsShopMember]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Customer.objects.none()
        return Customer.objects.filter(merchant=self.request.shop.merchant)

    def perform_create(self, serializer):
        serializer.save(merchant=self.request.shop.merchant)


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
    permission_classes = [IsShopMember]
    http_method_names = ["get", "post", "head"]  # pas d'update/delete sur une vente actée

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Sale.objects.none()

        return Sale.objects.filter(shop=self.request.shop).select_related(
            "customer", "employee__user"
        ).prefetch_related("saledetail_set__item")

    def get_serializer_class(self):
        return SaleCreateSerializer if self.action == "create" else SaleSerializer

    def create(self, request, *args, **kwargs):
        input_serializer = SaleCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        customer = None
        if data.get("customer_id"):
            customer = get_object_or_404(
                Customer, id=data["customer_id"], merchant=request.shop.merchant
            )

        payment_data = {
            key: data[key] for key in [
                "sub_total", "grand_total", "tax_amount", "tax_percentage",
                "amount_paid", "amount_change", "total_mobile_money",
                "cash_payment_amount", "mobile_money_covers_total", "has_sav",
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
