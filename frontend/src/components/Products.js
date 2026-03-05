import React, { useState, useEffect, useRef } from 'react';
import { productsAPI, categoriesAPI } from '../services/api';

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    base_price: '',
    stock_quantity: '',
    category: '',
    description: '',
    is_active: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
  });

  // Scanner state
  const [scannerSku, setScannerSku] = useState('');
  const [scannerLoading, setScannerLoading] = useState(false);
  const [foundProduct, setFoundProduct] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [toast, setToast] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-focus scanner on load
  useEffect(() => {
    if (scannerRef.current) {
      scannerRef.current.focus();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        productsAPI.getAll().catch(() => ({ data: [] })),
        categoriesAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Scanner: lookup SKU on Enter
  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    const sku = scannerSku.trim();
    if (!sku) return;

    setScannerLoading(true);
    setFoundProduct(null);
    setError(null);

    try {
      const res = await productsAPI.lookup(sku);
      if (res.data.found) {
        setFoundProduct(res.data.product);
        setRestockQty('');
        setRestockNotes('');
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Product not found — open Add Product modal with SKU pre-filled
        openModal(null, sku);
        setScannerSku('');
      } else {
        setError('Scanner error: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setScannerLoading(false);
    }
  };

  // Restock submit
  const handleRestock = async () => {
    const qty = parseInt(restockQty);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity (must be at least 1)');
      return;
    }

    try {
      const res = await productsAPI.restock({
        sku: foundProduct.sku,
        quantity_added: qty,
        notes: restockNotes || '',
      });
      showToast(`✅ Restocked ${foundProduct.name}! New stock: ${res.data.new_total_stock}`);
      // Clear scanner
      setFoundProduct(null);
      setScannerSku('');
      setRestockQty('');
      setRestockNotes('');
      setError(null);
      fetchData();
      // Re-focus scanner for next scan
      if (scannerRef.current) scannerRef.current.focus();
    } catch (err) {
      setError('Restock failed: ' + (err.response?.data?.sku || err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
    }
  };

  // Cancel scanner panel
  const cancelScanner = () => {
    setFoundProduct(null);
    setScannerSku('');
    setRestockQty('');
    setRestockNotes('');
    setError(null);
    if (scannerRef.current) scannerRef.current.focus();
  };

  const openModal = (product = null, prefilledSku = '') => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        price: product.price || '',
        base_price: product.base_price || '',
        stock_quantity: product.stock_quantity || '',
        category: product.category || '',
        description: product.description || '',
        is_active: product.is_active !== false,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: prefilledSku || '',
        price: '',
        base_price: '',
        stock_quantity: '',
        category: '',
        description: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setError(null);
  };

  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name || '',
        description: category.description || '',
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        description: '',
      });
    }
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setError(null);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    
    if (!categoryFormData.name.trim()) {
      setError('Category name is required');
      return;
    }
    
    try {
      const data = {
        name: categoryFormData.name.trim(),
        description: categoryFormData.description.trim(),
      };

      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, data);
        showToast(`✅ Updated category: ${data.name}`);
      } else {
        await categoriesAPI.create(data);
        showToast(`✅ Created category: ${data.name}`);
      }

      closeCategoryModal();
      fetchData();
    } catch (err) {
      setError('Failed to save category: ' + (err.response?.data?.name || err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
      console.error(err);
    }
  };

  const handleCategoryDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? This will not delete products assigned to it.')) {
      return;
    }
    try {
      await categoriesAPI.delete(id);
      fetchData();
    } catch (err) {
      setError('Failed to delete category');
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate prices are positive
    const price = parseFloat(formData.price);
    const basePrice = parseFloat(formData.base_price);
    
    if (isNaN(price) || price < 0) {
      setError('Selling price must be a positive number');
      return;
    }
    
    if (isNaN(basePrice) || basePrice < 0) {
      setError('Base price (cost) must be a positive number');
      return;
    }
    
    try {
      const data = {
        name: formData.name,
        sku: formData.sku || undefined,
        price: price,
        base_price: basePrice,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category: formData.category ? parseInt(formData.category) : null,
        description: formData.description,
        is_active: formData.is_active,
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, data);
        showToast(`✅ Updated ${data.name}`);
      } else {
        await productsAPI.create(data);
        showToast(`✅ Created ${data.name}`);
      }

      closeModal();
      fetchData();
    } catch (err) {
      setError('Failed to save product: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    try {
      await productsAPI.delete(id);
      fetchData();
    } catch (err) {
      setError('Failed to delete product');
      console.error(err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === parseInt(filterCategory);
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Products</h1>
        <p>Manage your product inventory</p>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* SKU Scanner Section */}
      <div className="scanner-section">
        <div className="scanner-header">
          <i className="fas fa-barcode"></i>
          <h3>SKU Scanner / Stock In</h3>
        </div>
        <form onSubmit={handleScannerSubmit} className="scanner-form">
          <div className="scanner-input-wrapper">
            <i className="fas fa-search"></i>
            <input
              ref={scannerRef}
              type="text"
              className="scanner-input"
              placeholder="Scan barcode or type SKU and press Enter..."
              value={scannerSku}
              onChange={(e) => setScannerSku(e.target.value)}
              disabled={scannerLoading}
            />
            {scannerLoading && <div className="scanner-spinner"></div>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={scannerLoading || !scannerSku.trim()}>
            <i className="fas fa-search"></i> Lookup
          </button>
        </form>

        {/* Stock In Panel — shown when product is found */}
        {foundProduct && (
          <div className="stock-in-panel">
            <div className="stock-in-header">
              <h4><i className="fas fa-box-open"></i> Stock In: {foundProduct.name}</h4>
              <span className={`status ${foundProduct.is_active ? 'active' : 'inactive'}`}>
                {foundProduct.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="stock-in-details">
              <div className="detail-item">
                <label>SKU</label>
                <span>{foundProduct.sku}</span>
              </div>
              <div className="detail-item">
                <label>Category</label>
                <span>{getCategoryName(foundProduct.category)}</span>
              </div>
              <div className="detail-item">
                <label>Base Price</label>
                <span>{formatCurrency(foundProduct.base_price)}</span>
              </div>
              <div className="detail-item">
                <label>Selling Price</label>
                <span style={{ fontWeight: 'bold', color: '#4a90e2' }}>
                  {formatCurrency(foundProduct.price)}
                </span>
              </div>
              <div className="detail-item">
                <label>Current Stock</label>
                <span style={{
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  color: foundProduct.stock_quantity <= 0 ? '#fc8181' :
                    foundProduct.stock_quantity <= 10 ? '#f39c12' : '#48bb78'
                }}>
                  {foundProduct.stock_quantity}
                </span>
              </div>
              <div className="detail-item">
                <label>Profit Margin</label>
                <span style={{ color: '#48bb78', fontWeight: 'bold' }}>
                  {foundProduct.profit_margin ? foundProduct.profit_margin.toFixed(1) : 0}%
                </span>
              </div>
            </div>

            <div className="stock-in-form">
              <div className="stock-in-qty-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Quantity to Add *</label>
                  <input
                    type="number"
                    className="form-control stock-in-qty-input"
                    placeholder="Enter quantity..."
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    min="1"
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Notes (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Delivery from supplier X"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="stock-in-actions">
                <button className="btn btn-secondary" onClick={cancelScanner}>
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleRestock}
                  disabled={!restockQty || parseInt(restockQty) <= 0}
                >
                  <i className="fas fa-plus-circle"></i> Stock In
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: '300px' }}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => openCategoryModal()} style={{ whiteSpace: 'nowrap' }}>
            <i className="fas fa-plus"></i> Add Category
          </button>
          <button className="btn btn-success" onClick={() => openModal()} style={{ whiteSpace: 'nowrap' }}>
            <i className="fas fa-plus"></i> Add Product
          </button>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: '10px' }}>{error}</div>}

      <div className="products-table-container">
        {filteredProducts.length === 0 ? (
          <p className="empty-state">No products found</p>
        ) : (
          <table id="products-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Selling Price</th>
                <th>Stock</th>
                <th>Profit Margin</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>
                    <strong>{product.name}</strong>
                    {product.description && (
                      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                        {product.description.substring(0, 50)}
                        {product.description.length > 50 ? '...' : ''}
                      </p>
                    )}
                  </td>
                  <td>{product.sku}</td>
                  <td>{getCategoryName(product.category)}</td>
                  <td>{formatCurrency(product.base_price || 0)}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(product.price || 0)}</td>
                  <td style={{
                    fontWeight: 'bold',
                    color: product.stock_quantity <= 0 ? '#fc8181' :
                      product.stock_quantity <= 10 ? '#f39c12' : '#48bb78'
                  }}>{product.stock_quantity}</td>
                  <td style={{
                    fontWeight: 'bold',
                    color: (product.profit_margin || 0) > 0 ? '#48bb78' :
                      (product.profit_margin || 0) < 0 ? '#fc8181' : '#f39c12'
                  }}>{product.profit_margin ? product.profit_margin.toFixed(1) : 0}%</td>
                  <td>
                    <span className={`status ${product.is_active ? 'active' : 'inactive'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-primary" onClick={() => openModal(product)} style={{ marginRight: '8px' }}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(product.id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>SKU *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Unique SKU code"
                  required
                />
                {formData.sku && !editingProduct && (
                  <small style={{ color: '#4a90e2', marginTop: '4px', display: 'block' }}>
                    <i className="fas fa-barcode"></i> SKU pre-filled from scanner
                  </small>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Base Price (Cost) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    placeholder="Cost price"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Selling Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Selling price"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  className="form-control"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={closeCategoryModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button className="modal-close" onClick={closeCategoryModal}>×</button>
            </div>
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  rows="3"
                  placeholder="Optional description for this category"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeCategoryModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
