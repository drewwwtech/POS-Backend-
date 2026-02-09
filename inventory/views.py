from django.shortcuts import render
from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Product, StockLog
from .serializers import ProductSerializer, RestockSerializer, StockLogSerializer

# 1. Your existing Scanner-Ready List API
class ProductListAPI(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'sku'] # Scanner will type into this field

# 2. NEW: The "Stock In" API
class RestockAPIView(APIView):
    """
    Endpoint to add stock. 
    In the future, you just scan the SKU and send it here with the quantity.
    """
    def post(self, request):
        serializer = RestockSerializer(data=request.data)
        if serializer.is_valid():
            # The serializer.save() handles the math and the logging
            log_entry = serializer.save()
            return Response({
                "status": "success",
                "product": log_entry.product.name,
                "added": log_entry.change_amount,
                "new_total": log_entry.current_stock
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 3. NEW: The History API
class StockHistoryListAPI(generics.ListAPIView):
    """
    View the full audit trail (Sales and Restocks)
    """
    queryset = StockLog.objects.all().order_by('-timestamp')
    serializer_class = StockLogSerializer