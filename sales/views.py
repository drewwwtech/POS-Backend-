from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.http import HttpResponse
from django.core.exceptions import ValidationError
from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

# PDF Generation
from reportlab.pdfgen import canvas

# Standard Library
from datetime import date, timedelta
import datetime

# Models and Serializers
from .models import Sale, SaleItem
from inventory.models import Product
from delivery.models import Delivery
from .serializers import SaleSerializer, SaleReceiptSerializer

# 1. Main Transaction API (For History and Searching)
class SaleListAPI(generics.ListCreateAPIView): 
    queryset = Sale.objects.all().order_by('-timestamp')
    serializer_class = SaleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter] 
    filterset_fields = ['timestamp'] 
    search_fields = ['transaction_id']

# 2. Modern Dashboard API (For General Stats - Today's Data Only)
class DashboardSummaryAPI(APIView):
    def get(self, request):
        # Get today's date
        today = timezone.localdate()
        
        # Get first day of current month
        month_start = today.replace(day=1)
        
        # Get first day of current year
        year_start = today.replace(month=1, day=1)
        
        # Filter sales for today only
        today_sales = Sale.objects.filter(timestamp__date=today)
        
        # Filter sales for current month
        month_sales = Sale.objects.filter(timestamp__date__gte=month_start)
        
        # Filter sales for current year
        year_sales = Sale.objects.filter(timestamp__date__gte=year_start)
        
        total_revenue = today_sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_transactions = today_sales.count()
        
        # Monthly sales
        month_revenue = month_sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        month_transactions = month_sales.count()
        
        # Yearly sales
        year_revenue = year_sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        year_transactions = year_sales.count()
        
        # Get top product for today
        today_items = SaleItem.objects.filter(sale__timestamp__date=today)
        top_product = today_items.values('product__name').annotate(
            total_qty=Sum('quantity')
        ).order_by('-total_qty').first()

        # Check real Inventory levels for items under the threshold (10)
        low_stock_items = Product.objects.filter(
            stock_quantity__lt=10,
            is_active=True
        ).values('name', 'stock_quantity')
        
        # Get pending deliveries count
        pending_deliveries = Delivery.objects.filter(status='PENDING').count()

        return Response({
            "business_health": {
                "total_revenue": float(total_revenue),
                "total_transactions": total_transactions,
                "currency": "PHP",
            },
            "month_sales": {
                "total_revenue": float(month_revenue),
                "total_transactions": month_transactions,
            },
            "year_sales": {
                "total_revenue": float(year_revenue),
                "total_transactions": year_transactions,
            },
            "analytics": {
                "top_selling_product": top_product['product__name'] if top_product else "None",
            },
            "inventory_alerts": {
                "low_stock_count": low_stock_items.count(),
                "items_to_restock": list(low_stock_items)
            },
            "pending_deliveries": {
                "count": pending_deliveries
            }
        })

# 3. Daily Closing Report API (Synced to Asia/Manila)
class DailyClosingReportAPI(APIView):
    def get(self, request):
        # Uses your fixed TIME_ZONE setting automatically
        today = timezone.localdate()
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

