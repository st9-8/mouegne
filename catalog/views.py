from rest_framework import viewsets

from core.permissions import IsShopMember
from core.schema import shop_scoped_schema

from catalog.models import Category, Item
from catalog.serializers import CategorySerializer, ItemSerializer


@shop_scoped_schema
class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsShopMember]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Category.objects.none()
        return Category.objects.filter(merchant=self.request.shop.owner)

    def perform_create(self, serializer):
        serializer.save(merchant=self.request.shop.owner
                        )


@shop_scoped_schema
class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = [IsShopMember]
    filterset_fields = ["category", "vendor"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "price", "quantity", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Item.objects.none()
        return Item.objects.filter(shop=self.request.shop).select_related("category", "vendor")

    def perform_create(self, serializer):
        serializer.save(shop=self.request.shop)
