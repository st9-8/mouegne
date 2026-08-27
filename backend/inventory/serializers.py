from rest_framework import serializers

from inventory.models import Vendor, Purchase, PurchaseBatch

from inventory.services import receive_purchase


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "name", "slug", "phone_number", "address", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class PurchaseBatchItemInputSerializer(serializers.Serializer):
    item_id = serializers.UUIDField()
    vendor_id = serializers.UUIDField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)


class PurchaseBatchCreateSerializer(serializers.Serializer):
    description = serializers.CharField(required=False, allow_blank=True, default="")
    items = PurchaseBatchItemInputSerializer(many=True, allow_empty=False)


class PurchaseSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    vendor_name = serializers.CharField(source="vendor.name", read_only=True, default=None)
    batch_reference = serializers.CharField(source="batch.reference", read_only=True, default=None)

    class Meta:
        model = Purchase
        fields = [
            "id", "item", "item_name", "vendor", "vendor_name", "description",
            "quantity", "price", "total_value", "created_at", "batch_reference",
        ]
        read_only_fields = ["id", "total_value", "created_at", "batch_reference"]

    def create(self, validated_data):
        shop = self.context["request"].shop
        try:
            return receive_purchase(shop=shop, **validated_data)
        except ValueError as e:
            raise serializers.ValidationError(str(e))


class PurchaseBatchSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(read_only=True)
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    employee_username = serializers.CharField(source="employee.user.username", read_only=True, default=None)
    purchases = PurchaseSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseBatch
        fields = ["id", "reference", "description", "employee", "employee_username", "total_value", "created_at",
                  "purchases"]
