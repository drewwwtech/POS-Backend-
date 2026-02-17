from django.urls import path
from .views import ProductListAPI, ProductDetailAPI, RestockAPIView, StockHistoryListAPI, CategoryListAPI, CategoryDetailAPI

urlpatterns = [
    path('products/', ProductListAPI.as_view(), name='product-list'),
    path('products/<int:pk>/', ProductDetailAPI.as_view(), name='product-detail'),
    path('categories/', CategoryListAPI.as_view(), name='category-list'),
    path('categories/<int:pk>/', CategoryDetailAPI.as_view(), name='category-detail'),
    path('restock/', RestockAPIView.as_view(), name='restock-stock-in'),
    path('history/', StockHistoryListAPI.as_view(), name='stock-history'),
]