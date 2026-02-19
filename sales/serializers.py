import uuid
from rest_framework import serializers
from .models import Sale, SaleItem
from decimal import Decimal


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price']

    def validate_unit_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Unit price must be a positive number.")
        return value

    def validate_quantity(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    transaction_id = serializers.CharField(required=False)

    class Meta:
        model = Sale
        fields = ['id', 'transaction_id', 'timestamp', 'total_amount', 'items']

    def validate_items(self, items):
        """Validate all items in the sale"""
        if not items:
            raise serializers.ValidationError("At least one item is required.")
        return items

    def create(self, validated_data):
        from inventory.models import Product
        
        if not validated_data.get('transaction_id'):
            validated_data['transaction_id'] = f"SALE-{uuid.uuid4().hex[:8].upper()}"

        items_data = validated_data.pop('items')
        
        # Pre-validate stock availability
        for item_data in items_data:
            product = item_data.get('product')
            quantity = item_data.get('quantity', 0)
            
            if not product:
                raise serializers.ValidationError("Product is required for each item.")
            
            if quantity <= 0:
                raise serializers.ValidationError(f"Quantity must be at least 1 for all items.")
            
            # Check stock
            if hasattr(product, 'stock_quantity'):
                if product.stock_quantity < quantity:
                    raise serializers.ValidationError(
                        f"Insufficient stock for {product.name}. Available: {product.stock_quantity}, Requested: {quantity}"
                    )
        
        # All validations passed, create the sale
        # The total_amount will be calculated by the post_save signal in models.py
        sale = Sale.objects.create(**validated_data)
        
        # Create items - the signal will handle stock deduction and total calculation
        for item_data in items_data:
            SaleItem.objects.create(sale=sale, **item_data)
        
        # Refresh to get the calculated total from the signal
        sale.refresh_from_db()
        
        return sale

# --- NEW ADDITION BELOW TO FIX THE CRASH ---

class SaleReceiptSerializer(SaleSerializer):
    """
    Inherits from SaleSerializer since the fields are identical.
    This provides the name your views.py is looking for.
    """
    class Meta(SaleSerializer.Meta):
        fields = ['transaction_id', 'timestamp', 'total_amount', 'items']