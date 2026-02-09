from django.urls import path
from .views import ProductListAPI, RestockAPIView, StockHistoryListAPI

urlpatterns = [
    path('products/', ProductListAPI.as_view(), name='product-list'),
    path('restock/', RestockAPIView.as_view(), name='restock-stock-in'),
    path('history/', StockHistoryListAPI.as_view(), name='stock-history'),
]