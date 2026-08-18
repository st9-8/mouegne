from rest_framework import serializers
from tenants.models import Employee, Merchant


class ShopAccessSerializer(serializers.Serializer):
    """
        Une boutique à laquelle l'utilisateur connecté a accès, avec son rôle
    """

    shop_id = serializers.UUIDField(source='shop.id')
    shop_name = serializers.CharField(source='shop.name')
    role = serializers.CharField()


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField(source='user.id')
    username = serializers.CharField(source='user.username')
    is_merchant = serializers.SerializerMethodField()
    shops = serializers.SerializerMethodField()

    def get_is_merchant(self, obj):
        return Merchant.objects.filter(user=obj['user']).exists()

    def get_shops(self, obj):
        employees = Employee.objects.filter(user=obj['user'], is_active=True).select_related('shop')

        return ShopAccessSerializer(employees, many=True).data
