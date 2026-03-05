from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/inventory/', include('inventory.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/deliveries/', include('delivery.urls')),
    # Catch-all: serve React app for all other routes
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
