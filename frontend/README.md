# POS Frontend

A React frontend for testing the Django POS backend.

## Prerequisites

- Node.js 14+
- npm or yarn
- Django backend running on localhost:8000

## Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The app will open at http://localhost:3000

## Features

- **Dashboard**: View sales statistics, recent sales, top products, and upcoming deliveries
- **Point of Sale**: Browse products, add to cart, and process checkout
- **Products Management**: Add, edit, and delete products
- **Delivery Calendar**: View deliveries in calendar format with date navigation

## API Endpoints

The frontend connects to the following Django backend endpoints:

- `GET/POST /api/inventory/products/` - Products CRUD
- `GET/POST /api/sales/` - Sales operations
- `GET /api/sales/dashboard/` - Dashboard statistics
- `GET /api/deliveries/` - All deliveries
- `GET /api/deliveries/calendar/` - Calendar data

## Configuration

By default, the frontend connects to `http://localhost:8000`. To change the backend URL, set the environment variable:

```bash
REACT_APP_API_URL=http://your-backend-url npm start
```

Or update the `proxy` field in `package.json` (for development only).
