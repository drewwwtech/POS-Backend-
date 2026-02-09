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
    product_id = serializers.IntegerField()
    quantity_added = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True)

    def save(self):
        # Using .get() ensures we are targeting the right product
        product = Product.objects.get(id=self.validated_data['product_id'])
        quantity = self.validated_data['quantity_added']
        
        # Logic for "Stock In"
        product.stock_quantity += quantity
        product.save()

        # Create the Log entry for the Addition
        return StockLog.objects.create(
            product=product,
            change_amount=quantity, 
            current_stock=product.stock_quantity,
            type='RESTOCK',
            notes=self.validated_data.get('notes', 'Manual Restock')
        )