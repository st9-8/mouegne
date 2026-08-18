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
        ).select_related("shop", "shop__merchant").first()

        if not employee:
            return False

        request.employee = employee
        request.shop = employee.shop
        return True
