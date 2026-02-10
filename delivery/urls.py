from django.urls import path
from .views import (
    DeliveryListAPI,
    DeliveryDetailAPI,
    DeliveryPreviewAPI,
    DeliveryCalendarAPI,
    PendingDeliveriesAPI,
    ReceiveDeliveryAPI,
    DeliveryDashboardAPI
)

urlpatterns = [
    # Main CRUD endpoints
    path('', DeliveryListAPI.as_view(), name='delivery-list'),
    path('<int:pk>/', DeliveryDetailAPI.as_view(), name='delivery-detail'),

    # Preview endpoint (for screenshot/sharing)
    path('<int:pk>/preview/', DeliveryPreviewAPI.as_view(), name='delivery-preview'),

    # Calendar endpoint (FullCalendar format)
    path('calendar/', DeliveryCalendarAPI.as_view(), name='delivery-calendar'),

    # Filters
    path('pending/', PendingDeliveriesAPI.as_view(), name='delivery-pending'),

    # Actions
    path('<int:pk>/receive/', ReceiveDeliveryAPI.as_view(), name='delivery-receive'),

    # Dashboard widget
    path('dashboard/', DeliveryDashboardAPI.as_view(), name='delivery-dashboard'),
]