# 4. Sales Chart API - Returns daily sales for the past 30 days
class SalesChartAPI(APIView):
    def get(self, request):
        today = timezone.localdate()
        # Get sales for the last 30 days
        start_date = today - timedelta(days=29)
        
        # Get daily sales data
        daily_sales = Sale.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lte=today
        ).annotate(
            date=TruncDate('timestamp')
        ).values('date').annotate(
            revenue=Sum('total_amount'),
            transactions=Count('id')
        ).order_by('date')
        
        # Create a dictionary for easy lookup
        sales_dict = {str(item['date']): item for item in daily_sales}
        
        # Generate all dates in range
        dates = []
        revenues = []
        transactions = []
        
        current = start_date
        while current <= today:
            date_str = str(current)
            if date_str in sales_dict:
                dates.append(date_str)
                revenues.append(float(sales_dict[date_str]['revenue']))
                transactions.append(sales_dict[date_str]['transactions'])
            else:
                dates.append(date_str)
                revenues.append(0)
                transactions.append(0)
            current += timedelta(days=1)
        
        return Response({
            "labels": dates,
            "revenues": revenues,
            "transactions": transactions
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
    local_time = timezone.localtime(sale.timestamp)
    p.drawString(100, 760, f"Date: {local_time.strftime('%Y-%m-%d %I:%M %p')}")
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

# ============================================
# SALES REPORT APIs
# ============================================

class DailySalesReportAPI(APIView):
    """Get sales report for a specific day"""
    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            target_date = timezone.localdate()
        else:
            try:
                target_date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
        
        sales = Sale.objects.filter(timestamp__date=target_date).order_by('timestamp')
        total_sales = sum(s.total_amount for s in sales)
        transaction_count = sales.count()
        
        items_sold = SaleItem.objects.filter(
            sale__timestamp__date=target_date
        ).select_related('product')
        
        # Calculate Gross Sales and Net Income
        gross_sales = float(total_sales)  # Convert to float for consistent calculation
        total_cost = 0
        
        product_sales = {}
        for item in items_sold:
            key = item.product.name if item.product else 'Unknown'
            if key not in product_sales:
                product_sales[key] = {'quantity': 0, 'total': 0}
            product_sales[key]['quantity'] += item.quantity
            product_sales[key]['total'] += float(item.unit_price) * item.quantity
            
            # Calculate cost of goods sold
            base_price = float(item.product.base_price) if item.product and item.product.base_price else 0
            total_cost += base_price * item.quantity
        
        net_income = gross_sales - total_cost
        
        top_products = sorted(
            [{'product_name': k, 'quantity': v['quantity'], 'total': v['total']} 
             for k, v in product_sales.items()],
            key=lambda x: x['quantity'],
            reverse=True
        )[:5]
        
        hourly_data = {}
        for sale in sales:
            hour = sale.timestamp.hour
            if hour not in hourly_data:
                hourly_data[hour] = 0
            hourly_data[hour] += float(sale.total_amount)
        
        hourly_breakdown = [
            {'hour': h, 'total': hourly_data[h]} 
            for h in sorted(hourly_data.keys())
        ]
        
        items_detail = [
            {
                'product_name': item.product.name if item.product else 'Unknown',
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'total': float(item.unit_price) * item.quantity
            }
            for item in items_sold
        ]
        
        return Response({
            'date': str(target_date),
            'gross_sales': gross_sales,
            'net_income': net_income,
            'total_cost': total_cost,
            'total_sales': total_sales,
            'transaction_count': transaction_count,
            'average_per_transaction': total_sales / transaction_count if transaction_count > 0 else 0,
            'top_products': top_products,
            'hourly_breakdown': hourly_breakdown,
            'items_sold': items_detail
        })


class MonthlySalesReportAPI(APIView):
    """Get sales report for a specific month"""
    def get(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        if not year or not month:
            now = timezone.localtime()
            year = now.year
            month = now.month
        else:
            try:
                year = int(year)
                month = int(month)
            except ValueError:
                return Response({'error': 'Invalid year or month'}, status=400)
        
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        sales = Sale.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lt=end_date
        ).order_by('timestamp')
        
        total_sales = sum(s.total_amount for s in sales)
        transaction_count = sales.count()
        
        # Calculate Gross Sales and Net Income
        gross_sales = float(total_sales)  # Convert to float for consistent calculation
        
        items_sold = SaleItem.objects.filter(
            sale__timestamp__date__gte=start_date,
            sale__timestamp__date__lt=end_date
        ).select_related('product')
        
        total_cost = 0
        for item in items_sold:
            base_price = float(item.product.base_price) if item.product and item.product.base_price else 0
            total_cost += base_price * item.quantity
        
        net_income = gross_sales - total_cost
        
        daily_data = {}
        for sale in sales:
            day = sale.timestamp.date()
            if day not in daily_data:
                daily_data[day] = {'total': 0, 'count': 0}
            daily_data[day]['total'] += float(sale.total_amount)
            daily_data[day]['count'] += 1
        
        daily_breakdown = [
            {'date': str(d), 'total': v['total'], 'count': v['count']}
            for d, v in sorted(daily_data.items())
        ]
        
        best_day = max(daily_data.items(), key=lambda x: x[1]['total']) if daily_data else None
        
        return Response({
            'year': year,
            'month': month,
            'gross_sales': gross_sales,
            'net_income': net_income,
            'total_cost': total_cost,
            'total_sales': total_sales,
            'transaction_count': transaction_count,
            'daily_average': total_sales / transaction_count if transaction_count > 0 else 0,
            'best_day': {'date': str(best_day[0]), 'total': best_day[1]['total']} if best_day else None,
            'daily_breakdown': daily_breakdown
        })


class YearlySalesReportAPI(APIView):
    """Get sales report for a specific year"""
    def get(self, request):
        year = request.query_params.get('year')
        
        if not year:
            year = timezone.localtime().year
        else:
            try:
                year = int(year)
            except ValueError:
                return Response({'error': 'Invalid year'}, status=400)
        
        start_date = date(year, 1, 1)
        end_date = date(year + 1, 1, 1)
        
        sales = Sale.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lt=end_date
        ).order_by('timestamp')
        
        total_sales = sum(s.total_amount for s in sales)
        transaction_count = sales.count()
        
        # Calculate Gross Sales and Net Income
        gross_sales = float(total_sales)  # Convert to float for consistent calculation
        
        items_sold = SaleItem.objects.filter(
            sale__timestamp__date__gte=start_date,
            sale__timestamp__date__lt=end_date
        ).select_related('product')
        
        total_cost = 0
        for item in items_sold:
            base_price = float(item.product.base_price) if item.product and item.product.base_price else 0
            total_cost += base_price * item.quantity
        
        net_income = gross_sales - total_cost
        
        monthly_data = {}
        for sale in sales:
            month = sale.timestamp.month
            if month not in monthly_data:
                monthly_data[month] = {'total': 0, 'count': 0}
            monthly_data[month]['total'] += float(sale.total_amount)
            monthly_data[month]['count'] += 1
        
        monthly_breakdown = [
            {'month': m, 'total': v['total'], 'count': v['count']}
            for m, v in sorted(monthly_data.items())
        ]
        
        best_month = max(monthly_data.items(), key=lambda x: x[1]['total']) if monthly_data else None
        
        return Response({
            'year': year,
            'gross_sales': gross_sales,
            'net_income': net_income,
            'total_cost': total_cost,
            'total_sales': total_sales,
            'transaction_count': transaction_count,
            'monthly_average': total_sales / 12,
            'best_month': {'month': best_month[0], 'total': best_month[1]['total']} if best_month else None,
            'monthly_breakdown': monthly_breakdown
        })


class SalesRangeReportAPI(APIView):
    """Get sales report for a custom date range"""
    def get(self, request):
        start_date_str = request.query_params.get('start')
        end_date_str = request.query_params.get('end')
        
        if not start_date_str or not end_date_str:
            return Response({'error': 'Start and end dates are required'}, status=400)
        
        try:
            start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
        
        end_date = end_date + timedelta(days=1)
        
        sales = Sale.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lt=end_date
        ).order_by('timestamp')
        
        total_sales = sum(s.total_amount for s in sales)
        transaction_count = sales.count()
        
        # Calculate Gross Sales and Net Income
        gross_sales = float(total_sales)  # Convert to float for consistent calculation
        
        items_sold = SaleItem.objects.filter(
            sale__timestamp__date__gte=start_date,
            sale__timestamp__date__lt=end_date
        ).select_related('product')
        
        total_cost = 0
        product_sales = {}
        for item in items_sold:
            key = item.product.name if item.product else 'Unknown'
            if key not in product_sales:
                product_sales[key] = {'quantity': 0, 'total': 0}
            product_sales[key]['quantity'] += item.quantity
            product_sales[key]['total'] += float(item.unit_price) * item.quantity
            
            # Calculate cost of goods sold
            base_price = float(item.product.base_price) if item.product and item.product.base_price else 0
            total_cost += base_price * item.quantity
        
        net_income = gross_sales - total_cost
        
        products_detail = sorted(
            [{'product_name': k, 'quantity': v['quantity'], 'total': v['total']} 
             for k, v in product_sales.items()],
            key=lambda x: x['total'],
            reverse=True
        )
        
        return Response({
            'start_date': start_date_str,
            'end_date': end_date_str,
            'gross_sales': gross_sales,
            'net_income': net_income,
            'total_cost': total_cost,
            'total_sales': total_sales,
            'transaction_count': transaction_count,
            'average_per_transaction': total_sales / transaction_count if transaction_count > 0 else 0,
            'products': products_detail
        })


