from rest_framework import serializers
from .models import Product, Category, StockLog


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), required=False, allow_null=True)
    profit_margin = serializers.SerializerMethodField()
    profit_amount = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'sku', 'price', 'base_price', 'stock_quantity', 'description', 'category', 'category_name', 'is_active', 'profit_margin', 'profit_amount']

    def validate_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Price must be a positive number.")
        return value

    def validate_base_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Base price must be a positive number.")
        return value

    def validate(self, attrs):
        price = attrs.get('price')
        base_price = attrs.get('base_price')
        
        if price is not None and price < 0:
            raise serializers.ValidationError({'price': 'Price must be a positive number.'})
        
        if base_price is not None and base_price < 0:
            raise serializers.ValidationError({'base_price': 'Base price must be a positive number.'})
        
        return attrs

    def get_profit_margin(self, obj):
        """Call model method to calculate profit margin percentage"""
        return obj.get_profit_margin()
    
    def get_profit_amount(self, obj):
        """Call model method to calculate profit amount per unit"""
        return float(obj.get_profit_amount())


class StockLogSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = StockLog
        fields = ['id', 'product', 'product_name', 'change_amount', 'current_stock', 'type', 'notes', 'timestamp']


class RestockSerializer(serializers.Serializer):
    sku = serializers.CharField() 
    quantity_added = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True)

    def save(self):
        try:
            product = Product.objects.get(sku=self.validated_data['sku'], is_active=True)
            quantity = self.validated_data['quantity_added']
            
            product.stock_quantity += quantity
            product.save() 

            return product
        except Product.DoesNotExist:
            raise serializers.ValidationError({
                "sku": "This product is inactive or does not exist."
            })
