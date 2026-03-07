import React, { useState, useEffect } from 'react';
import { salesAPI, productsAPI, deliveriesAPI } from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination - Recent Sales
  const [salesCurrentPage, setSalesCurrentPage] = useState(1);
  const SALES_PER_PAGE = 10;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, salesRes, productsRes, deliveriesRes, chartRes] = await Promise.all([
        salesAPI.getDashboard().catch(() => ({ data: null })),
        salesAPI.getAll().catch(() => ({ data: [] })),
        productsAPI.getAll().catch(() => ({ data: [] })),
        deliveriesAPI.getAll().catch(() => ({ data: [] })),
        salesAPI.getSalesChart().catch(() => ({ data: null })),
      ]);

      setDashboardData(dashboardRes.data);
      setRecentSales(salesRes.data || []);
      setProducts(productsRes.data || []);
      setUpcomingDeliveries(deliveriesRes.data?.slice(0, 5) || []);

      // Set chart data
      if (chartRes.data) {
        setChartData({
          labels: chartRes.data.labels || [],
          datasets: [
            {
              label: 'Daily Sales (PHP)',
              data: chartRes.data.revenues || [],
              borderColor: 'transparent',
              backgroundColor: 'rgba(74, 144, 226, 0.6)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: '#4a90e2',
            },
          ],
        });
      }
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '-';
    }
  };

  // Get flattened recent sale items
  const getAllRecentSaleItems = () => {
    const items = [];
    recentSales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          items.push({
            saleId: sale.id,
            date: sale.created_at || sale.timestamp,
            productName: item.product_name || item.name || 'Unknown Product',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            itemTotal: (item.quantity || 0) * (item.unit_price || 0),
          });
        });
      }
    });
    return items;
  };

  // Pagination calculations - Recent Sales
  const allRecentItems = getAllRecentSaleItems();
  const salesTotalPages = Math.ceil(allRecentItems.length / SALES_PER_PAGE);
  const paginatedSales = allRecentItems.slice(
    (salesCurrentPage - 1) * SALES_PER_PAGE,
    salesCurrentPage * SALES_PER_PAGE
  );

  const getSalesPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (salesTotalPages <= maxVisible) {
      for (let i = 1; i <= salesTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (salesCurrentPage > 3) pages.push('...');
      const start = Math.max(2, salesCurrentPage - 1);
      const end = Math.min(salesTotalPages - 1, salesCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (salesCurrentPage < salesTotalPages - 2) pages.push('...');
      pages.push(salesTotalPages);
    }
    return pages;
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your store overview</p>
      </header>

      {/* Stats Cards - 6 cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3><i className="fas fa-peso-sign" style={{ color: '#ffffff' }}></i> Today's Sales</h3>
          <p className="stat-value">{formatCurrency(dashboardData?.business_health?.total_revenue || 0)}</p>
        </div>
        <div className="stat-card">
          <h3><i className="fas fa-receipt" style={{ color: '#3b82f6' }}></i> Transactions</h3>
          <p className="stat-value">{dashboardData?.business_health?.total_transactions || 0}</p>
        </div>
        <div className="stat-card">
          <h3><i className="fas fa-calendar-alt" style={{ color: '#9b59b6' }}></i> Monthly Sales</h3>
          <p className="stat-value">{formatCurrency(dashboardData?.month_sales?.total_revenue || 0)}</p>
        </div>
        <div className="stat-card">
          <h3><i className="fas fa-chart-line" style={{ color: '#2ecc71' }}></i> Yearly Sales</h3>
          <p className="stat-value">{formatCurrency(dashboardData?.year_sales?.total_revenue || 0)}</p>
        </div>
        <div className="stat-card">
          <h3><i className="fas fa-exclamation-triangle" style={{ color: '#e74c3c' }}></i> Low Stock</h3>
          <p className="stat-value">{dashboardData?.inventory_alerts?.low_stock_count || 0}</p>
        </div>
        <div className="stat-card">
          <h3><i className="fas fa-clock" style={{ color: '#f39c12' }}></i> Pending Deliveries</h3>
          <p className="stat-value">{dashboardData?.pending_deliveries?.count || 0}</p>
        </div>
      </div>

      {/* Sales Chart */}
      {chartData && (
        <div className="dashboard-section" style={{ marginTop: '20px' }}>
          <h2>Sales Trend (Last 30 Days)</h2>
          <div style={{ padding: '20px', background: '#252a30', borderRadius: '8px' }}>
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: {
                      color: '#f8f9fa'
                    }
                  }
                },
                scales: {
                  x: {
                    ticks: { color: '#adb5bd' },
                    grid: { color: '#3a3f45' }
                  },
                  y: {
                    ticks: { color: '#adb5bd' },
                    grid: { color: '#3a3f45' }
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Recent Sales</h2>
          <div className="table-container">
            {allRecentItems.length === 0 ? (
              <p className="empty-state">No recent sales</p>
            ) : (
              <table id="recent-sales-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product Name</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.map((item, index) => (
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

          {/* Pagination - Recent Sales */}
          {salesTotalPages > 1 && (
            <div className="txn-pagination">
              <span className="txn-pagination-info">
                Showing {((salesCurrentPage - 1) * SALES_PER_PAGE) + 1}–{Math.min(salesCurrentPage * SALES_PER_PAGE, allRecentItems.length)} of {allRecentItems.length}
              </span>
              <div className="txn-pagination-controls">
                <button
                  className="txn-page-btn"
                  disabled={salesCurrentPage === 1}
                  onClick={() => setSalesCurrentPage(1)}
                  title="First page"
                >
                  <i className="fas fa-angles-left"></i>
                </button>
                <button
                  className="txn-page-btn"
                  disabled={salesCurrentPage === 1}
                  onClick={() => setSalesCurrentPage(prev => prev - 1)}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                {getSalesPageNumbers().map((page, idx) => (
                  page === '...' ? (
                    <span key={`sales-ellipsis-${idx}`} className="txn-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={`sales-page-${page}`}
                      className={`txn-page-btn ${salesCurrentPage === page ? 'active' : ''}`}
                      onClick={() => setSalesCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )
                ))}
                <button
                  className="txn-page-btn"
                  disabled={salesCurrentPage === salesTotalPages}
                  onClick={() => setSalesCurrentPage(prev => prev + 1)}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
                <button
                  className="txn-page-btn"
                  disabled={salesCurrentPage === salesTotalPages}
                  onClick={() => setSalesCurrentPage(salesTotalPages)}
                  title="Last page"
                >
                  <i className="fas fa-angles-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Top Products</h2>
          <div className="table-container">
            {products.length === 0 ? (
              <p className="empty-state">No products yet</p>
            ) : (
              <table id="top-products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 5).map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td style={{
                        fontWeight: 'bold',
                        color: product.stock_quantity < 10 ? '#e74c3c' : '#4caf50'
                      }}>{product.stock_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Upcoming Deliveries</h2>
          <div className="table-container">
            {upcomingDeliveries.filter(d => d.status === 'PENDING').length === 0 ? (
              <p className="empty-state">No pending deliveries</p>
            ) : (
              <table id="upcoming-deliveries-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingDeliveries.filter(d => d.status === 'PENDING').map((delivery) => (
                    <tr key={delivery.id}>
                      <td>{delivery.supplier_name}</td>
                      <td>{delivery.delivery_date}</td>
                      <td><span className="status pending">{delivery.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Low Stock Alerts</h2>
          <div className="table-container">
            {(() => {
              const lowStockProducts = products.filter(p => p.stock_quantity < 10);
              return lowStockProducts.length === 0 ? (
                <p className="empty-state">No low stock items</p>
              ) : (
                <table id="low-stock-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>{product.stock_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
