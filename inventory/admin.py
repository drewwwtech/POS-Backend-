from django.contrib import admin
from .models import Category, Product, StockLog

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'price', 'stock_quantity', 'category')
    search_fields = ('name', 'sku')
    list_filter = ('category',)

@admin.register(StockLog)
class StockLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'product', 'type', 'change_amount', 'current_stock')
    readonly_fields = ('timestamp', 'current_stock')