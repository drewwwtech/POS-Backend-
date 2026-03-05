# Step-by-Step Railway Deployment Guide

## Step 1: Create Railway Account
1. Go to https://railway.app
2. Click "Sign Up" and create your account
3. Connect your GitHub account when prompted

## Step 2: Deploy Your Project
1. After logging in, click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your "POS-Backend-" repository
4. Railway will automatically detect your Django and React setup

## Step 3: Configure Environment Variables
In the Railway dashboard, go to your project settings and add these environment variables:

```
SECRET_KEY=your-secret-key-here (generate a secure key)
DEBUG=False
DB_PASSWORD=your-postgres-password
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=alerts@yourdomain.com
```

## Step 4: Add PostgreSQL Database
1. In your Railway project, click "New" → "Add PostgreSQL"
2. Railway will automatically configure the database connection
3. The database URL will be automatically set as an environment variable

## Step 5: Configure Services
Railway should automatically detect and create two services:
- **Backend**: Django API service
- **Frontend**: React static site

### For Backend Service:
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn core.wsgi:application`

### For Frontend Service:
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/build`

## Step 6: Deploy
1. Click "Deploy" in the Railway dashboard
2. Railway will automatically build and deploy your application
3. Wait for the deployment to complete (usually 5-10 minutes)

**Yes! After adding environment variables, click "Deploy"** ✅

## Step 7: Post-Deployment Setup
Once deployed, you need to run some commands:

1. **Open Railway Console**:
   - In your project, click "Console" or "SSH"
   - This opens a terminal to your deployed application

2. **Run Database Migrations**:
   ```bash
   python manage.py migrate
   ```

3. **Create Superuser**:
   ```bash
   python manage.py createsuperuser
   ```
   - Enter username, email, and password when prompted

## Step 8: Update Frontend API URL
After deployment, you'll get a backend URL like `https://your-app.up.railway.app`

Update the frontend API configuration:
1. Edit `frontend/src/services/api.js`
2. Change the API_BASE_URL to your Railway backend URL
3. Rebuild and redeploy the frontend

## Step 9: Access Your Application
- **Backend API**: `https://your-app.up.railway.app/api/`
- **Frontend**: `https://your-frontend.up.railway.app`
- **Admin Panel**: `https://your-app.up.railway.app/admin/`

## Troubleshooting

### Common Issues:
1. **Database Connection**: Ensure PostgreSQL plugin is installed
2. **Environment Variables**: Double-check all required variables are set
3. **Build Failures**: Check Railway logs for specific error messages
4. **Migration Errors**: Run migrations manually via Railway console

### Getting Help:
- Railway Documentation: https://docs.railway.app
- Railway Community: https://community.railway.app

## Next Steps
1. Test your application thoroughly
2. Consider setting up a custom domain
3. Configure SSL/HTTPS (Railway provides this automatically)
4. Set up monitoring and alerts