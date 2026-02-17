# Sales Report System Architecture

## Overview
A new "Reports" tab to view and analyze sales data by Day, Month, Year with filtering and analytics.

---

## 1. Database Schema (No changes needed)
- Use existing `Sale` and `SaleItem` models
- `Sale.timestamp` - already stores date/time of sale

---

## 2. Backend API Endpoints

### New Endpoints (Django REST Framework)

```
GET /api/sales/report/daily/?date=2026-02-14
GET /api/sales/report/monthly/?year=2026&month=2
GET /api/sales/report/yearly/?year=2026
GET /api/sales/report/range/?start=2026-01-01&end=2026-02-14
```

**Response for Daily:**
```json
{
  "date": "2026-02-14",
  "total_sales": 15000.00,
  "transaction_count": 25,
  "items_sold": [
    {"product_name": "Product A", "quantity": 10, "total": 1000},
    {"product_name": "Product B", "quantity": 5, "total": 500}
  ],
  "top_products": [
    {"product_name": "Product A", "quantity": 10}
  ],
  "hourly_breakdown": [
    {"hour": 9, "total": 500},
    {"hour": 10, "total": 1200}
  ]
}
```

**Response for Monthly:**
```json
{
  "year": 2026,
  "month": 2,
  "total_sales": 150000.00,
  "transaction_count": 250,
  "daily_average": 5357.14,
  "best_day": {"date": "2026-02-10", "total": 25000},
  "daily_breakdown": [
    {"date": "2026-02-01", "total": 5000, "count": 10},
    {"date": "2026-02-02", "total": 6200, "count": 12}
  ]
}
```

**Response for Yearly:**
```json
{
  "year": 2026,
  "total_sales": 1800000.00,
  "transaction_count": 3000,
  "monthly_average": 150000.00,
  "best_month": {"month": 1, "total": 250000},
  "monthly_breakdown": [
    {"month": 1, "total": 250000, "count": 500},
    {"month": 2, "total": 180000, "count": 350}
  ]
}
```

---

## 3. Frontend Structure

### New Tab: Reports
```
/reports
```

**Page Sections:**

1. **Date Filter Bar**
   - Tab options: Daily | Monthly | Yearly | Custom Range
   - Date pickers based on selected tab
   - "Apply" button

2. **Summary Cards**
   - Total Sales (₱)
   - Transaction Count
   - Average per Transaction
   - Top Product

3. **Charts (Optional - if using chart library)**
   - Sales trend line chart
   - Top products bar chart

4. **Detailed Table**
   - Product-wise sales breakdown
   - Sortable columns

---

## 4. File Changes Required

### Backend:
- `sales/views.py` - Add new API view classes
- `sales/urls.py` - Add new URL patterns

### Frontend:
- `frontend/src/components/Reports.js` - New component
- `frontend/src/services/api.js` - Add API methods
- `frontend/src/App.js` - Add route

---

## 5. Dashboard Changes

**Option A: Daily-Only Dashboard**
- Show only today's data by default
- Add "View All Time" toggle

**Option B: Dashboard with Date Filter**
- Keep current dashboard
- Add date range selector at top
- Default to today

---

## 6. Implementation Priority

1. **Backend API** - Create endpoints first
2. **Frontend Reports Tab** - New page with filters
3. **Dashboard Update** - Reset to show today's data
4. **Charts** - Optional enhancement

---

## Recommendation

I suggest **Option B** for dashboard:
- Keep current summary cards but make them date-aware
- Add date filter dropdown (Today | This Week | This Month | All Time)
- New Reports tab for detailed analysis

This way:
- Dashboard gives quick daily overview
- Reports tab provides deep analytics
