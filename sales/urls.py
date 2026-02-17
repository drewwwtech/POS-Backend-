from django.urls import path
from .views import (
    SaleListAPI, 
    DashboardSummaryAPI, 
    DailyClosingReportAPI, 
    ReceiptDetailView, 
    generate_receipt,
    generate_daily_report_pdf,
    DailySalesReportAPI,
    MonthlySalesReportAPI,
    YearlySalesReportAPI,
    SalesRangeReportAPI,
    SalesChartAPI
)

urlpatterns = [
    # 1. Sale List & Creation: /api/sales/
    path('', SaleListAPI.as_view(), name='sale-list'),

    # 2. Overall Dashboard: /api/sales/dashboard/
    path('dashboard/', DashboardSummaryAPI.as_view(), name='dashboard'),

    # 3. Daily Report: /api/sales/daily-report/
    path('daily-report/', DailyClosingReportAPI.as_view(), name='daily-report'),

    # 4. Sales Chart: /api/sales/chart/
    path('chart/', SalesChartAPI.as_view(), name='sales-chart'),

    # 5. JSON Receipt Data: /api/sales/receipt/ATOMICTEST/
    path('receipt/<str:transaction_id>/', ReceiptDetailView.as_view(), name='receipt-json'),

    # 6. PDF Download: /api/sales/receipt/pdf/ATOMICTEST/
    path('receipt/pdf/<str:transaction_id>/', generate_receipt, name='receipt-pdf'),

    path('daily-report/pdf/', generate_daily_report_pdf, name='daily-report-pdf'),

    # Sales Report APIs
    path('report/daily/', DailySalesReportAPI.as_view(), name='report-daily'),
    path('report/monthly/', MonthlySalesReportAPI.as_view(), name='report-monthly'),
    path('report/yearly/', YearlySalesReportAPI.as_view(), name='report-yearly'),
    path('report/range/', SalesRangeReportAPI.as_view(), name='report-range'),
]