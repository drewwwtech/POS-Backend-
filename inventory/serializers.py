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
        try:
            # We look for the product. If it's not found, it triggers the except block.
            product = Product.objects.get(id=self.validated_data['product_id'])
            quantity = self.validated_data['quantity_added']
            
            # Update stock
            product.stock_quantity += quantity
            # This .save() triggers our pre_save signal in models.py 
            # which automatically creates the StockLog!
            product.save()

            return product
        except Product.DoesNotExist:
            raise serializers.ValidationError({"product_id": "That product ID does not exist."})