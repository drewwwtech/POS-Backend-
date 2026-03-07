from django.utils import timezone
from django.db.models import F
from rest_framework.views import APIView
from rest_framework.response import Response
from inventory.models import Product
from delivery.models import Delivery
from datetime import timedelta


class NotificationsAPI(APIView):
    """
    GET /api/inventory/notifications/
    Returns all active notifications computed on-the-fly.
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
            notifications.append({
                'id': f'out_of_stock_{product.id}',
                'type': 'out_of_stock',
                'severity': 'danger',
                'icon': 'fas fa-times-circle',
                'message': f'{product.name} is out of stock!',
                'timestamp': now.isoformat(),
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
            notifications.append({
                'id': f'low_stock_{product.id}',
                'type': 'low_stock',
                'severity': 'warning',
                'icon': 'fas fa-exclamation-triangle',
                'message': f'{product.name} is low on stock ({product.stock_quantity} remaining)',
                'timestamp': now.isoformat(),
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
                'timestamp': now.isoformat(),
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
                'timestamp': now.isoformat(),
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
            notifications.append({
                'id': f'delivery_overdue_{delivery.id}',
                'type': 'delivery_overdue',
                'severity': 'danger',
                'icon': 'fas fa-exclamation-circle',
                'message': f'Delivery from {delivery.supplier_name} is overdue by {days_overdue} day{"s" if days_overdue != 1 else ""}',
                'timestamp': now.isoformat(),
                'related_id': delivery.id,
                'link': '/deliveries',
            })

        # Sort: danger first, then warning, then info
        severity_order = {'danger': 0, 'warning': 1, 'info': 2}
        notifications.sort(key=lambda n: severity_order.get(n['severity'], 3))

        return Response({
            'count': len(notifications),
            'notifications': notifications,
        })
