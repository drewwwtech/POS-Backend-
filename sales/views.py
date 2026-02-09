from django.db.models import Sum
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.pdfgen import canvas

from .models import Sale, SaleItem
from .serializers import SaleSerializer

# 1. Main Transaction API
# Handles listing history, creating new sales, and filtering by date/ID
class SaleListAPI(generics.ListCreateAPIView): 
    queryset = Sale.objects.all().order_by('-timestamp')
    serializer_class = SaleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter] 
    filterset_fields = ['timestamp'] 
    search_fields = ['transaction_id']

# 2. Modern Dashboard API
# Provides business intelligence and stock alerts
class DashboardSummaryAPI(APIView):
    def get(self, request):
        total_revenue = Sale.objects.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_transactions = Sale.objects.count()
        
        top_product = SaleItem.objects.values('product__name').annotate(
            total_qty=Sum('quantity')
        ).order_by('-total_qty').first()

        # Alert if stock is below 10 units
        low_stock_items = SaleItem.objects.filter(
            product__stock_quantity__lt=10
        ).values(
            'product__name', 
            'product__stock_quantity'
        ).distinct()

        return Response({
            "business_health": {
                "total_revenue": float(total_revenue),
                "total_transactions": total_transactions,
                "currency": "PHP",
            },
            "analytics": {
                "top_selling_product": top_product['product__name'] if top_product else "None",
            },
            "inventory_alerts": {
                "low_stock_count": len(low_stock_items),
                "items_to_restock": list(low_stock_items)
            }
        })

# 3. Daily Closing Report API (New "Z-Report" Logic)
# Summarizes sales specifically for the current day
class DailyClosingReportAPI(APIView):
    def get(self, request):
        today = timezone.now().date()
        sales_today = Sale.objects.filter(timestamp__date=today)
        
        total_revenue = sales_today.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        transaction_count = sales_today.count()

        return Response({
            "report_date": today,
            "summary": {
                "total_revenue": float(total_revenue),
                "transaction_count": transaction_count,
                "currency": "PHP"
            },
            "status": "Closed" if transaction_count > 0 else "No Sales Today"
        })

# 4. Receipt Generator
def generate_receipt(request, transaction_id):
    sale = Sale.objects.get(transaction_id=transaction_id)
    
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="receipt_{transaction_id}.pdf"'
    
    p = canvas.Canvas(response)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 800, "JMC STORE Receipt")
    
    p.setFont("Helvetica", 12)
    p.drawString(100, 780, f"Transaction: {sale.transaction_id}")
    p.drawString(100, 760, f"Date: {sale.timestamp.strftime('%Y-%m-%d %H:%M')}")
    p.line(100, 750, 500, 750)
    
    y = 730
    for item in sale.items.all():
        p.drawString(100, y, f"{item.product.name} x {item.quantity} @ {item.unit_price}")
        y -= 20
        
    p.line(100, y, 500, y)
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y-20, f"TOTAL AMOUNT: PHP {sale.total_amount}")
    
    p.showPage()
    p.save()
    return response