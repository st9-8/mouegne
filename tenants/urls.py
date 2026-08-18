from django.urls import path, include
from rest_framework.routers import DefaultRouter, SimpleRouter

from tenants.views import ShopViewSet, EmployeeViewSet, RegisterMerchantView

router = DefaultRouter()
router.register(r"shops", ShopViewSet, basename="shops")

shop_sub_router = SimpleRouter()
shop_sub_router.register(r"employees", EmployeeViewSet, basename="shop-employees")

urlpatterns = router.urls + [
    path("register-merchant/", RegisterMerchantView.as_view(), name="register-merchant"),
    path("shops/<uuid:shop_pk>/", include(shop_sub_router.urls)),
]
