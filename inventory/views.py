from django.shortcuts import render
from rest_framework import generics, filters
from .models import Product
from .serializers import ProductSerializer

class ProductListAPI(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'sku'] # Allow searching by these two fields

