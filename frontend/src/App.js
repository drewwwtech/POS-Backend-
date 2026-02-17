import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Sales from './components/Sales';
import DeliveryCalendar from './components/DeliveryCalendar';
import Reports from './components/Reports';

function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <i className="fas fa-store"></i>
        <span>JCM</span>
      </div>
      <nav>
        <Link to="/" className={`nav-item ${isActive('/')}`}>
          <i className="fas fa-th-large"></i>
          <span>Dashboard</span>
        </Link>
        <Link to="/sales" className={`nav-item ${isActive('/sales')}`}>
          <i className="fas fa-cash-register"></i>
          <span>POS Sales</span>
        </Link>
        <Link to="/products" className={`nav-item ${isActive('/products')}`}>
          <i className="fas fa-boxes"></i>
          <span>Products</span>
        </Link>
        <Link to="/deliveries" className={`nav-item ${isActive('/deliveries')}`}>
          <i className="fas fa-truck"></i>
          <span>Deliveries</span>
        </Link>
        <Link to="/reports" className={`nav-item ${isActive('/reports')}`}>
          <i className="fas fa-chart-bar"></i>
          <span>Reports</span>
        </Link>
      </nav>
    </aside>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/products" element={<Products />} />
            <Route path="/deliveries" element={<DeliveryCalendar />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
