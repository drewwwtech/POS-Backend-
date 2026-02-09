from django.urls import path
from .views import (
    SaleListAPI, 
    DashboardSummaryAPI, 
    DailyClosingReportAPI, 
    ReceiptDetailView, 
    generate_receipt,
    generate_daily_report_pdf
)

urlpatterns = [
    # 1. Sale List & Creation: /api/sales/
    path('', SaleListAPI.as_view(), name='sale-list'),

    # 2. Overall Dashboard: /api/sales/dashboard/
    path('dashboard/', DashboardSummaryAPI.as_view(), name='dashboard'),

    # 3. Daily Report: /api/sales/daily-report/
    path('daily-report/', DailyClosingReportAPI.as_view(), name='daily-report'),

    # 4. JSON Receipt Data: /api/sales/receipt/ATOMICTEST/
    path('receipt/<str:transaction_id>/', ReceiptDetailView.as_view(), name='receipt-json'),

    # 5. PDF Download: /api/sales/receipt/pdf/ATOMICTEST/
    path('receipt/pdf/<str:transaction_id>/', generate_receipt, name='receipt-pdf'),

    path('daily-report/pdf/', generate_daily_report_pdf, name='daily-report-pdf'),
]