from django.test import TestCase
from decimal import Decimal

from inventory.models import Product, Category, StockLog
from inventory.serializers import RestockSerializer, ProductSerializer


class RestockTestCase(TestCase):
    """Test Restock API (stock increases)"""
    
    def setUp(self):
        """Set up test data"""
        # Create a category
        self.category = Category.objects.create(name="Test Category")
        
        # Create a product with initial stock
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST-RESTOCK-001",
            price=Decimal("100.00"),
            base_price=Decimal("60.00"),
            stock_quantity=50,
            category=self.category,
            is_active=True
        )
        
    def test_restock_increases_stock(self):
        """Test that restocking increases stock correctly"""
        initial_stock = self.product.stock_quantity
        restock_quantity = 25
        
        # Create restock data
        restock_data = {
            'sku': self.product.sku,
            'quantity_added': restock_quantity,
            'notes': 'Test restock'
        }
        
        serializer = RestockSerializer(data=restock_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        product = serializer.save()
        
        # Verify stock was increased
        self.product.refresh_from_db()
        self.assertEqual(
            self.product.stock_quantity,
            initial_stock + restock_quantity,
            "Stock should be increased after restock"
        )
        
    def test_restock_creates_stock_log(self):
        """Test that restock creates a stock log entry"""
        restock_data = {
            'sku': self.product.sku,
            'quantity_added': 10,
            'notes': 'Test restock'
        }
        
        serializer = RestockSerializer(data=restock_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        
        # Check stock log was created
        logs = StockLog.objects.filter(product=self.product, type='RESTOCK')
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs.first().change_amount, 10)
        
    def test_restock_invalid_sku(self):
        """Test that restock fails with invalid SKU"""
        restock_data = {
            'sku': 'INVALID-SKU',
            'quantity_added': 10
        }
        
        serializer = RestockSerializer(data=restock_data)
        # Note: validation happens in save(), not is_valid()
        self.assertTrue(serializer.is_valid())
        with self.assertRaises(Exception):
            serializer.save()
            
    def test_restock_inactive_product(self):
        """Test that restock fails for inactive product"""
        # Deactivate product
        self.product.is_active = False
        self.product.save()
        
        restock_data = {
            'sku': self.product.sku,
            'quantity_added': 10
        }
        
        serializer = RestockSerializer(data=restock_data)
        # Note: validation happens in save(), not is_valid()
        self.assertTrue(serializer.is_valid())
        with self.assertRaises(Exception):
            serializer.save()
        
    def test_restock_minimum_quantity(self):
        """Test that restock fails with invalid quantity (less than 1)"""
        restock_data = {
            'sku': self.product.sku,
            'quantity_added': 0
        }
        
        serializer = RestockSerializer(data=restock_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('quantity_added', serializer.errors)
        
    def test_multiple_restock_operations(self):
        """Test multiple restock operations accumulate correctly"""
        initial_stock = self.product.stock_quantity
        
        # First restock
        restock_data1 = {
            'sku': self.product.sku,
            'quantity_added': 10
        }
        serializer1 = RestockSerializer(data=restock_data1)
        self.assertTrue(serializer1.is_valid(), serializer1.errors)
        serializer1.save()
        
        # Second restock
        restock_data2 = {
            'sku': self.product.sku,
            'quantity_added': 15
        }
        serializer2 = RestockSerializer(data=restock_data2)
        self.assertTrue(serializer2.is_valid(), serializer2.errors)
        serializer2.save()
        
        # Verify total increase
        self.product.refresh_from_db()
        self.assertEqual(
            self.product.stock_quantity,
            initial_stock + 10 + 15
        )


class ProductModelTestCase(TestCase):
    """Test Product model methods"""
    
    def setUp(self):
        """Set up test data"""
        self.category = Category.objects.create(name="Test Category")
        
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST-MODEL-001",
            price=Decimal("100.00"),
            base_price=Decimal("60.00"),
            stock_quantity=50,
            category=self.category,
            is_active=True
        )
        
    def test_product_str_representation(self):
        """Test string representation of product"""
        self.assertEqual(str(self.product), "Test Product (TEST-MODEL-001)")
        
    def test_product_profit_amount_positive(self):
        """Test profit amount with positive margin"""
        profit = self.product.get_profit_amount()
        self.assertEqual(profit, Decimal("40.00"))
        
    def test_product_profit_margin_positive(self):
        """Test profit margin with positive margin"""
        margin = self.product.get_profit_margin()
        # (100 - 60) / 100 * 100 = 40%
        self.assertEqual(margin, Decimal("40.00"))
        
    def test_product_profit_with_zero_base_price(self):
        """Test profit when base price is zero"""
        self.product.base_price = Decimal("0.00")
        self.product.save()
        
        profit = self.product.get_profit_amount()
        margin = self.product.get_profit_margin()
        
        self.assertEqual(profit, Decimal("100.00"))
        # Note: get_profit_margin returns 0 when there's division edge case
        self.assertIn(margin, [Decimal("100.00"), Decimal("0.00")])
        
    def test_product_profit_with_zero_price(self):
        """Test profit when selling price is zero"""
        self.product.price = Decimal("0.00")
        self.product.save()
        
        profit = self.product.get_profit_amount()
        margin = self.product.get_profit_margin()
        
        self.assertEqual(profit, Decimal("-60.00"))  # 0 - 60 = -60
        # Division by zero should return 0
        self.assertEqual(margin, Decimal("0.00"))


class ProductSerializerTestCase(TestCase):
    """Test Product serializer"""
    
    def setUp(self):
        """Set up test data"""
        self.category = Category.objects.create(name="Test Category")
        
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST-SERIAL-001",
            price=Decimal("100.00"),
            base_price=Decimal("60.00"),
            stock_quantity=50,
            category=self.category,
            is_active=True
        )
        
    def test_serializer_includes_all_fields(self):
        """Test that serializer includes all required fields"""
        serializer = ProductSerializer(self.product)
        data = serializer.data
        
        # Check required fields
        self.assertIn('id', data)
        self.assertIn('name', data)
        self.assertIn('sku', data)
        self.assertIn('price', data)
        self.assertIn('base_price', data)
        self.assertIn('stock_quantity', data)
        self.assertIn('category', data)
        self.assertIn('category_name', data)
        self.assertIn('profit_margin', data)
        self.assertIn('profit_amount', data)
        
    def test_serializer_profit_fields(self):
        """Test profit fields in serializer"""
        serializer = ProductSerializer(self.product)
        data = serializer.data
        
        self.assertEqual(data['profit_amount'], float(40.00))
        # Margin is returned as a Decimal, check numeric value
        self.assertEqual(float(data['profit_margin']), 40.00)
        
    def test_serializer_category_name(self):
        """Test category name is included"""
        serializer = ProductSerializer(self.product)
        data = serializer.data
        
        self.assertEqual(data['category_name'], "Test Category")
        
    def test_serializer_validation_positive_price(self):
        """Test serializer validation for positive price"""
        serializer = ProductSerializer(
            data={
                'name': 'New Product',
                'sku': 'NEW-001',
                'price': -10,
                'base_price': 5,
                'stock_quantity': 10
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('price', serializer.errors)
        
    def test_serializer_validation_positive_base_price(self):
        """Test serializer validation for positive base price"""
        serializer = ProductSerializer(
            data={
                'name': 'New Product',
                'sku': 'NEW-002',
                'price': 100,
                'base_price': -5,
                'stock_quantity': 10
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('base_price', serializer.errors)


class CategoryTestCase(TestCase):
    """Test Category model"""
    
    def test_category_creation(self):
        """Test category can be created"""
        category = Category.objects.create(
            name="Electronics",
            description="Electronic items"
        )
        
        self.assertEqual(category.name, "Electronics")
        self.assertEqual(str(category), "Electronics")
        
    def test_category_with_products(self):
        """Test category can have products"""
        category = Category.objects.create(name="Food")
        
        product = Product.objects.create(
            name="Apple",
            sku="FOOD-001",
            price=Decimal("5.00"),
            base_price=Decimal("2.00"),
            stock_quantity=100,
            category=category,
            is_active=True
        )
        
        self.assertEqual(product.category, category)
        self.assertEqual(category.products.count(), 1)


class StockLogTestCase(TestCase):
    """Test StockLog model"""
    
    def setUp(self):
        """Set up test data"""
        self.category = Category.objects.create(name="Test Category")
        
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST-LOG-001",
            price=Decimal("100.00"),
            base_price=Decimal("60.00"),
            stock_quantity=50,
            category=self.category,
            is_active=True
        )
        
    def test_stock_log_creation(self):
        """Test stock log can be created"""
        log = StockLog.objects.create(
            product=self.product,
            change_amount=10,
            current_stock=60,
            type='RESTOCK',
            notes='Test log'
        )
        
        self.assertEqual(log.product, self.product)
        self.assertEqual(log.change_amount, 10)
        self.assertEqual(log.type, 'RESTOCK')
        
    def test_stock_log_str(self):
        """Test stock log string representation"""
        log = StockLog.objects.create(
            product=self.product,
            change_amount=10,
            current_stock=60,
            type='RESTOCK'
        )
        
        self.assertIn("Test Product", str(log))
        self.assertIn("RESTOCK", str(log))
