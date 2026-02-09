from rest_framework import serializers
from .models import Product, Category, StockLog

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Product
        fields = ['id', 'name', 'sku', 'price', 'stock_quantity', 'category_name']

# 1. New Serializer to view the history
class StockLogSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = StockLog
        fields = ['id', 'product', 'product_name', 'change_amount', 'current_stock', 'type', 'notes', 'timestamp']

# 2. New Serializer for the "Stock In" action
class RestockSerializer(serializers.Serializer):
    # Change this to CharField because SKUs can be strings or barcodes
    sku = serializers.CharField() 
    quantity_added = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True)

    def save(self):
        try:
            # We add is_active=True here to "lock" the product from the API
            product = Product.objects.get(sku=self.validated_data['sku'], is_active=True)
            quantity = self.validated_data['quantity_added']
            
            product.stock_quantity += quantity
            product.save() 

            return product
        except Product.DoesNotExist:
            # If the product is inactive, .get() will fail and come here
            raise serializers.ValidationError({
                "sku": "This product is inactive or does not exist."
            })