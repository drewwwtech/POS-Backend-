from django.db.models import Sum
from django.utils import timezone
from django.http import HttpResponse
from django.core.exceptions import ValidationError
from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

# PDF Generation
from reportlab.pdfgen import canvas

# Models and Serializers
from .models import Sale, SaleItem
from inventory.models import Product
from .serializers import SaleSerializer, SaleReceiptSerializer

# 1. Main Transaction API (For History and Searching)
class SaleListAPI(generics.ListCreateAPIView): 
    queryset = Sale.objects.all().order_by('-timestamp')
    serializer_class = SaleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter] 
    filterset_fields = ['timestamp'] 
    search_fields = ['transaction_id']

# 2. Modern Dashboard API (For General Stats)
class DashboardSummaryAPI(APIView):
    def get(self, request):
        total_revenue = Sale.objects.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_transactions = Sale.objects.count()
        
        top_product = SaleItem.objects.values('product__name').annotate(
            total_qty=Sum('quantity')
        ).order_by('-total_qty').first()

        # Check real Inventory levels for items under the threshold (10)
        low_stock_items = Product.objects.filter(
            stock_quantity__lt=10,
            is_active=True  # Only alert for products we are still actively selling
        ).values('name', 'stock_quantity')

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
                "low_stock_count": low_stock_items.count(),
                "items_to_restock": list(low_stock_items)
            }
        })

# 3. Daily Closing Report API (Synced to Asia/Manila)
class DailyClosingReportAPI(APIView):
    def get(self, request):
        # Uses your fixed TIME_ZONE setting automatically
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

# 4. Receipt Logic (JSON and PDF)

class ReceiptDetailView(APIView):
    """Returns JSON data for frontend receipt display"""
    def get(self, request, transaction_id):
        try:
            sale = Sale.objects.get(transaction_id=transaction_id)
            serializer = SaleReceiptSerializer(sale)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Sale.DoesNotExist:
            return Response({"error": "Receipt not found"}, status=status.HTTP_404_NOT_FOUND)

def generate_receipt(request, transaction_id):
    """Generates a downloadable PDF Receipt"""
    try:
        sale = Sale.objects.get(transaction_id=transaction_id)
    except Sale.DoesNotExist:
        return HttpResponse("Sale not found", status=404)
    
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="receipt_{transaction_id}.pdf"'
    
    p = canvas.Canvas(response)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 800, "JMC STORE Receipt")
    
    p.setFont("Helvetica", 12)
    p.drawString(100, 780, f"Transaction: {sale.transaction_id}")
    # Localized timestamp formatting
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
    return response # FIXED: Now returns the PDF file

def generate_daily_report_pdf(request):
    """Generates a PDF of all sales made today"""
    today = timezone.now().date()
    sales_today = Sale.objects.filter(timestamp__date=today).order_by('timestamp')
    
    if not sales_today.exists():
        return HttpResponse("No sales recorded for today.", status=404)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Daily_Sales_{today}.pdf"'
    
    p = canvas.Canvas(response)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 800, f"JMC STORE - DAILY SALES REPORT")
    
    p.setFont("Helvetica", 12)
    p.drawString(100, 780, f"Date: {today}")
    p.line(100, 770, 500, 770)
    
    y = 750
    p.setFont("Helvetica-Bold", 10)
    p.drawString(100, y, "Time")
    p.drawString(180, y, "Transaction ID")
    p.drawString(350, y, "Amount")
    y -= 20
    p.setFont("Helvetica", 10)

    total_revenue = 0
    for sale in sales_today:
        # If we run out of page space, start a new one (basic check)
        if y < 50:
            p.showPage()
            y = 800
            
        p.drawString(100, y, sale.timestamp.strftime('%H:%M'))
        p.drawString(180, y, sale.transaction_id)
        p.drawString(350, y, f"PHP {sale.total_amount}")
        total_revenue += sale.total_amount
        y -= 15
        
    p.line(100, y, 500, y)
    y -= 20
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, f"TOTAL DAILY REVENUE: PHP {total_revenue}")
    p.drawString(100, y-15, f"TOTAL TRANSACTIONS: {sales_today.count()}")
    
    p.showPage()
    p.save()
    return response