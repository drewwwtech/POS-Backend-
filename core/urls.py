from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/inventory/', include('inventory.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/deliveries/', include('delivery.urls')),
    # Catch-all: serve React app for all other routes
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]
