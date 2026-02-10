from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Delivery, DeliveryItem
from .serializers import (
    DeliverySerializer,
    DeliveryCalendarSerializer,
    SimpleDeliverySerializer,
    DeliveryUpdateSerializer,
    DeliveryItemSerializer
)
from inventory.models import Product


# 1. List all deliveries (with filtering)
class DeliveryListAPI(generics.ListCreateAPIView):
    queryset = Delivery.objects.all().order_by('-delivery_date')
    serializer_class = DeliverySerializer

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SimpleDeliverySerializer
        return DeliverySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        delivery = serializer.save()
        
        # Handle items if provided
        items_data = request.data.get('items', [])
        for item_data in items_data:
            product_id = item_data.get('product_id') or item_data.get('product')
            expected_qty = item_data.get('expected_quantity')
            if product_id and expected_qty:
                try:
                    product = Product.objects.get(pk=product_id)
                    DeliveryItem.objects.create(
                        delivery=delivery,
                        product=product,
                        expected_quantity=expected_qty
                    )
                except Product.DoesNotExist:
                    pass
        
        return Response(
            DeliverySerializer(delivery).data,
            status=status.HTTP_201_CREATED
        )


# 2. Single delivery detail
class DeliveryDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return DeliveryUpdateSerializer
        return DeliverySerializer


# 3. Calendar events API (FullCalendar format)
class DeliveryCalendarAPI(APIView):
    """
    Returns deliveries formatted for FullCalendar
    GET /api/deliveries/calendar/
    
    Query params:
    - month: Filter by month (YYYY-MM)
    - status: Filter by status (PENDING, COMPLETED, etc.)
    """

    def get(self, request):
        queryset = Delivery.objects.all()

        # Filter by month
        month = request.query_params.get('month')
        if month:
            queryset = queryset.filter(delivery_date__startswith=month)

        # Filter by status
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Auto-update overdue status
        today = timezone.now().date()
        for delivery in queryset:
            if delivery.status == 'PENDING' and delivery.delivery_date < today:
                delivery.status = 'OVERDUE'
                delivery.save()

        serializer = DeliveryCalendarSerializer(queryset, many=True)
        return Response(serializer.data)


# 4. Pending deliveries only
class PendingDeliveriesAPI(generics.ListAPIView):
    queryset = Delivery.objects.filter(status='PENDING').order_by('delivery_date')
    serializer_class = DeliverySerializer


# 5. Overdue deliveries
class OverdueDeliveriesAPI(generics.ListAPIView):
    queryset = Delivery.objects.filter(status='OVERDUE').order_by('delivery_date')
    serializer_class = DeliverySerializer


# 6. Update delivery items (receive products)
class ReceiveDeliveryItemsAPI(APIView):
    """
    POST /api/deliveries/<id>/receive/
    {
        "items": [
            {"product": 1, "received_quantity": 50},
            {"product": 2, "received_quantity": 30}
        ]
    }
    """

    def post(self, request, pk):
        try:
            delivery = Delivery.objects.get(pk=pk)
        except Delivery.DoesNotExist:
            return Response({"error": "Delivery not found"}, status=status.HTTP_404_NOT_FOUND)

        if delivery.status == 'COMPLETED':
            return Response({"error": "Delivery already completed"}, status=status.HTTP_400_BAD_REQUEST)

        items_data = request.data.get('items', [])
        updated_items = []

        for item_data in items_data:
            product_id = item_data.get('product')
            received_qty = item_data.get('received_quantity', 0)

            try:
                item = DeliveryItem.objects.get(delivery=delivery, product_id=product_id)
                item.received_quantity = received_qty
                item.save()
                updated_items.append(DeliveryItemSerializer(item).data)
            except DeliveryItem.DoesNotExist:
                return Response(
                    {"error": f"Product {product_id} not found in delivery"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Check if all items received
        all_received = all(
            item.received_quantity >= item.expected_quantity
            for item in delivery.items.all()
        )

        if all_received:
            delivery.status = 'COMPLETED'
            delivery.save()

        return Response({
            "message": "Items updated",
            "delivery_status": delivery.status,
            "items": updated_items
        })


# 7. Dashboard summary for deliveries
class DeliveryDashboardAPI(APIView):
    """Quick summary for dashboard widget"""

    def get(self, request):
        today = timezone.now().date()
        week_later = today + timezone.timedelta(days=7)

        pending = Delivery.objects.filter(status='PENDING').count()
        overdue = Delivery.objects.filter(status='OVERDUE').count()
        completed_today = Delivery.objects.filter(
            status='COMPLETED',
            delivery_date=today
        ).count()
        upcoming = Delivery.objects.filter(
            status='PENDING',
            delivery_date__range=[today, week_later]
        ).count()

        return Response({
            "pending": pending,
            "overdue": overdue,
            "completed_today": completed_today,
            "upcoming_this_week": upcoming
        })