# ============================================
# PDF REPORT GENERATION APIs
# ============================================

def generate_daily_report_pdf(request):
    """Generate PDF for daily sales report"""
    date_str = request.GET.get('date')
    if not date_str:
        target_date = timezone.localdate()
    else:
        try:
            target_date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return HttpResponse("Invalid date format. Use YYYY-MM-DD", status=400)
    
    sales = Sale.objects.filter(timestamp__date=target_date).order_by('timestamp')
    
    if not sales.exists():
        return HttpResponse("There's no sales today", status=404, content_type='text/plain')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Daily_Sales_{target_date}.pdf"'
    
    p = canvas.Canvas(response)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 800, f"JMC STORE - DAILY SALES REPORT")
    
    p.setFont("Helvetica", 12)
    p.drawString(100, 780, f"Date: {target_date}")
    p.line(100, 770, 500, 770)
    
    # Calculate totals
    total_revenue = sum(s.total_amount for s in sales)
    transaction_count = sales.count()
    
    # Calculate Gross Sales and Net Income
    gross_sales = float(total_revenue)
    total_cost = 0
    
    items_sold = SaleItem.objects.filter(
        sale__timestamp__date=target_date
    ).select_related('product')
    
    product_sales = {}
    for item in items_sold:
        key = item.product.name if item.product else 'Unknown'
        if key not in product_sales:
            product_sales[key] = {'quantity': 0, 'total': 0}
        product_sales[key]['quantity'] += item.quantity
        product_sales[key]['total'] += float(item.unit_price) * item.quantity
        
        # Calculate cost of goods sold
        base_price = float(item.product.base_price) if item.product and item.product.base_price else 0
        total_cost += base_price * item.quantity
    
    net_income = gross_sales - total_cost
    
    y = 750
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "SUMMARY")
    y -= 20
    p.setFont("Helvetica", 10)
    p.drawString(100, y, f"Gross Sales: PHP {gross_sales:,.2f}")
    y -= 15
    p.drawString(100, y, f"Total Cost: PHP {total_cost:,.2f}")
    y -= 15
    p.drawString(100, y, f"Net Income: PHP {net_income:,.2f}")
    y -= 15
    p.drawString(100, y, f"Transaction Count: {transaction_count}")
    y -= 20
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "TOP PRODUCTS")
    y -= 20
    p.setFont("Helvetica", 10)
    
    top_products = sorted(
        [{'product_name': k, 'quantity': v['quantity'], 'total': v['total']} 
         for k, v in product_sales.items()],
        key=lambda x: x['quantity'],
        reverse=True
    )[:5]
    
    for product in top_products:
        p.drawString(100, y, f"{product['product_name']}: {product['quantity']} units - PHP {product['total']:,.2f}")
        y -= 15
    
    y -= 10
    p.line(100, y, 500, y)
    y -= 20
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "TRANSACTIONS")
    y -= 20
    p.setFont("Helvetica", 10)

    for sale in sales:
        if y < 50:
            p.showPage()
            y = 800
            
        local_time = timezone.localtime(sale.timestamp)
        p.drawString(100, y, f"{local_time.strftime('%I:%M %p')} - {sale.transaction_id} - PHP {sale.total_amount:,.2f}")
        y -= 15
        
    p.showPage()
    p.save()
    return response


