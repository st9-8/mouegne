from django.urls import path, include
from rest_framework.routers import SimpleRouter

from inventory.views import VendorViewSet, PurchaseViewSet, PurchaseBatchViewSet

router = SimpleRouter()
router.register(r"vendors", VendorViewSet, basename="shop-vendors")
router.register(r"purchases", PurchaseViewSet, basename="shop-purchases")
router.register(r"purchase-batches", PurchaseBatchViewSet, basename="shop-purchase-batches")

urlpatterns = [
    path("shops/<uuid:shop_pk>/", include(router.urls)),
]