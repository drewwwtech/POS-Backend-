from django.contrib import admin
from .models import Category, Product, StockLog

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'stock_quantity', 'price', 'is_active')
    search_fields = ('name', 'sku')
    list_filter = ('is_active', 'category')
    actions = ['deactivate_products', 'activate_products']

    def deactivate_products(self, request, queryset):
        queryset.update(is_active=False)
    
    def activate_products(self, request, queryset):
        queryset.update(is_active=True)

@admin.register(StockLog)
class StockLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'product', 'type', 'change_amount', 'current_stock')
    readonly_fields = ('timestamp', 'current_stock')