from django.contrib import admin
from .models import Delivery, DeliveryItem


class DeliveryItemInline(admin.TabularInline):
    model = DeliveryItem
    extra = 1
    readonly_fields = ['product']


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ['supplier_name', 'delivery_date', 'expected_time', 'status', 'created_at']
    list_filter = ['status', 'delivery_date']
    search_fields = ['supplier_name', 'description', 'notes']
    inlines = [DeliveryItemInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DeliveryItem)
class DeliveryItemAdmin(admin.ModelAdmin):
    list_display = ['delivery', 'product', 'expected_quantity', 'received_quantity']
    list_filter = ['product']
