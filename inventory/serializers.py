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
        fields = ['id', 'name', 'sku', 'price', 'base_price', 'price_to_sell', 'stock_quantity', 'description', 'category', 'category_name', 'is_active', 'profit_margin', 'profit_amount']

    def get_profit_margin(self, obj):
        """Calculate profit margin percentage"""
        cost = float(obj.base_price) if obj.base_price else 0
        selling = float(obj.price_to_sell) if obj.price_to_sell else float(obj.price) if obj.price else 0
        if selling > 0 and cost > 0:
            return ((selling - cost) / selling) * 100
        return 0
    
    def get_profit_amount(self, obj):
        """Calculate profit amount per unit"""
        cost = float(obj.base_price) if obj.base_price else 0
        selling = float(obj.price_to_sell) if obj.price_to_sell else float(obj.price) if obj.price else 0
        return selling - cost


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
