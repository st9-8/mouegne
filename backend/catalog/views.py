from rest_framework import status
from rest_framework import viewsets
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsShopMember, ManagerOnlyMixin
from core.schema import shop_scoped_schema

from core.permissions import IsShopManager, IsShopManagerStrict

from catalog.models import Category, Item, ItemImage, StockMovement
from catalog.services import quick_create_item, add_item_image, delete_item_image, reorder_item_images, adjust_stock
from catalog.serializers import CategorySerializer, ItemSerializer, ItemImageSerializer, ItemImageUploadSerializer, \
    ItemImageOrderSerializer, QuickItemCreateSerializer, StockMovementSerializer, StockAdjustmentInputSerializer


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
    ordering_fields = ["name", "price", "quantity", "created_at", "category__name"]

    from rest_framework.parsers import MultiPartParser

    UUID_RE = r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"

    # dans la classe :
    def get_permissions(self):
        if self.action == "stock_movements":  # lecture : l'historique révèle ventes et réceptions → OWNER/MANAGER seulement
            return [IsShopMember(), IsShopManagerStrict()]
        if self.action in ["update", "partial_update", "destroy", "add_image", "reorder_images",
                           "delete_image", "adjust_item_stock"]:
            return [IsShopMember(), IsShopManager()]
        return [IsShopMember()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Item.objects.none()
        return (Item.objects.filter(shop=self.request.shop)
                .select_related("category", "vendor").prefetch_related("images"))

    def _images_response(self, item, status_code=status.HTTP_200_OK):
        # Requête explicite : item.images.all() renverrait le cache de prefetch, donc l'état d'AVANT l'opération.
        images = ItemImage.objects.filter(item_id=item.pk)
        return Response(ItemImageSerializer(images, many=True, context=self.get_serializer_context()).data,
                        status=status_code)

    @action(detail=True, methods=["post"], url_path="images", parser_classes=[MultiPartParser])
    def add_image(self, request, *args, **kwargs):
        item = self.get_object()
        upload = ItemImageUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        try:
            add_item_image(item=item, file=upload.validated_data["image"])
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return self._images_response(item, status.HTTP_201_CREATED)

    @action(detail=True, methods=["put"], url_path="images/order")
    def reorder_images(self, request, *args, **kwargs):
        item = self.get_object()
        payload = ItemImageOrderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            reorder_item_images(item=item, ordered_ids=payload.validated_data["order"])
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return self._images_response(item)

    @action(detail=True, methods=["delete"], url_path=rf"images/(?P<image_id>{UUID_RE})")
    def delete_image(self, request, image_id, *args, **kwargs):
        item = self.get_object()
        try:
            delete_item_image(item=item, image_id=image_id)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return self._images_response(item)

    @action(detail=False, methods=["post"], url_path="quick-create")
    def quick_create(self, request, *args, **kwargs):
        serializer = QuickItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = quick_create_item(shop=request.shop, employee=request.employee, **serializer.validated_data)
        return Response(ItemSerializer(item).data, status=201)

    @action(detail=True, methods=["post"], url_path="stock-adjustments")
    def adjust_item_stock(self, request, *args, **kwargs):
        item = self.get_object()
        payload = StockAdjustmentInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            movement = adjust_stock(item=item, employee=request.employee, **payload.validated_data)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return Response(StockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="stock-movements")
    def stock_movements(self, request, *args, **kwargs):
        item = self.get_object()
        queryset = StockMovement.objects.filter(item=item).select_related("employee__user")
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(StockMovementSerializer(page, many=True).data)
