from django.db import models
from rest_framework import generics
from rest_framework import viewsets
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.generics import CreateAPIView

from tenants.services import add_employee
from tenants.serializers import ShopSettingsSerializer

from core.permissions import IsShopOwner
from core.permissions import IsShopMember
from core.permissions import IsShopManager

from core.schema import shop_scoped_schema

from tenants.services import create_shop
from tenants.models import Shop, Employee
from tenants.serializers import EmployeeCreateSerializer
from tenants.serializers import RegisterMerchantSerializer
from tenants.serializers import ShopSerializer, EmployeeSerializer


class RegisterMerchantView(CreateAPIView):
    serializer_class = RegisterMerchantSerializer
    permission_classes = [AllowAny]


class ShopViewSet(viewsets.ModelViewSet):
    serializer_class = ShopSerializer
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsShopOwner()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Shop.objects.none()
        user = self.request.user
        return Shop.objects.filter(
            models.Q(owner__user=user) | models.Q(tenants_employee_set__user=user, tenants_employee_set__is_active=True)
        ).distinct()

    def perform_create(self, serializer):
        merchant = self.request.user.merchant
        shop = create_shop(merchant=merchant, **serializer.validated_data)
        serializer.instance = shop


@shop_scoped_schema
class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsShopMember]

    def get_permissions(self):
        # Seuls OWNER/MANAGER peuvent créer, modifier ou désactiver un employé.
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsShopMember(), IsShopManager()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        return Employee.objects.filter(shop=self.request.shop).select_related("user")

    def get_serializer_class(self):
        return EmployeeCreateSerializer if self.action == "create" else EmployeeSerializer

    def create(self, request, *args, **kwargs):
        serializer = EmployeeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            employee = add_employee(shop=request.shop, **serializer.validated_data)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return Response(EmployeeSerializer(employee).data, status=201)


class ShopSettingsView(generics.RetrieveUpdateAPIView):
    """
        GET  /api/shops/{shop_pk}/settings/  — consultable par tout membre de la boutique
        PATCH /api/shops/{shop_pk}/settings/ — réservé à OWNER/MANAGER
    """
    serializer_class = ShopSettingsSerializer
    permission_classes = [IsShopMember, IsShopManager]

    def get_object(self):
        return self.request.shop.settings
