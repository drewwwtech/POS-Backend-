# Deployment Guide for Modern POS System

This guide covers multiple deployment options to let your members access the POS system.

---

## Option 1: Local Network Deployment (Quickest - Same Office/Location)

### Prerequisites
- One computer to act as the server
- All members must be on the same WiFi network

### Steps

#### 1. Install PostgreSQL (if not already installed)
- Download from https://www.postgresql.org/download/windows/
- During installation, set password for user `postgres` to `admin123`
- Make sure PostgreSQL is running as a service

#### 2. Create the Database
```bash
# Open pgAdmin or psql and run:
CREATE DATABASE pos_db;
```

#### 3. Update Settings for Network Access
Edit `core/settings.py`:
```python
ALLOWED_HOSTS = ['*']  # Already set - good for local network
```

#### 4. Run Migrations
```bash
cd c:\Users\Andrew Valerio\OneDrive\Documents\VSCODE\IPT\Backend
python manage.py migrate
```

#### 5. Start the Backend Server
```bash
python manage.py runserver 0.0.0.0:8000
```

#### 6. Start the Frontend (on the same computer)
```bash
cd frontend
npm start
```

#### 7. Find Your Local IP Address
```cmd
ipconfig
```
Look for IPv4 Address (e.g., `192.168.1.100`)

#### 8. Access from Other Computers
Members can access the frontend at:
```
http://192.168.1.100:3000
```

**Note**: You'll need to update the frontend API configuration to point to your server's IP. Edit `frontend/src/services/api.js`:
```javascript
const API_BASE_URL = 'http://192.168.1.100:8000/api';
```

---

## Option 2: Cloud Deployment (Accessible Anywhere)

### Option 2A: Render.com (Free Tier - Recommended)

#### Backend Deployment
1. Create account at https://render.com
2. Connect your GitHub repository
3. Create a new Web Service:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn core.wsgi:application`
4. Add environment variables:
   - `SECRET_KEY`: Generate a secure key
   - `DEBUG`: `False`
   - `DB_PASSWORD`: Your database password
   - `EMAIL_HOST_USER`: Your Gmail
   - `EMAIL_HOST_PASSWORD`: Your App Password
5. Create a PostgreSQL database on Render

#### Frontend Deployment
1. Create a Static Site on Render
2. Connect to your GitHub
3. Build Command: `npm run build`
4. Publish Directory: `frontend/build`

### Option 2B: Railway.app (Pay-as-you-go)

1. Create account at https://railway.app
2. Connect GitHub repo
3. Create new project → Deploy from GitHub repo
4. Add PostgreSQL plugin
5. Set environment variables in Railway dashboard

### Option 2C: PythonAnywhere (Easiest for Beginners)

1. Create account at https://www.pythonanywhere.com
2. Upload your code via Files tab
3. Go to Web tab → Add a new web app
4. Configure WSGI file
5. Set up database in the Consoles tab
6. Run migrations

---

## Option 3: Quick Test with ngrok (Tunnel to Local)

For quick testing without cloud deployment:

```bash
# Install ngrok
# Download from https://ngrok.com/download

# Start backend
python manage.py runserver 8000

# In another terminal, create tunnel
ngrok http 8000

# You'll get a URL like https://abc123.ngrok.io
# Share this URL with members!
```

---

## Production Checklist

Before deploying to production, update `core/settings.py`:

```python
DEBUG = os.getenv('DEBUG') == 'True'  # Set to False

# Change this to your actual domain in production
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # Change from AllowAny
    ],
    ...
}
```

---

## Troubleshooting

### CORS Issues
If members can't access from other computers, ensure:
- Windows Firewall allows Python through
- Your router allows port 3000 and 8000

### Database Connection Error
- Verify PostgreSQL is running
- Check credentials in `.env` file
- Ensure database `pos_db` exists

### Static Files Not Loading
```bash
python manage.py collectstatic
```

---

## Need Help?

Contact: Jaycee Marco (EMAIL_HOST_USER from .env)
