from django.urls import path, include
from rest_framework.routers import SimpleRouter

from inventory.views import VendorViewSet, PurchaseViewSet

router = SimpleRouter()
router.register(r"vendors", VendorViewSet, basename="shop-vendors")
router.register(r"purchases", PurchaseViewSet, basename="shop-purchases")

urlpatterns = [
    path("shops/<uuid:shop_pk>/", include(router.urls)),
]