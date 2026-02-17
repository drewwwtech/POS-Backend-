import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inventory/Products API
export const productsAPI = {
  getAll: () => api.get('/inventory/products/'),
  getById: (id) => api.get(`/inventory/products/${id}/`),
  create: (data) => api.post('/inventory/products/', data),
  update: (id, data) => api.put(`/inventory/products/${id}/`, data),
  delete: (id) => api.delete(`/inventory/products/${id}/`),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/inventory/categories/'),
  getById: (id) => api.get(`/inventory/categories/${id}/`),
  create: (data) => api.post('/inventory/categories/', data),
  update: (id, data) => api.put(`/inventory/categories/${id}/`, data),
  delete: (id) => api.delete(`/inventory/categories/${id}/`),
};

// Sales API
export const salesAPI = {
  getAll: () => api.get('/sales/'),
  getById: (id) => api.get(`/sales/${id}/`),
  create: (data) => api.post('/sales/', data),
  getDashboard: () => api.get('/sales/dashboard/'),
  getSalesChart: () => api.get('/sales/chart/'),
  // Sales Reports - using correct endpoints
  getDailyReport: (date) => api.get('/sales/report/daily/', { params: { date } }),
  getMonthlyReport: (year, month) => api.get('/sales/report/monthly/', { params: { year, month } }),
  getYearlyReport: (year) => api.get('/sales/report/yearly/', { params: { year } }),
  getRangeReport: (start, end) => api.get('/sales/report/range/', { params: { start, end } }),
};

// Deliveries API
export const deliveriesAPI = {
  getAll: () => api.get('/deliveries/'),
  getById: (id) => api.get(`/deliveries/${id}/`),
  create: (data) => api.post('/deliveries/', data),
  update: (id, data) => api.put(`/deliveries/${id}/`, data),
  delete: (id) => api.delete(`/deliveries/${id}/`),
  getCalendar: () => api.get('/deliveries/calendar/'),
  getPreview: (id) => api.get(`/deliveries/${id}/preview/`),
};

export default api;
