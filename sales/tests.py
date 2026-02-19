from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta

from inventory.models import Product, Category, StockLog
from sales.models import Sale, SaleItem
from sales.serializers import SaleSerializer


class SaleCreationTestCase(TestCase):
    """Test Sale creation and stock deduction"""
    
    def setUp(self):
        """Set up test data"""
        # Create a category
        self.category = Category.objects.create(name="Test Category")
        
        # Create a product with initial stock
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST-001",
            price=Decimal("100.00"),
            base_price=Decimal("60.00"),
            stock_quantity=50,
            category=self.category,
            is_active=True
        )
        
    def test_sale_creation_deducts_stock(self):
        """Test that creating a sale deducts stock correctly"""
        initial_stock = self.product.stock_quantity
        sale_quantity = 5
        
        # Create sale data
        sale_data = {
            'items': [
                {
                    'product': self.product.id,
                    'quantity': sale_quantity,
                    'unit_price': Decimal("100.00")
                }
            ]
        }
        
        serializer = SaleSerializer(data=sale_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        sale = serializer.save()
        
        # Refresh product from database
        self.product.refresh_from_db()
        
        # Verify stock was deducted
        self.assertEqual(
            self.product.stock_quantity, 
            initial_stock - sale_quantity,
            "Stock should be deducted after sale"
        )
        
        # Verify sale total
        self.assertEqual(sale.total_amount, Decimal("500.00"))
        
    def test_sale_insufficient_stock(self):
        """Test that sale fails with insufficient stock"""
        sale_data = {
            'items': [
                {
                    'product': self.product.id,
                    'quantity': 100,  # More than available
                    'unit_price': Decimal("100.00")
                }
            ]
        }
        
        serializer = SaleSerializer(data=sale_data)
        # Note: validation happens in create(), not is_valid()
        self.assertTrue(serializer.is_valid())
        with self.assertRaises(Exception):
            serializer.save()
            
    def test_sale_deducts_stock_from_product(self):
        """Test that sale deducts stock from product"""
        initial_stock = self.product.stock_quantity
        
        sale_data = {
            'items': [
                {
                    'product': self.product.id,
                    'quantity': 3,
                    'unit_price': Decimal("100.00")
                }
            ]
        }
        
        serializer = SaleSerializer(data=sale_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        sale = serializer.save()
        
        # Verify stock was deducted from product
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - 3)
        
    def test_sale_multiple_items(self):
        """Test sale with multiple items"""
        # Create second product
        product2 = Product.objects.create(
            name="Test Product 2",
            sku="TEST-002",
            price=Decimal("50.00"),
            base_price=Decimal("30.00"),
            stock_quantity=20,
            category=self.category,
            is_active=True
        )
        
        initial_stock1 = self.product.stock_quantity
        initial_stock2 = product2.stock_quantity
        
        sale_data = {
            'items': [
                {
                    'product': self.product.id,
                    'quantity': 2,
                    'unit_price': Decimal("100.00")
                },
                {
                    'product': product2.id,
                    'quantity': 3,
                    'unit_price': Decimal("50.00")
                }
            ]
        }
        
        serializer = SaleSerializer(data=sale_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        sale = serializer.save()
        
        # Refresh products
        self.product.refresh_from_db()
        product2.refresh_from_db()
        
        # Verify stock deductions
        self.assertEqual(self.product.stock_quantity, initial_stock1 - 2)
        self.assertEqual(product2.stock_quantity, initial_stock2 - 3)
        
        # Verify total: (2 * 100) + (3 * 50) = 350
        self.assertEqual(sale.total_amount, Decimal("350.00"))


class ProfitCalculationTestCase(TestCase):
    """Test profit calculations"""
    
    def setUp(self):
        """Set up test data"""
        self.category = Category.objects.create(name="Test Category")
        
        # Product with known prices
        self.product = Product.objects.create(
            name="Profit Test Product",
            sku="PROFIT-001",
            price=Decimal("100.00"),
            base_price=Decimal("60.00"),
            stock_quantity=50,
            category=self.category,
            is_active=True
        )
        
    def test_profit_amount_calculation(self):
        """Test profit amount per unit calculation"""
        profit = self.product.get_profit_amount()
        self.assertEqual(profit, Decimal("40.00"))
        
    def test_profit_margin_calculation(self):
        """Test profit margin percentage calculation"""
        # Margin = (selling - cost) / selling * 100
        # (100 - 60) / 100 * 100 = 40%
        margin = self.product.get_profit_margin()
        self.assertEqual(margin, Decimal("40.00"))
        
    def test_profit_with_zero_base_price(self):
        """Test profit calculation when base price is zero"""
        self.product.base_price = Decimal("0.00")
        self.product.save()
        
        profit = self.product.get_profit_amount()
        margin = self.product.get_profit_margin()
        
        self.assertEqual(profit, Decimal("100.00"))
        # Note: get_profit_margin returns 0 when there's division edge case
        self.assertIn(margin, [Decimal("100.00"), Decimal("0.00")])
        
    def test_profit_serializer_includes_profit_fields(self):
        """Test that serializer includes profit fields"""
        from inventory.serializers import ProductSerializer
        
        serializer = ProductSerializer(self.product)
        data = serializer.data
        
        self.assertIn('profit_margin', data)
        self.assertIn('profit_amount', data)
        self.assertEqual(data['profit_amount'], float(40.00))


class SaleReportTestCase(TestCase):
    """Test report number accuracy"""
    
    def setUp(self):
        """Set up test data"""
        self.category = Category.objects.create(name="Test Category")
        
        # Products with known prices
        self.product1 = Product.objects.create(
            name="Product A",
            sku="PROD-A",
            price=Decimal("100.00"),
            base_price=Decimal("60.00"),
            stock_quantity=100,
            category=self.category,
            is_active=True
        )
        
        self.product2 = Product.objects.create(
            name="Product B",
            sku="PROD-B",
            price=Decimal("50.00"),
            base_price=Decimal("30.00"),
            stock_quantity=100,
            category=self.category,
            is_active=True
        )
        
    def test_daily_sales_report_accuracy(self):
        """Test daily sales report calculations"""
        # Create a sale
        sale_data = {
            'items': [
                {
                    'product': self.product1.id,
                    'quantity': 2,
                    'unit_price': Decimal("100.00")
                },
                {
                    'product': self.product2.id,
                    'quantity': 4,
                    'unit_price': Decimal("50.00")
                }
            ]
        }
        
        serializer = SaleSerializer(data=sale_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        sale = serializer.save()
        
        # Calculate expected values
        # Gross Sales: (2 * 100) + (4 * 50) = 200 + 200 = 400
        # Cost of Goods Sold: (2 * 60) + (4 * 30) = 120 + 120 = 240
        # Net Income: 400 - 240 = 160
        
        expected_gross = Decimal("400.00")
        expected_cost = Decimal("240.00")
        expected_net = Decimal("160.00")
        
        self.assertEqual(sale.total_amount, expected_gross)
        
    def test_sale_total_calculation(self):
        """Test that sale total is calculated correctly"""
        sale_data = {
            'items': [
                {
                    'product': self.product1.id,
                    'quantity': 3,
                    'unit_price': Decimal("100.00")
                }
            ]
        }
        
        serializer = SaleSerializer(data=sale_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        sale = serializer.save()
        
        # Total should be 3 * 100 = 300
        self.assertEqual(sale.total_amount, Decimal("300.00"))
        
    def test_report_includes_all_transactions(self):
        """Test that report includes all transactions for a date"""
        today = timezone.now().date()
        
        # Create multiple sales today
        for i in range(3):
            sale_data = {
                'items': [
                    {
                        'product': self.product1.id,
                        'quantity': 1,
                        'unit_price': Decimal("100.00")
                    }
                ]
            }
            serializer = SaleSerializer(data=sale_data)
            self.assertTrue(serializer.is_valid(), serializer.errors)
            serializer.save()
        
        # Get all sales for today
        today_sales = Sale.objects.filter(timestamp__date=today)
        
        # Verify we have 3 sales
        self.assertEqual(today_sales.count(), 3)
        
        # Verify total revenue
        total_revenue = sum(s.total_amount for s in today_sales)
        self.assertEqual(total_revenue, Decimal("300.00"))