def generate_monthly_report_pdf(request):
    """Generate PDF for monthly sales report"""
    year = request.GET.get('year')
    month = request.GET.get('month')
    
    if not year or not month:
        now = timezone.localtime()
        year = now.year
        month = now.month
    else:
        try:
            year = int(year)
            month = int(month)
        except ValueError:
            return HttpResponse("Invalid year or month", status=400)
    
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    sales = Sale.objects.filter(
        timestamp__date__gte=start_date,
        timestamp__date__lt=end_date
    ).order_by('timestamp')
    
    if not sales.exists():
        return HttpResponse("There's no sales this month", status=404, content_type='text/plain')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Monthly_Sales_{year}_{month}.pdf"'
    
    p = canvas.Canvas(response)
    p.setFont("Helvetica-Bold", 16)
    month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December']
    p.drawString(100, 800, f"JMC STORE - MONTHLY SALES REPORT")
    p.drawString(100, 780, f"Month: {month_names[month-1]} {year}")
    p.line(100, 770, 500, 770)
    
    # Calculate totals
    total_revenue = sum(s.total_amount for s in sales)
    transaction_count = sales.count()
    
    # Calculate Gross Sales and Net Income
    gross_sales = float(total_revenue)
    total_cost = 0
    
    items_sold = SaleItem.objects.filter(
        sale__timestamp__date__gte=start_date,
        sale__timestamp__date__lt=end_date
    ).select_related('product')
    
    daily_data = {}
    for sale in sales:
        day = sale.timestamp.date()
        if day not in daily_data:
            daily_data[day] = {'total': 0, 'count': 0}
        daily_data[day]['total'] += float(sale.total_amount)
        daily_data[day]['count'] += 1
    
    best_day = max(daily_data.items(), key=lambda x: x[1]['total']) if daily_data else None
    
    for item in items_sold:
        base_price = float(item.product.base_price) if item.product and item.product.base_price else 0
        total_cost += base_price * item.quantity
    
    net_income = gross_sales - total_cost
    
    y = 750
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "SUMMARY")
    y -= 20
    p.setFont("Helvetica", 10)
    p.drawString(100, y, f"Gross Sales: PHP {gross_sales:,.2f}")
    y -= 15
    p.drawString(100, y, f"Total Cost: PHP {total_cost:,.2f}")
    y -= 15
    p.drawString(100, y, f"Net Income: PHP {net_income:,.2f}")
    y -= 15
    p.drawString(100, y, f"Transaction Count: {transaction_count}")
    y -= 15
    if best_day:
        p.drawString(100, y, f"Best Day: {best_day[0]} - PHP {best_day[1]['total']:,.2f}")
        y -= 15
    else:
        y -= 15
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "DAILY BREAKDOWN")
    y -= 20
    p.setFont("Helvetica", 10)
    
    for day, data in sorted(daily_data.items()):
        p.drawString(100, y, f"{day}: PHP {data['total']:,.2f} ({data['count']} transactions)")
        y -= 15
    
    p.showPage()
    p.save()
    return response


