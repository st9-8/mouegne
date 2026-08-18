from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from tenants.models import Shop, Employee
from tenants.services import register_merchant


class RegisterMerchantSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    company_name = serializers.CharField(max_length=255)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    shop_name = serializers.CharField(max_length=255)

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        try:
            user, merchant, shop = register_merchant(**validated_data)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return {"user": user, "merchant": merchant, "shop": shop}

    def to_representation(self, instance):
        user = instance["user"]
        shop = instance["shop"]
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "shop_id": str(shop.id),
            "shop_name": shop.name,
        }


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
