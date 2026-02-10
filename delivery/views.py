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
    DeliveryItemSerializer,
    DeliveryPreviewSerializer
)


# 1. List all deliveries
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
            product_name = item_data.get('product_name')
            quantity = item_data.get('quantity')
            unit = item_data.get('unit', 'PCS')
            if product_name and quantity:
                DeliveryItem.objects.create(
                    delivery=delivery,
                    product_name=product_name,
                    quantity=quantity,
                    unit=unit
                )
        
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


# 3. Preview delivery (clean format for screenshot)
class DeliveryPreviewAPI(APIView):
    """
    GET /api/deliveries/<id>/preview/
    Returns clean preview format for screenshot/sharing
    """

    def get(self, request, pk):
        try:
            delivery = Delivery.objects.get(pk=pk)
        except Delivery.DoesNotExist:
            return Response({"error": "Delivery not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = DeliveryPreviewSerializer(delivery)
        return Response(serializer.data)


# 4. Calendar events API (FullCalendar format)
class DeliveryCalendarAPI(APIView):
    """
    Returns deliveries formatted for FullCalendar
    GET /api/deliveries/calendar/
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
            if delivery.status in ['PENDING', 'SENT'] and delivery.delivery_date < today:
                delivery.status = 'PROBLEM'
                delivery.save()

        serializer = DeliveryCalendarSerializer(queryset, many=True)
        return Response(serializer.data)


# 5. Pending deliveries only
class PendingDeliveriesAPI(generics.ListAPIView):
    queryset = Delivery.objects.filter(status='PENDING').order_by('delivery_date')
    serializer_class = DeliverySerializer


# 6. Update received items
class ReceiveDeliveryAPI(APIView):
    """
    POST /api/deliveries/<id>/receive/
    {
        "remarks": "Hansel short by 2 boxes",
        "items": [
            {"id": 1, "received_quantity": 5},
            {"id": 2, "received_quantity": 8}
        ]
    }
    """

    def post(self, request, pk):
        try:
            delivery = Delivery.objects.get(pk=pk)
        except Delivery.DoesNotExist:
            return Response({"error": "Delivery not found"}, status=status.HTTP_404_NOT_FOUND)

        if delivery.status == 'RECEIVED':
            return Response({"error": "Delivery already received"}, status=status.HTTP_400_BAD_REQUEST)

        # Update remarks
        delivery.remarks = request.data.get('remarks', '')

        # Update items
        items_data = request.data.get('items', [])
        updated_items = []

        for item_data in items_data:
            item_id = item_data.get('id')
            received_qty = item_data.get('received_quantity', 0)

            try:
                item = DeliveryItem.objects.get(pk=item_id, delivery=delivery)
                item.received_quantity = received_qty
                item.save()
                updated_items.append(DeliveryItemSerializer(item).data)
            except DeliveryItem.DoesNotExist:
                return Response(
                    {"error": f"Item {item_id} not found in delivery"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Determine status
        has_problem = bool(delivery.remarks.strip())
        delivery.status = 'RECEIVED' if not has_problem else 'PROBLEM'
        delivery.save()

        return Response({
            "message": "Delivery updated",
            "status": delivery.status,
            "remarks": delivery.remarks,
            "items": updated_items
        })


# 7. Dashboard summary for deliveries
class DeliveryDashboardAPI(APIView):
    """Quick summary for dashboard widget"""

    def get(self, request):
        today = timezone.now().date()
        week_later = today + timezone.timedelta(days=7)

        pending = Delivery.objects.filter(status='PENDING').count()
        sent = Delivery.objects.filter(status='SENT').count()
        received = Delivery.objects.filter(status='RECEIVED').count()
        problem = Delivery.objects.filter(status='PROBLEM').count()
        upcoming = Delivery.objects.filter(
            status__in=['PENDING', 'SENT'],
            delivery_date__range=[today, week_later]
        ).count()

        return Response({
            "pending": pending,
            "sent": sent,
            "received": received,
            "problem": problem,
            "upcoming_this_week": upcoming
        })
