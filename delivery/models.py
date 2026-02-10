from django.db import models
from django.utils import timezone


class Delivery(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending / Not Sent'),
        ('SENT', 'Sent to Supplier'),
        ('RECEIVED', 'Received'),
        ('PROBLEM', 'Problem / Issue'),
    ]

    COLOR_MAP = {
        'PENDING': '#F59E0B',    # Yellow/Orange
        'SENT': '#3B82F6',       # Blue
        'RECEIVED': '#10B981',   # Green
        'PROBLEM': '#EF4444',    # Red
    }

    delivery_date = models.DateField()
    supplier_name = models.CharField(max_length=200)
    notes = models.TextField(blank=True, default='')  # General notes
    remarks = models.TextField(blank=True, default='')  # Problems after receiving
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
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
        if self.status in ['PENDING', 'SENT'] and self.delivery_date < timezone.now().date():
            return True
        return False


class DeliveryItem(models.Model):
    """
    Items in a delivery order.
    """
    UNIT_CHOICES = [
        ('PCS', 'Pieces'),
        ('PACKS', 'Packs'),
        ('BOXES', 'Boxes'),
        ('CANS', 'Cans'),
        ('BOTTLES', 'Bottles'),
    ]

    delivery = models.ForeignKey(
        Delivery,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product_name = models.CharField(max_length=200)  # Name of product
    quantity = models.PositiveIntegerField(default=0)  # Ordered quantity
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='PCS')
    received_quantity = models.PositiveIntegerField(default=0)  # Received quantity

    def __str__(self):
        return f"{self.product_name}: {self.quantity} {self.unit}"
