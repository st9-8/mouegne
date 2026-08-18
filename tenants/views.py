from django.db import models
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.generics import CreateAPIView

from core.permissions import IsShopOwner
from core.permissions import IsShopMember

from core.schema import shop_scoped_schema

from tenants.services import create_shop
from tenants.models import Shop, Employee
from tenants.serializers import RegisterMerchantSerializer
from tenants.serializers import ShopSerializer, EmployeeSerializer


class RegisterMerchantView(CreateAPIView):
    serializer_class = RegisterMerchantSerializer
    permission_classes = [AllowAny]


class ShopViewSet(viewsets.ModelViewSet):
    serializer_class = ShopSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsShopOwner()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Shop.objects.none()
        user = self.request.user
        return Shop.objects.filter(
            models.Q(merchant__user=user) | models.Q(employees__user=user, employees__is_active=True)
        ).distinct()

    def perform_create(self, serializer):
        merchant = self.request.user.merchant
        shop = create_shop(merchant=merchant, **serializer.validated_data)
        serializer.instance = shop


@shop_scoped_schema
class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [IsShopMember]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Employee.objects.none()
        return Employee.objects.filter(shop=self.request.shop)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.shop)
