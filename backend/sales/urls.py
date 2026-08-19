from django.urls import path, include

from rest_framework.routers import SimpleRouter

from sales.views import CustomerViewSet, SaleViewSet

router = SimpleRouter()
router.register(r"customers", CustomerViewSet, basename="shop-customers")
router.register(r"sales", SaleViewSet, basename="shop-sales")

urlpatterns = [
    path("shops/<uuid:shop_pk>/", include(router.urls)),
]
