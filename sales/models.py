from django.db import models, transaction  # Added transaction
from inventory.models import Product, StockLog
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from decimal import Decimal

class Sale(models.Model):
    transaction_id = models.CharField(max_length=100, unique=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Sale {self.transaction_id}"

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True) 

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

# --- FIX 1: Fetch price BEFORE saving ---
@receiver(pre_save, sender=SaleItem)
def fetch_unit_price(sender, instance, **kwargs):
    if not instance.unit_price:
        instance.unit_price = instance.product.price

# --- FIX 2: Process stock and totals AFTER saving ---
@receiver(post_save, sender=SaleItem)
def process_sale_item(sender, instance, created, **kwargs):
    if created:
        # Wrap the entire operation in an atomic transaction
        # This ensures that if the stock deduction OR the total update fails,
        # the database rolls back to the state before the sale started.
        with transaction.atomic():
            # 1. Automate Stock Deduction
            product = instance.product
            product.stock_quantity -= instance.quantity
            
            # This triggers the track_stock_changes signal in inventory/models.py
            product.save() 

            # 2. Update the Parent Sale Total
            sale = instance.sale
            sale.refresh_from_db()
            
            item_total = Decimal(str(instance.unit_price)) * Decimal(str(instance.quantity))
            new_total = Decimal(str(sale.total_amount)) + item_total
            
            # Use filter().update() to update the DB directly without re-triggering signals
            Sale.objects.filter(id=sale.id).update(total_amount=new_total)

            # 3. Low Stock Alert (Threshold: 10)
            if product.stock_quantity < 10:
                send_mail(
                    subject=f'⚠️ LOW STOCK ALERT: {product.name}',
                    message=f'Product {product.name} is low. Current stock: {product.stock_quantity}.',
                    from_email='alerts@modernpos.com',
                    recipient_list=['admin@yourshop.com'],
                    fail_silently=True,
                )