from django.db import models
from inventory.models import Product
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail  # Required for alerts

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
    unit_price = models.DecimalField(max_digits=10, decimal_places=2) 

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

@receiver(post_save, sender=SaleItem)
def process_sale_item(sender, instance, created, **kwargs):
    if created:
        # 1. Automate Stock Deduction
        product = instance.product
        product.stock_quantity -= instance.quantity
        product.save()

        # 2. Automate Price Fetching
        if not instance.unit_price:
            instance.unit_price = product.price
            instance.save()

        # 3. Update the Parent Sale Total
        sale = instance.sale
        sale.total_amount += (instance.unit_price * instance.quantity)
        sale.save()

        # 4. Modern POS Feature: Low Stock Alert
        # We set the threshold to 50 so you can test it with your current Sprite stock
        if product.stock_quantity < 50:
            send_mail(
                subject=f'⚠️ LOW STOCK ALERT: {product.name}',
                message=f'The product {product.name} (SKU: {product.sku}) is running low.\n'
                        f'Current stock level: {product.stock_quantity}.\n'
                        f'Please restock this item in the Inventory app.',
                from_email='alerts@modernpos.com',
                recipient_list=['admin@yourshop.com'], # You can put your real email here
                fail_silently=False,
            )