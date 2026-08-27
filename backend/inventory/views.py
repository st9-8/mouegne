from rest_framework import viewsets
from django.http import HttpResponse
from django.template.loader import render_to_string

from django_filters import rest_framework as filters

from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from weasyprint import HTML

from core.permissions import IsShopMember, ManagerOnlyMixin
from core.schema import shop_scoped_schema

from inventory.models import Vendor, Purchase, PurchaseBatch

from inventory.serializers import VendorSerializer, PurchaseSerializer
from inventory.serializers import PurchaseBatchSerializer, PurchaseBatchCreateSerializer

from inventory.services import reverse_purchase
from inventory.services import receive_purchase_batch


@shop_scoped_schema
class VendorViewSet(ManagerOnlyMixin, viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    permission_classes = [IsShopMember]
    search_fields = ["name", "address"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Vendor.objects.none()
        return Vendor.objects.filter(merchant=self.request.shop.owner)

    def perform_create(self, serializer):
        serializer.save(merchant=self.request.shop.owner)


@shop_scoped_schema
class PurchaseViewSet(ManagerOnlyMixin, viewsets.ModelViewSet):
    class PurchaseFilter(filters.FilterSet):
        date_after = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
        date_before = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

        class Meta:
            model = Purchase
            fields = ["item", "vendor", "date_after", "date_before"]

    serializer_class = PurchaseSerializer
    permission_classes = [IsShopMember]
    filterset_class = PurchaseFilter
    ordering_fields = ["created_at", "quantity", "total_value"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Purchase.objects.none()
        return Purchase.objects.filter(shop=self.request.shop).select_related("item", "vendor")

    def perform_destroy(self, instance):
        reverse_purchase(instance)


class PurchaseBatchViewSet(ManagerOnlyMixin, viewsets.ModelViewSet):
    """Verrouillé OWNER/MANAGER, cohérent avec Purchase/Vendor/Category."""
    serializer_class = PurchaseBatchSerializer
    http_method_names = ["get", "post", "head"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PurchaseBatch.objects.none()
        return PurchaseBatch.objects.filter(shop=self.request.shop).select_related("employee__user").prefetch_related(
            "purchases__item", "purchases__vendor")

    def create(self, request, *args, **kwargs):
        serializer = PurchaseBatchCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            batch = receive_purchase_batch(
                shop=request.shop,
                employee=request.employee,
                description=serializer.validated_data.get("description", ""),
                items_data=serializer.validated_data["items"],
            )
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return Response(PurchaseBatchSerializer(batch).data, status=201)

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, *args, **kwargs):
        batch = self.get_object()
        shop_settings = batch.shop.settings
        logo_path = None
        if shop_settings.logo:
            try:
                logo_path = f"file://{shop_settings.logo.path}"
            except (ValueError, FileNotFoundError):
                logo_path = None

        html_string = render_to_string("inventory/purchase_receipt.html", {
            "batch": batch, "shop": batch.shop, "shop_settings": shop_settings, "logo_path": logo_path,
        })
        pdf_bytes = HTML(string=html_string).write_pdf()
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="reception-{batch.reference}.pdf"'
        return response
