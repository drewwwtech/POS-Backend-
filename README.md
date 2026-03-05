# Modern POS System - Railway Deployment Guide

This is a modern Point of Sale (POS) system built with Django REST Framework and React, now configured for Railway deployment.

## System Overview

- **Backend**: Django REST Framework API
- **Frontend**: React application
- **Database**: PostgreSQL
- **Deployment**: Railway.app

## Railway Deployment

### Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository connected to Railway
3. PostgreSQL database

### Environment Variables

Set these environment variables in Railway dashboard:

```
SECRET_KEY=your-secret-key-here
DEBUG=False
DB_PASSWORD=your-postgres-password
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=alerts@yourdomain.com
```

### Database Setup

1. Add PostgreSQL plugin in Railway
2. Railway will automatically set database connection variables
3. Update `DATABASES` configuration in `core/settings.py` if needed

### Build Commands

**Backend (Python Service):**
```
Build Command: pip install -r requirements.txt
Start Command: gunicorn core.wsgi:application
```

**Frontend (Static Site):**
```
Build Command: cd frontend && npm install && npm run build
Publish Directory: frontend/build
```

### Deployment Steps

1. **Connect Repository**: Link your GitHub repo to Railway
2. **Create Services**: Railway will auto-detect and create services
3. **Configure Environment**: Set environment variables in Railway dashboard
4. **Add Database**: Install PostgreSQL plugin
5. **Deploy**: Railway will automatically deploy on git push

### Post-Deployment

1. **Run Migrations**: 
   ```bash
   railway ssh
   python manage.py migrate
   ```

2. **Create Superuser**:
   ```bash
   python manage.py createsuperuser
   ```

3. **Update API URL**: Update frontend API configuration to point to your Railway backend URL

## Project Structure

```
├── core/                    # Django project settings
├── inventory/              # Product and stock management
├── sales/                  # Sales and reporting
├── delivery/               # Delivery management
├── frontend/               # React application
├── Procfile               # Railway process file
├── runtime.txt            # Python version
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Features

- **Inventory Management**: Product catalog, stock tracking, categories
- **Sales Processing**: POS interface, sales history, dashboard
- **Delivery Management**: Delivery scheduling, tracking, calendar view
- **Reporting**: Daily, monthly, yearly sales reports
- **Email Notifications**: Automated alerts and reports

## Development

### Local Development

1. **Backend**:
   ```bash
   python manage.py runserver
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm start
   ```

### Production Notes

- Set `DEBUG=False` in production
- Change REST_FRAMEWORK permissions from `AllowAny` to `IsAuthenticated`
- Configure proper CORS settings for your domain
- Set up SSL/HTTPS

## Support

For deployment issues or questions, check the Railway documentation or contact the development team.