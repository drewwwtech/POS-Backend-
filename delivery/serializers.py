from rest_framework import serializers
from .models import Delivery, DeliveryItem
from inventory.models import Product


class DeliveryItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_sku = serializers.ReadOnlyField(source='product.sku')

    class Meta:
        model = DeliveryItem
        fields = ['id', 'product', 'product_name', 'product_sku', 'expected_quantity', 'received_quantity']


class DeliverySerializer(serializers.ModelSerializer):
    items = DeliveryItemSerializer(many=True, read_only=True)
    color = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = Delivery
        fields = [
            'id', 'delivery_date', 'expected_time', 'supplier_name',
            'description', 'status', 'notes', 'items', 'color', 'is_overdue',
            'created_at', 'updated_at'
        ]


class DeliveryCalendarSerializer(serializers.ModelSerializer):
    """Serializer optimized for FullCalendar"""
    title = serializers.SerializerMethodField()
    start = serializers.SerializerMethodField()
    end = serializers.SerializerMethodField()

    class Meta:
        model = Delivery
        fields = ['id', 'title', 'start', 'end', 'color', 'status']

    def get_title(self, obj):
        return f"{obj.supplier_name} - {obj.get_status_display()}"

    def get_start(self, obj):
        return str(obj.delivery_date)

    def get_end(self, obj):
        return str(obj.delivery_date)


class SimpleDeliverySerializer(serializers.ModelSerializer):
    """Simple serializer for creating deliveries without items"""

    class Meta:
        model = Delivery
        fields = ['delivery_date', 'expected_time', 'supplier_name', 'description', 'status', 'notes']


class DeliveryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = ['delivery_date', 'expected_time', 'supplier_name', 'description', 'status', 'notes']
