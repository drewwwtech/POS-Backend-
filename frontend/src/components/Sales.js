import React, { useState, useEffect } from 'react';
import { salesAPI, productsAPI } from '../services/api';

function Sales() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, salesRes] = await Promise.all([
        productsAPI.getAll().catch(() => ({ data: [] })),
        salesAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setProducts(productsRes.data || []);
      setRecentSales((salesRes.data || []).slice(0, 10));
      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.product === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          maxStock: product.stock_quantity,
        },
      ]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      const item = cart.find(i => i.product === productId);
      if (item && quantity > item.maxStock) {
        alert(`Only ${item.maxStock} available in stock!`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.product === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setProcessing(true);
    try {
      const saleData = {
        items: cart.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        total_amount: calculateTotal(),
      };

      await salesAPI.create(saleData);
      clearCart();
      fetchData();
      alert('Sale completed successfully!');
    } catch (err) {
      setError('Failed to process sale: ' + (err.response?.data?.detail || err.message));
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // Get available stock (stock minus quantity in cart)
  const getAvailableStock = (productId) => {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(c => c.product === productId);
    if (!product) return 0;
    return product.stock_quantity - (cartItem ? cartItem.quantity : 0);
  };

  const filteredProducts = products.filter((product) =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get flattened recent sale items
  const getRecentSaleItems = () => {
    const items = [];
    recentSales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          items.push({
            saleId: sale.id,
            date: sale.created_at || sale.timestamp,
            productName: item.product_name || item.name || 'Unknown Product',
            quantity: item.quantity,
            itemTotal: (item.quantity || 0) * (item.unit_price || 0),
          });
        });
      }
    });
    return items.slice(0, 10);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'N/A';
    }
  };

  if (loading) {
    return <div className="loading">Loading POS...</div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Point of Sale</h1>
        <p>Process sales transactions</p>
      </header>

      {error && <div className="error" style={{ background: '#fee', color: '#c00', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>{error}</div>}

      <div className="pos-container">
        {/* Products Grid */}
        <div className="products-section">
          <h3>Products</h3>
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="products-grid">
            {filteredProducts.map((product) => {
              const availableStock = getAvailableStock(product.id);
              return (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => addToCart(product)}
                >
                  <h4>{product.name}</h4>
                  <p className="price">{formatCurrency(product.price)}</p>
                  <p className="stock-info" style={{ 
                    color: availableStock <= 0 ? '#e74c3c' : availableStock <= 3 ? '#f39c12' : 'var(--secondary-text)'
                  }}>
                    {availableStock <= 0 ? 'Out of Stock' : `Stock: ${availableStock}`}
                  </p>
                  <button 
                    className="add-to-cart" 
                    disabled={availableStock <= 0}
                    style={{ background: availableStock <= 0 ? '#6c757d' : '#48bb78' }}
                  >
                    {availableStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <p className="empty-state">No products found</p>
          )}
        </div>

        {/* Cart */}
        <div className="cart-section">
          <h2>Cart</h2>
          <div className="cart-items">
            {cart.length === 0 ? (
              <p className="empty-cart" style={{ fontStyle: 'italic', textAlign: 'center', padding: '40px', color: '#adb5bd' }}>Cart is Empty</p>
            ) : (
              cart.map((item) => (
                <div key={item.product} className="cart-item">
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <p>{formatCurrency(item.price)} x {item.quantity}</p>
                  </div>
                  <div className="cart-item-controls">
                    <button className="cart-qty-btn" onClick={() => updateQuantity(item.product, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button className="cart-qty-btn" onClick={() => updateQuantity(item.product, item.quantity + 1)}>+</button>
                    <button className="btn-remove" onClick={() => removeFromCart(item.product)}>×</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="cart-summary">
            <div className="total">
              <span>Total:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
            <div className="action-buttons" style={{ justifyContent: 'center', display: 'flex', gap: '10px' }}>
              <button className="btn btn-danger" onClick={clearCart} style={{ flex: '1', justifyContent: 'center' }}>Clear</button>
              <button className="btn btn-success" onClick={handleCheckout} disabled={processing} style={{ flex: '1', justifyContent: 'center' }}>
                {processing ? 'Processing...' : 'Checkout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Recent Sales</h2>
        <div className="table-container">
          {getRecentSaleItems().length === 0 ? (
            <p className="empty-state">No sales yet</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product Name</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {getRecentSaleItems().map((item, index) => (
                  <tr key={`${item.saleId}-${index}`}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.productName}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.itemTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sales;
