from rest_framework import serializers
from .models import Category, Item
from .services import create_item


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    vendor_name = serializers.CharField(source="vendor.name", read_only=True, default=None)

    class Meta:
        model = Item
        fields = [
            "id", "name", "slug", "description", "category", "category_name",
            "vendor", "vendor_name", "quantity", "price", "purchase_price",
            "expiring_date", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def create(self, validated_data):
        shop = self.context["request"].shop

        validated_data.pop("shop", None)
        try:
            return create_item(shop=shop, **validated_data)
        except ValueError as e:
            raise serializers.ValidationError(str(e))


class QuickItemCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField(min_value=0, default=1)
