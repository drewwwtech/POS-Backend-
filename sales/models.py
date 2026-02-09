from django.db import models
from inventory.models import Product
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from decimal import Decimal
from inventory.models import StockLog

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

# --- FIX 1: Fetch price BEFORE saving to avoid "save loops" ---
@receiver(pre_save, sender=SaleItem)
def fetch_unit_price(sender, instance, **kwargs):
    if not instance.unit_price:
        instance.unit_price = instance.product.price

# --- FIX 2: Process stock and totals AFTER saving ---
@receiver(post_save, sender=SaleItem)
def process_sale_item(sender, instance, created, **kwargs):
    if created:
        # 1. Automate Stock Deduction
        product = instance.product
        product.stock_quantity -= instance.quantity
        product.save()

        # 2. Update the Parent Sale Total
        sale = instance.sale
        
        # We refresh to make sure we have the latest total_amount from the DB
        sale.refresh_from_db()
        
        # Calculation using high-precision Decimal
        item_total = Decimal(str(instance.unit_price)) * Decimal(str(instance.quantity))
        new_total = Decimal(str(sale.total_amount)) + item_total
        
        # Silent update to prevent infinite loops
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
        
        # 4. Create Audit Trail (Stock Log)
        StockLog.objects.create(
            product=product,
            change_amount=-instance.quantity, # Negative because it's a sale
            current_stock=product.stock_quantity,
            type='SALE',
            notes=f"Sold via Transaction: {instance.sale.transaction_id}"
        )