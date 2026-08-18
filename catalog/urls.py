from django.urls import path, include

from rest_framework.routers import SimpleRouter

from catalog.views import CategoryViewSet, ItemViewSet

router = SimpleRouter()
router.register(r"categories", CategoryViewSet, basename="shop-categories")
router.register(r"items", ItemViewSet, basename="shop-items")

urlpatterns = [
    path("shops/<uuid:shop_pk>/", include(router.urls)),
]