def generate_yearly_report_pdf(request):
    """Generate PDF for yearly sales report"""
    year = request.GET.get('year')
    
    if not year:
        year = timezone.localtime().year
    else:
        try:
            year = int(year)
        except ValueError:
            return HttpResponse("Invalid year", status=400)
    
    start_date = date(year, 1, 1)
    end_date = date(year + 1, 1, 1)
    
    sales = Sale.objects.filter(
        timestamp__date__gte=start_date,
        timestamp__date__lt=end_date
    ).order_by('timestamp')
    
    if not sales.exists():
        return HttpResponse("There's no sales this year", status=404, content_type='text/plain')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Yearly_Sales_{year}.pdf"'
    
    p = canvas.Canvas(response)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 800, f"JMC STORE - YEARLY SALES REPORT")
    p.drawString(100, 780, f"Year: {year}")
    p.line(100, 770, 500, 770)
    
    # Calculate totals
    total_revenue = sum(s.total_amount for s in sales)
    transaction_count = sales.count()
    
    # Calculate Gross Sales and Net Income
    gross_sales = float(total_revenue)
    total_cost = 0
    
    items_sold = SaleItem.objects.filter(
        sale__timestamp__date__gte=start_date,
        sale__timestamp__date__lt=end_date
    ).select_related('product')
    
    monthly_data = {}
    for sale in sales:
        month = sale.timestamp.month
        if month not in monthly_data:
            monthly_data[month] = {'total': 0, 'count': 0}
        monthly_data[month]['total'] += float(sale.total_amount)
        monthly_data[month]['count'] += 1
    
    best_month = max(monthly_data.items(), key=lambda x: x[1]['total']) if monthly_data else None
    
    for item in items_sold:
        base_price = float(item.product.base_price) if item.product and item.product.base_price else 0
        total_cost += base_price * item.quantity
    
    net_income = gross_sales - total_cost
    
    y = 750
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "SUMMARY")
    y -= 20
    p.setFont("Helvetica", 10)
    p.drawString(100, y, f"Gross Sales: PHP {gross_sales:,.2f}")
    y -= 15
    p.drawString(100, y, f"Total Cost: PHP {total_cost:,.2f}")
    y -= 15
    p.drawString(100, y, f"Net Income: PHP {net_income:,.2f}")
    y -= 15
    p.drawString(100, y, f"Transaction Count: {transaction_count}")
    y -= 15
    if best_month:
        month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
        p.drawString(100, y, f"Best Month: {month_names[best_month[0]-1]} - PHP {best_month[1]['total']:,.2f}")
        y -= 15
    else:
        y -= 15
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "MONTHLY BREAKDOWN")
    y -= 20
    p.setFont("Helvetica", 10)
    
    month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December']
    
    for month in range(1, 13):
        if month in monthly_data:
            data = monthly_data[month]
            p.drawString(100, y, f"{month_names[month-1]}: PHP {data['total']:,.2f} ({data['count']} transactions)")
        else:
            p.drawString(100, y, f"{month_names[month-1]}: PHP 0.00 (0 transactions)")
        y -= 15
    
    p.showPage()
    p.save()
    return response


