import React, { useState, useEffect } from 'react';
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
    stock_quantity: '',
    category: '',
    description: '',
    is_active: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    fetchData();
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

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        base_price: product.base_price || '',
        price_to_sell: product.price_to_sell || '',
        stock_quantity: product.stock_quantity || '',
        category: product.category || '',
        description: product.description || '',
        is_active: product.is_active !== false,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        base_price: '',
        price_to_sell: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        sku: formData.sku || undefined,
        price: parseFloat(formData.price_to_sell) || 0,
        base_price: parseFloat(formData.base_price) || 0,
        price_to_sell: formData.price_to_sell ? parseFloat(formData.price_to_sell) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category: formData.category ? parseInt(formData.category) : null,
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, data);
      } else {
        await productsAPI.create(data);
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
        <button className="btn btn-success" onClick={() => openModal()} style={{ whiteSpace: 'nowrap' }}>
          <i className="fas fa-plus"></i> Add Product
        </button>
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
                <th>Price to Sell</th>
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
                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(product.price_to_sell || product.price || 0)}</td>
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

      {/* Modal */}
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
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Base Price (Cost) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    placeholder="Cost price"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price to Sell *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.price_to_sell}
                    onChange={(e) => setFormData({ ...formData, price_to_sell: e.target.value })}
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
    </div>
  );
}

export default Products;
