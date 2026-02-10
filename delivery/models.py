from django.db import models
from inventory.models import Product
from django.utils import timezone


class Delivery(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    ]

    COLOR_MAP = {
        'PENDING': '#F59E0B',    # Yellow/Orange
        'COMPLETED': '#10B981',   # Green
        'OVERDUE': '#EF4444',     # Red
        'CANCELLED': '#6B7280',   # Gray
    }

    delivery_date = models.DateField()
    expected_time = models.TimeField(null=True, blank=True)  # Optional time
    supplier_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')  # Notes about delivery
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    notes = models.TextField(blank=True, default='')  # Additional notes
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-delivery_date']

    def __str__(self):
        return f"{self.supplier_name} - {self.delivery_date}"

    @property
    def color(self):
        """Return hex color based on status for calendar"""
        return self.COLOR_MAP.get(self.status, '#6B7280')

    @property
    def is_overdue(self):
        """Check if delivery is overdue"""
        if self.status == 'PENDING' and self.delivery_date < timezone.now().date():
            return True
        return False


class DeliveryItem(models.Model):
    """Items expected in a delivery"""
    delivery = models.ForeignKey(
        Delivery,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='delivery_items'
    )
    expected_quantity = models.PositiveIntegerField(default=0)
    received_quantity = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ['delivery', 'product']

    def __str__(self):
        return f"{self.product.name}: {self.expected_quantity} expected"
