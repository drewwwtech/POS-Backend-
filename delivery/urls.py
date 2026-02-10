from django.urls import path
from .views import (
    DeliveryListAPI,
    DeliveryDetailAPI,
    DeliveryCalendarAPI,
    PendingDeliveriesAPI,
    OverdueDeliveriesAPI,
    ReceiveDeliveryItemsAPI,
    DeliveryDashboardAPI
)

urlpatterns = [
    # Main CRUD endpoints
    path('', DeliveryListAPI.as_view(), name='delivery-list'),
    path('<int:pk>/', DeliveryDetailAPI.as_view(), name='delivery-detail'),

    # Calendar endpoint (FullCalendar format)
    path('calendar/', DeliveryCalendarAPI.as_view(), name='delivery-calendar'),

    # Filters
    path('pending/', PendingDeliveriesAPI.as_view(), name='delivery-pending'),
    path('overdue/', OverdueDeliveriesAPI.as_view(), name='delivery-overdue'),

    # Actions
    path('<int:pk>/receive/', ReceiveDeliveryItemsAPI.as_view(), name='delivery-receive'),

    # Dashboard widget
    path('dashboard/', DeliveryDashboardAPI.as_view(), name='delivery-dashboard'),
]
