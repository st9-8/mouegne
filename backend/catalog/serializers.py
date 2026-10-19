from rest_framework import serializers

from catalog.models import MAX_IMAGES_PER_ITEM
from catalog.models import Category, Item, ItemImage, StockMovement

from catalog.services import create_item

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class ItemImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ItemImage
        fields = ["id", "position", "url", "thumbnail_url"]

    def _absolute(self, path):
        request = self.context.get("request")
        return request.build_absolute_uri(path) if request else path

    def get_url(self, obj):
        return self._absolute(obj.image.url)

    def get_thumbnail_url(self, obj):
        return self._absolute(obj.thumbnail.url)


class ItemImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()  # passe par Pillow : refuse un faux .jpg

    def validate_image(self, f):
        if f.size > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("L'image ne doit pas dépasser 5 Mo.")
        return f


class ItemImageOrderSerializer(serializers.Serializer):
    order = serializers.ListField(child=serializers.UUIDField(), allow_empty=False, max_length=MAX_IMAGES_PER_ITEM)


class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    vendor_name = serializers.CharField(source="vendor.name", read_only=True, default=None)
    images = ItemImageSerializer(many=True, read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    card_url = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            "id", "name", "slug", "description", "category", "category_name",
            "vendor", "vendor_name", "images", "quantity", "price", "purchase_price", "thumbnail_url", "card_url",
            "expiring_date", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]
        extra_kwargs = {"quantity": {"min_value": 0}}

    def create(self, validated_data):
        request = self.context['request']
        shop = request.shop

        validated_data.pop("shop", None)
        try:
            return create_item(shop=shop, employee=request.employee, **validated_data)
        except ValueError as e:
            raise serializers.ValidationError(str(e))

    def update(self, instance, validated_data):
        if "quantity" in validated_data and validated_data["quantity"] != instance.quantity:
            raise serializers.ValidationError(
                {"quantity": "Le stock se modifie avec « Modifier le stock » (ou par une vente / une réception)."})
        validated_data.pop("quantity", None)
        return super().update(instance, validated_data)

    def _first_image_url(self, obj, spec_name):
        first = next(iter(obj.images.all()), None)  # préfetché : aucune requête
        if first is None:
            return None
        request = self.context.get("request")
        url = getattr(first, spec_name).url
        return request.build_absolute_uri(url) if request else url

    def get_thumbnail_url(self, obj):
        return self._first_image_url(obj, "thumbnail")

    def get_card_url(self, obj):
        return self._first_image_url(obj, "card")


class QuickItemCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField(min_value=0, default=1)


class StockAdjustmentInputSerializer(serializers.Serializer):
    direction = serializers.ChoiceField(choices=["add", "remove"])
    quantity = serializers.IntegerField(min_value=1, max_value=1_000_000)
    note = serializers.CharField(required=False, allow_blank=True, max_length=300, default="")


class StockMovementSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    employee_username = serializers.CharField(source="employee.user.username", read_only=True, default=None)

    class Meta:
        model = StockMovement
        fields = ["id", "kind", "kind_label", "delta", "quantity_before", "quantity_after",
                  "note", "source_ref", "employee_username", "created_at"]
