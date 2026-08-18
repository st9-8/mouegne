from django.db import models
from rest_framework import viewsets

from core.permissions import IsShopMember

from core.schema import shop_scoped_schema

from tenants.models import Shop, Employee
from tenants.serializers import ShopSerializer, EmployeeSerializer


class ShopViewSet(viewsets.ModelViewSet):
    """
    Liste/CRUD des boutiques accessibles à l'utilisateur connecté.
    Pas de nesting ici : c'est la racine, /api/shops/.
    """
    serializer_class = ShopSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Shop.objects.none()

        # Boutiques où l'utilisateur est soit le merchant, soit un employee actif.
        user = self.request.user
        return Shop.objects.filter(
            models.Q(merchant__user=user) | models.Q(employees__user=user, employees__is_active=True)
        ).distinct()


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
