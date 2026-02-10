from django.contrib import admin
from .models import Delivery, DeliveryItem


class DeliveryItemInline(admin.TabularInline):
    model = DeliveryItem
    extra = 1
    fields = ['product_name', 'quantity', 'unit', 'received_quantity']


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ['supplier_name', 'delivery_date', 'status', 'created_at']
    list_filter = ['status', 'delivery_date']
    search_fields = ['supplier_name', 'notes', 'remarks']
    inlines = [DeliveryItemInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DeliveryItem)
class DeliveryItemAdmin(admin.ModelAdmin):
    list_display = ['delivery', 'product_name', 'quantity', 'unit', 'received_quantity']
    list_filter = ['unit']
