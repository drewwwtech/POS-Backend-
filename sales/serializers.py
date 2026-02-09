import uuid
from rest_framework import serializers
from .models import Sale, SaleItem
from decimal import Decimal


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price']

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    transaction_id = serializers.CharField(required=False)

    class Meta:
        model = Sale
        fields = ['id', 'transaction_id', 'timestamp', 'total_amount', 'items']

    def create(self, validated_data):

        if not validated_data.get('transaction_id'):
            validated_data['transaction_id'] = f"SALE-{uuid.uuid4().hex[:8].upper()}"

        items_data = validated_data.pop('items')
        sale = Sale.objects.create(**validated_data)
        
        running_total = Decimal('0.00')
        
        for item_data in items_data:
            # Create the item
            item = SaleItem.objects.create(sale=sale, **item_data)
            
            # Calculate the total here instead of waiting for the signal
            price = Decimal(str(item.unit_price))
            qty = Decimal(str(item.quantity))
            running_total += (price * qty)
        
        # Update the sale object directly before returning it
        sale.total_amount = running_total
        sale.save()
        
        return sale

# --- NEW ADDITION BELOW TO FIX THE CRASH ---

class SaleReceiptSerializer(SaleSerializer):
    """
    Inherits from SaleSerializer since the fields are identical.
    This provides the name your views.py is looking for.
    """
    class Meta(SaleSerializer.Meta):
        fields = ['transaction_id', 'timestamp', 'total_amount', 'items']