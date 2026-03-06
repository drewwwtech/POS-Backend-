from django.db import models
from django.utils import timezone


class Delivery(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent (Indicator)'),
        ('RECEIVED', 'Completed'),
        ('PROBLEM', 'Problem'),
    ]

    COLOR_MAP = {
        'PENDING': '#F59E0B',    # Yellow/Orange
        'SENT': '#8B5CF6',      # Purple - indicator only
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
        from datetime import date
        today = date.today()
        if self.status in ['PENDING', 'SENT'] and self.delivery_date < today:
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
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Cost per unit")

    def __str__(self):
        return f"{self.product_name}: {self.quantity} {self.unit}"

    @property
    def total_cost(self):
        """Calculate total cost for this item"""
        return self.quantity * (self.unit_cost or 0)
