from rest_framework import viewsets

from django_filters import rest_framework as filters

from core.permissions import IsShopMember
from core.schema import shop_scoped_schema

from inventory.models import Vendor, Purchase

from inventory.serializers import VendorSerializer, PurchaseSerializer

from inventory.services import reverse_purchase


@shop_scoped_schema
class VendorViewSet(viewsets.ModelViewSet):
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
class PurchaseViewSet(viewsets.ModelViewSet):
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
