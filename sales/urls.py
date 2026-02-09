from django.urls import path
from .views import SaleListAPI, DashboardSummaryAPI, DailyClosingReportAPI, generate_receipt

urlpatterns = [
    path('api/all/', SaleListAPI.as_view(), name='sales-list-api'),
    path('api/dashboard/', DashboardSummaryAPI.as_view(), name='dashboard-api'),
    path('api/daily-report/', DailyClosingReportAPI.as_view(), name='daily-report'),
    path('receipt/<str:transaction_id>/', generate_receipt, name='generate-receipt'),
]