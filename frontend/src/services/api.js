import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://debbie-postinfective-claris.ngrok-free.dev/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Response interceptor to handle paginated responses
api.interceptors.response.use(
  (response) => {
    // Check if response has pagination format
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      // Return just the results array for list endpoints
      return {
        ...response,
        data: response.data.results,
      };
    }
    return response;
  },
  (error) => Promise.reject(error)
);

// Inventory/Products API
export const productsAPI = {
  getAll: () => api.get('/inventory/products/'),
  getById: (id) => api.get(`/inventory/products/${id}/`),
  create: (data) => api.post('/inventory/products/', data),
  update: (id, data) => api.put(`/inventory/products/${id}/`, data),
  delete: (id) => api.delete(`/inventory/products/${id}/`),
  lookup: (sku) => api.get('/inventory/products/lookup/', { params: { sku } }),
  restock: (data) => api.post('/inventory/restock/', data),
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
  // PDF Report Endpoints
  getDailyReportPDF: (date) => api.get('/sales/report/daily/pdf/', { params: { date }, responseType: 'blob' }),
  getMonthlyReportPDF: (year, month) => api.get('/sales/report/monthly/pdf/', { params: { year, month }, responseType: 'blob' }),
  getYearlyReportPDF: (year) => api.get('/sales/report/yearly/pdf/', { params: { year }, responseType: 'blob' }),
  getRangeReportPDF: (start, end) => api.get('/sales/report/range/pdf/', { params: { start, end }, responseType: 'blob' }),
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

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/inventory/notifications/'),
};

export default api;
