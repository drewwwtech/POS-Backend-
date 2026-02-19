from django.shortcuts import render
from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Product, StockLog, Category
from .serializers import ProductSerializer, RestockSerializer, StockLogSerializer, CategorySerializer

# 1. Your existing Scanner-Ready List API
class ProductListAPI(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'sku']

# 1b. Product Detail API (Get, Update, Delete)
class ProductDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer # Scanner will type into this field

# Category APIs
class CategoryListAPI(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class CategoryDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

# 2. NEW: The "Stock In" API
# inventory/views.py

class RestockAPIView(APIView):
    def post(self, request):
        serializer = RestockSerializer(data=request.data)
        
        if serializer.is_valid():
            product = serializer.save()
            return Response({
                "status": "success",
                "message": f"Successfully restocked {product.name} (SKU: {product.sku})",
                "new_total_stock": product.stock_quantity
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 3. NEW: The History API
class StockHistoryListAPI(generics.ListAPIView):
    """
    View the full audit trail (Sales and Restocks)
    """
    queryset = StockLog.objects.all().order_by('-timestamp')
    serializer_class = StockLogSerializer


# 4. NEW: SKU Lookup API (for barcode scanner)
class ProductLookupAPI(APIView):
    """
    Exact SKU lookup for the barcode scanner.
    GET /api/inventory/products/lookup/?sku=ABC123
    Returns full product details if found, 404 if not.
    """
    def get(self, request):
        sku = request.query_params.get('sku', '').strip()
        if not sku:
            return Response(
                {"error": "SKU parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            product = Product.objects.get(sku=sku)
            serializer = ProductSerializer(product)
            return Response({"found": True, "product": serializer.data})
        except Product.DoesNotExist:
            return Response(
                {"found": False, "sku": sku},
                status=status.HTTP_404_NOT_FOUND
            )