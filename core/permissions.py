from rest_framework import permissions
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


class IsShopManager(BasePermission):
    """
        Combinée à IsShopMember (qui pose request.employee). Autorise la lecture
        à tout membre de la boutique, mais restreint l'écriture à OWNER/MANAGER.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        employee = getattr(request, "employee", None)
        return bool(employee and employee.role in ("OWNER", "MANAGER"))


class ManagerOnlyMixin:
    """
    Verrouille TOUTES les actions (lecture ET écriture) à OWNER/MANAGER.
    À utiliser sur les ressources qu'un CASHIER n'a jamais besoin de consulter
    (Category, Vendor, Purchase).
    """

    def get_permissions(self):
        return [IsShopMember(), IsShopManager()]


class ManagerWriteOnlyMixin:
    """
    Lecture ouverte à tout membre de la boutique, écriture réservée à
    OWNER/MANAGER. À utiliser sur les ressources qu'un CASHIER doit pouvoir
    consulter pendant une vente (Item, Customer) sans pouvoir les modifier.
    """

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsShopMember(), IsShopManager()]
        return [IsShopMember()]

class IsShopManagerStrict(BasePermission):
    """
    Contrairement à IsShopManager, ne fait aucune exception pour les
    méthodes de lecture : OWNER/MANAGER uniquement, sur toute action.
    """
    def has_permission(self, request, view):
        employee = getattr(request, "employee", None)
        return bool(employee and employee.role in ("OWNER", "MANAGER"))
