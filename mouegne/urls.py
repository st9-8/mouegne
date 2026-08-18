from django.contrib import admin
from django.urls import path, include

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('staff/', include('accounts.urls')),
    path('accounts/', include('accounts.urls')),
    path("api/", include("tenants.urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("inventory.urls")),
    path('api/', include('sales.urls')),

    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
