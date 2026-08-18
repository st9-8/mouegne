from rest_framework import serializers

from inventory.models import Vendor, Purchase

from inventory.services import receive_purchase


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "name", "slug", "phone_number", "address", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class PurchaseSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    vendor_name = serializers.CharField(source="vendor.name", read_only=True, default=None)

    class Meta:
        model = Purchase
        fields = [
            "id", "item", "item_name", "vendor", "vendor_name", "description",
            "quantity", "price", "total_value", "created_at",
        ]
        read_only_fields = ["id", "total_value", "created_at"]

    def create(self, validated_data):
        shop = self.context["request"].shop
        try:
            return receive_purchase(
                shop=shop,
                item=validated_data["item"],
                vendor=validated_data.get("vendor"),
                quantity=validated_data["quantity"],
                price=validated_data["price"],
                description=validated_data.get("description", ""),
            )
        except ValueError as e:
            raise serializers.ValidationError(str(e))