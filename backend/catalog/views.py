from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsShopMember, ManagerOnlyMixin
from core.schema import shop_scoped_schema

from core.permissions import IsShopManager

from catalog.models import Category, Item
from catalog.services import quick_create_item
from catalog.serializers import CategorySerializer, ItemSerializer, QuickItemCreateSerializer


@shop_scoped_schema
class CategoryViewSet(ManagerOnlyMixin, viewsets.ModelViewSet):
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
    filterset_fields = ["category", "vendor"]
    search_fields = ["name"]

    def get_permissions(self):
        # Modifier/supprimer un article reste réservé à OWNER/MANAGER.
        # La lecture et la création (y compris quick_create) restent ouvertes
        # à tout membre de la boutique — nécessaire pour la vente au comptoir.
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsShopMember(), IsShopManager()]
        return [IsShopMember()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Item.objects.none()
        return Item.objects.filter(shop=self.request.shop).select_related("category", "vendor")

    @action(detail=False, methods=["post"], url_path="quick-create")
    def quick_create(self, request, *args, **kwargs):
        serializer = QuickItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = quick_create_item(shop=request.shop, **serializer.validated_data)
        return Response(ItemSerializer(item).data, status=201)
