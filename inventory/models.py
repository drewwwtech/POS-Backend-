from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
    
    class Meta: # Fixed typo: 'meta' to 'Meta'
        verbose_name_plural = "Categories"

class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=50, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.sku})"

# --- NEW MODEL FOR AUDIT TRAIL ---

class StockLog(models.Model):
    TRANSACTION_TYPES = [
        ('SALE', 'Sale (Deduction)'),
        ('RESTOCK', 'Restock (Addition)'),
        ('ADJUST', 'Manual Adjustment'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_logs')
    change_amount = models.IntegerField()  # e.g., -2 for a sale, +10 for a restock
    current_stock = models.IntegerField() # The stock level AFTER this change
    type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    notes = models.TextField(blank=True, null=True) # e.g., "Transaction: TEST-100"
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp'] # Latest logs appear first

    def __str__(self):
        return f"{self.product.name} | {self.type} | {self.change_amount}"