def generate_range_report_pdf(request):
    """Generate PDF for custom date range sales report"""
    start_date_str = request.GET.get('start')
    end_date_str = request.GET.get('end')
    
    if not start_date_str or not end_date_str:
        return HttpResponse("Start and end dates are required", status=400)
    
    try:
        start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return HttpResponse("Invalid date format. Use YYYY-MM-DD", status=400)
    
    end_date = end_date + timedelta(days=1)
    
    sales = Sale.objects.filter(
        timestamp__date__gte=start_date,
        timestamp__date__lt=end_date
    ).order_by('timestamp')
    
    if not sales.exists():
        return HttpResponse("There's no sales in this date range", status=404, content_type='text/plain')

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Sales_Range_{start_date_str}_to_{end_date_str}.pdf"'
    
    p = canvas.Canvas(response)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 800, f"JMC STORE - SALES REPORT")
    p.drawString(100, 780, f"Date Range: {start_date_str} to {end_date_str}")
    p.line(100, 770, 500, 770)
    
    # Calculate totals
    total_revenue = sum(s.total_amount for s in sales)
    transaction_count = sales.count()
    
    # Calculate Gross Sales and Net Income
    gross_sales = float(total_revenue)
    total_cost = 0
    product_sales = {}
    
    items_sold = SaleItem.objects.filter(
        sale__timestamp__date__gte=start_date,
        sale__timestamp__date__lt=end_date
    ).select_related('product')
    
    for item in items_sold:
        key = item.product.name if item.product else 'Unknown'
        if key not in product_sales:
            product_sales[key] = {'quantity': 0, 'total': 0}
        product_sales[key]['quantity'] += item.quantity
        product_sales[key]['total'] += float(item.unit_price) * item.quantity
        
        # Calculate cost of goods sold
        base_price = float(item.product.base_price) if item.product and item.product.base_price else 0
        total_cost += base_price * item.quantity
    
    net_income = gross_sales - total_cost
    
    products_detail = sorted(
        [{'product_name': k, 'quantity': v['quantity'], 'total': v['total']} 
         for k, v in product_sales.items()],
        key=lambda x: x['total'],
        reverse=True
    )
    
    y = 750
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "SUMMARY")
    y -= 20
    p.setFont("Helvetica", 10)
    p.drawString(100, y, f"Gross Sales: PHP {gross_sales:,.2f}")
    y -= 15
    p.drawString(100, y, f"Total Cost: PHP {total_cost:,.2f}")
    y -= 15
    p.drawString(100, y, f"Net Income: PHP {net_income:,.2f}")
    y -= 15
    p.drawString(100, y, f"Transaction Count: {transaction_count}")
    y -= 20
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(100, y, "PRODUCTS")
    y -= 20
    p.setFont("Helvetica", 10)
    
    for product in products_detail:
        p.drawString(100, y, f"{product['product_name']}: {product['quantity']} units - PHP {product['total']:,.2f}")
        y -= 15
    
    p.showPage()
    p.save()
    return response
