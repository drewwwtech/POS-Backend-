from rest_framework import serializers
from .models import Delivery, DeliveryItem


class DeliveryItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = DeliveryItem
        fields = ['id', 'product_name', 'quantity', 'unit', 'received_quantity']


class DeliverySerializer(serializers.ModelSerializer):
    items = DeliveryItemSerializer(many=True, read_only=True)
    color = serializers.ReadOnlyField()

    class Meta:
        model = Delivery
        fields = [
            'id', 'delivery_date', 'supplier_name',
            'status', 'notes', 'remarks', 'items', 'color',
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
    """Simple serializer for creating deliveries"""

    class Meta:
        model = Delivery
        fields = ['delivery_date', 'supplier_name', 'status', 'notes']


class DeliveryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = ['delivery_date', 'supplier_name', 'status', 'notes', 'remarks']


class DeliveryPreviewSerializer(serializers.ModelSerializer):
    """Serializer for preview format"""
    items = DeliveryItemSerializer(many=True, read_only=True)

    class Meta:
        model = Delivery
        fields = ['id', 'delivery_date', 'supplier_name', 'notes', 'items']
