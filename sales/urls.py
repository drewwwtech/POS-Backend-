from django.urls import path
from .views import SaleListAPI, DashboardSummaryAPI, DailyClosingReportAPI, generate_receipt

urlpatterns = [
    # Changed from 'api/all/' to just 'transactions/'
    path('transactions/', SaleListAPI.as_view(), name='sales-list-api'),
    
    # Dashboard analytics
    path('dashboard/', DashboardSummaryAPI.as_view(), name='dashboard-api'),
    
    # Daily closing report (Z-Report)
    path('daily-report/', DailyClosingReportAPI.as_view(), name='daily-report'),
    
    # PDF Receipt Generation
    path('receipt/<str:transaction_id>/', generate_receipt, name='generate-receipt'),
]