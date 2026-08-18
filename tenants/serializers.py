from rest_framework import serializers
from .models import Shop, Employee


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = [
            "id", "owner", "slug", "address", "description", "phone_number",
            "currency", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EmployeeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "user", "username", "shop", "role", "is_active", "created_at"]
        read_only_fields = ["id", "shop", "created_at"]
