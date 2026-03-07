from django.utils import timezone
from django.db.models import F
from rest_framework.views import APIView
from rest_framework.response import Response
from inventory.models import Product, StockLog
from delivery.models import Delivery
from datetime import timedelta, datetime


class NotificationsAPI(APIView):
    """
    GET /api/inventory/notifications/
    Returns all active notifications computed on-the-fly.
    Timestamps reflect when the triggering event actually occurred.
    Each stock change produces a unique notification ID (tied to StockLog).
    Sorted by timestamp (newest first).
    """

    def get(self, request):
        notifications = []
        now = timezone.localtime()
        today = now.date()
        tomorrow = today + timedelta(days=1)

        # 1. Out of stock (severity: danger)
        out_of_stock = Product.objects.filter(
            stock_quantity=0,
            is_active=True
        )
        for product in out_of_stock:
            last_log = StockLog.objects.filter(
                product=product
            ).order_by('-timestamp').first()
            event_time = last_log.timestamp if last_log else product.created_at
            log_id = last_log.id if last_log else 0

            notifications.append({
                'id': f'out_of_stock_{product.id}_log{log_id}',
                'type': 'out_of_stock',
                'severity': 'danger',
                'icon': 'fas fa-times-circle',
                'message': f'{product.name} is out of stock!',
                'timestamp': timezone.localtime(event_time).isoformat(),
                'related_id': product.id,
                'link': '/products',
            })

        # 2. Low stock — stock is above 0 but at or below reorder_level
        low_stock = Product.objects.filter(
            stock_quantity__gt=0,
            stock_quantity__lte=F('reorder_level'),
            is_active=True
        )
        for product in low_stock:
            last_log = StockLog.objects.filter(
                product=product
            ).order_by('-timestamp').first()
            event_time = last_log.timestamp if last_log else product.created_at
            log_id = last_log.id if last_log else 0

            notifications.append({
                'id': f'low_stock_{product.id}_log{log_id}',
                'type': 'low_stock',
                'severity': 'warning',
                'icon': 'fas fa-exclamation-triangle',
                'message': f'{product.name} is low on stock ({product.stock_quantity} remaining)',
                'timestamp': timezone.localtime(event_time).isoformat(),
                'related_id': product.id,
                'link': '/products',
            })

        # 3. Delivery arriving tomorrow
        tomorrow_deliveries = Delivery.objects.filter(
            delivery_date=tomorrow,
            status__in=['PENDING', 'SENT']
        )
        for delivery in tomorrow_deliveries:
            notifications.append({
                'id': f'delivery_tomorrow_{delivery.id}',
                'type': 'delivery_tomorrow',
                'severity': 'info',
                'icon': 'fas fa-truck',
                'message': f'Incoming delivery tomorrow from {delivery.supplier_name}',
                'timestamp': timezone.localtime(delivery.created_at).isoformat(),
                'related_id': delivery.id,
                'link': '/deliveries',
            })

        # 4. Delivery today
        today_deliveries = Delivery.objects.filter(
            delivery_date=today,
            status__in=['PENDING', 'SENT']
        )
        for delivery in today_deliveries:
            notifications.append({
                'id': f'delivery_today_{delivery.id}',
                'type': 'delivery_today',
                'severity': 'info',
                'icon': 'fas fa-box',
                'message': f'You have a delivery today from {delivery.supplier_name}',
                'timestamp': timezone.localtime(delivery.created_at).isoformat(),
                'related_id': delivery.id,
                'link': '/deliveries',
            })

        # 5. Overdue deliveries
        overdue_deliveries = Delivery.objects.filter(
            delivery_date__lt=today,
            status__in=['PENDING', 'SENT']
        )
        for delivery in overdue_deliveries:
            days_overdue = (today - delivery.delivery_date).days
            overdue_time = timezone.make_aware(
                datetime.combine(delivery.delivery_date, datetime.min.time())
            )
            notifications.append({
                'id': f'delivery_overdue_{delivery.id}',
                'type': 'delivery_overdue',
                'severity': 'danger',
                'icon': 'fas fa-exclamation-circle',
                'message': f'Delivery from {delivery.supplier_name} is overdue by {days_overdue} day{"s" if days_overdue != 1 else ""}',
                'timestamp': timezone.localtime(overdue_time).isoformat(),
                'related_id': delivery.id,
                'link': '/deliveries',
            })

        # Sort by timestamp — newest first
        notifications.sort(key=lambda n: n['timestamp'], reverse=True)

        return Response({
            'count': len(notifications),
            'notifications': notifications,
        })
