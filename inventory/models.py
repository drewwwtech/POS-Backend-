from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Categories"

class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=50, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True) # Added for Soft Delete
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.sku})"

class StockLog(models.Model):
    TRANSACTION_TYPES = [
        ('SALE', 'Sale (Deduction)'),
        ('RESTOCK', 'Restock (Addition)'),
        ('ADJUST', 'Manual Adjustment'),
    ]

    # Changed to PROTECT so deleting a product (if you ever do) 
    # won't delete your historical logs.
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='stock_logs')
    change_amount = models.IntegerField()
    current_stock = models.IntegerField()
    type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    notes = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.product.name} | {self.type} | {self.change_amount}"

# --- THE AUTO-LOGGER SIGNAL ---

@receiver(pre_save, sender=Product)
def track_stock_changes(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_product = Product.objects.get(pk=instance.pk)
            
            if old_product.stock_quantity != instance.stock_quantity:
                diff = instance.stock_quantity - old_product.stock_quantity
                
                if diff > 0:
                    log_type = 'RESTOCK'
                    note_detail = "Stock increased (Restock/In)"
                else:
                    log_type = 'SALE'
                    note_detail = "Stock decreased (Sale/Out)"

                StockLog.objects.create(
                    product=instance,
                    change_amount=diff,
                    current_stock=instance.stock_quantity,
                    type=log_type,
                    notes=f"System: {note_detail}"
                )
        except Product.DoesNotExist:
            pass