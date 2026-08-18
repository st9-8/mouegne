from rest_framework.permissions import BasePermission
from tenants.models import Employee


class IsShopMember(BasePermission):
    """
        Vérifie que l'utilisateur authentifié a un Employee actif sur le shop
        identifié dans l'URL (kwarg 'shop_pk'). Attache request.employee et
        request.shop pour réutilisation dans la vue/serializer.
    """

    def has_permission(self, request, view):
        shop_id = view.kwargs.get("shop_pk")
        if not shop_id:
            return False

        employee = Employee.objects.filter(
            user=request.user, shop_id=shop_id, is_active=True
        ).select_related("shop", "shop__owner").first()

        if not employee:
            return False

        request.employee = employee
        request.shop = employee.shop
        return True


class IsShopOwner(BasePermission):
    """
        Vérifie que l'utilisateur authentifié est le Merchant propriétaire
        de CET objet Shop précis (pas seulement qu'il possède un compte Merchant).
        Réservée aux actions d'écriture sur Shop (update/destroy).
    """

    def has_permission(self, request, view):
        return hasattr(request.user, "merchant")

    def has_object_permission(self, request, view, obj):
        return obj.merchant_id == request.user.merchant.id


class IsMerchant(BasePermission):
    """
        Vérifie que l'utilisateur authentifié possède un compte Merchant.
        Utilisée sur les endpoints réservés aux propriétaires (ex: création de boutique).
    """

    def has_permission(self, request, view):
        return hasattr(request.user, "merchant")
