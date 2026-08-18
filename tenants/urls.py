from django.urls import path, include
from rest_framework.routers import DefaultRouter, SimpleRouter

from tenants.views import ShopViewSet, EmployeeViewSet

router = DefaultRouter()
router.register(r"shops", ShopViewSet, basename="shops")

shop_sub_router = SimpleRouter()
shop_sub_router.register(r"employees", EmployeeViewSet, basename="shop-employees")

urlpatterns = router.urls + [
    path("shops/<uuid:shop_pk>/", include(shop_sub_router.urls)),
]
