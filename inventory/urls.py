from django.urls import path
from .views import ProductListAPI

urlpatterns = [
    path('api/products/', ProductListAPI.as_view(), name='product-list-api'),
]