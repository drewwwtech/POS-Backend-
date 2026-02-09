from django.contrib import admin
from .models import Sale, SaleItem

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1  # Provides one empty row by default for new items
    fields = ('product', 'quantity', 'unit_price')

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'timestamp', 'total_amount')
    inlines = [SaleItemInline]
    readonly_fields = ('timestamp',) # Prevent manual editing of the time