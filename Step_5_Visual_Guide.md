# Step 5: Configure Services - Visual Guide

## Where to Find Service Configuration

### Method 1: Through Project Dashboard

1. **Go to your Railway project dashboard**
   - You should see your project with services listed

2. **Look for your services**
   - You should see 2-3 services:
     - Your Django backend (might be called "Python", "Django", or your project name)
     - PostgreSQL database (already added)
     - Possibly a frontend service

3. **Click on your backend service**
   - Click the service name to open its details page
   - Look for tabs like "Settings", "Configure", or "Variables"

4. **Find the Commands section**
   - Look for "Commands", "Build", "Start", or similar
   - You should see fields for:
     - Build Command
     - Start Command

### Method 2: Through Settings Menu

1. **Click the Settings icon**
   - Look for a gear icon (⚙️) or "Settings" text
   - This is usually in the top-right of your project

2. **Select your service**
   - In settings, you should see a list of services
   - Click on your Django/backend service

3. **Configure commands**
   - Look for "Commands", "Build", or "Deploy" sections
   - Enter the commands there

### Method 3: Through Service Details

1. **Click on your service name**
   - In your project dashboard, click the name of your Django service
   - This opens the service details page

2. **Look for configuration options**
   - Look for tabs: "Overview", "Settings", "Variables", "Commands"
   - Click "Settings" or "Commands"

3. **Enter the commands**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn core.wsgi:application`

## What You Should See:

### Service Dashboard View:
```
┌─────────────────────────────────────────────────────────┐
│  Railway Project: POS-Backend-                          │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Django Backend │  │  PostgreSQL     │              │
│  │  (Python)       │  │  Database       │              │
│  │                 │  │                 │              │
│  │  Status: Running│  │  Status: Running│              │
│  │                 │  │                 │              │
│  │  [Settings]     │  │  [Settings]     │              │
│  │  [Console]      │  │  [Console]      │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  [Deploy]  [Variables]  [Logs]  [Settings]              │
└─────────────────────────────────────────────────────────┘
```

### Settings Page View:
```
┌─────────────────────────────────────────────────────────┐
│  Service Settings - Django Backend                      │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  General                                            │ │
│  │  Variables                                          │ │
│  │  Commands  ← Click this tab                         │ │
│  │  Deployments                                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  Commands Section:                                      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Build Command: [pip install -r requirements.txt]   │ │
│  │                                                     │ │
│  │  Start Command: [gunicorn core.wsgi:application]    │ │
│  │                                                     │ │
│  │  [Save]                                             │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Common Locations to Look:

### Location 1: Service List
- Look at the main project page
- Find your Django service in the list
- Click the service name
- Look for "Settings" or "Configure"

### Location 2: Top Navigation
- Look at the top of your project page
- Find tabs like: "Overview", "Services", "Settings"
- Click "Services" or "Settings"
- Find your Django service

### Location 3: Service Actions
- Click on your Django service
- Look for action buttons: "Settings", "Configure", "Edit"
- Click the settings/configure button

### Location 4: Three Dots Menu
- Look for three dots (⋯) next to your service
- Click the three dots
- Select "Settings" or "Configure"

## If You Still Can't Find It:

1. **Take a screenshot** of your Railway dashboard
2. **Look for these keywords**:
   - "Settings"
   - "Configure"
   - "Commands"
   - "Build"
   - "Start"
   - "Deploy"
   - "Variables"

3. **Check these areas**:
   - Top navigation bar
   - Service list page
   - Individual service pages
   - Project settings

## Need More Help?
- Railway Documentation: https://docs.railway.app/deploy/deployments
- Railway Support: https://community.railway.app

## Next Steps After Finding Settings:
1. ✅ Set Build Command: `pip install -r requirements.txt`
2. ✅ Set Start Command: `gunicorn core.wsgi:application`
3. ✅ Save settings
4. ✅ Configure frontend service (if separate)
5. ✅ Click "Deploy"