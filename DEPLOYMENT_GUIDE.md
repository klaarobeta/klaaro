# AutoML Platform - Deployment Guide

## Why Vercel Deployment Looks Different

Your Vercel deployment only has the **frontend** (React app), but it's missing the **backend** (FastAPI API). This causes:
- No data loading
- API calls failing
- Missing functionality
- Blank pages or errors

## Complete Deployment Solution

### Architecture
```
Frontend (Vercel) → Backend (Railway) → MongoDB (Atlas)
```

---

## Step 1: Deploy MongoDB to Atlas (5 minutes)

1. **Create MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up for free

2. **Create Free Cluster**
   - Choose FREE tier (M0)
   - Select region closest to you
   - Name: `automl-cluster`

3. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string: 
     ```
     mongodb+srv://username:<password>@cluster.mongodb.net/
     ```
   - Replace `<password>` with your actual password
   - Add database name at end: `aiml_platform`
   - Final format:
     ```
     mongodb+srv://username:password@cluster.mongodb.net/aiml_platform?retryWrites=true&w=majority
     ```

4. **Whitelist IP**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0)
   - Save

---

## Step 2: Deploy Backend to Railway (10 minutes)

1. **Create Railway Account**
   - Go to: https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository

3. **Configure Backend Service**
   - After project creation, Railway will detect Python
   - Click on the service
   - Go to "Settings"
   - Set **Root Directory**: `/app/backend`
   - Set **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables**
   - Go to "Variables" tab
   - Add these variables:
     ```
     MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/aiml_platform?retryWrites=true&w=majority
     DB_NAME=aiml_platform
     PORT=8001
     ```

5. **Deploy**
   - Railway will auto-deploy
   - Wait for deployment to complete
   - Copy your backend URL (e.g., `https://your-app.railway.app`)

6. **Verify Backend**
   - Visit: `https://your-app.railway.app/api/health`
   - Should return: `{"status":"healthy","service":"AI/ML Platform API"}`

---

## Step 3: Update Vercel Frontend (5 minutes)

1. **Go to Vercel Dashboard**
   - Open your project
   - Go to "Settings" → "Environment Variables"

2. **Add Backend URL**
   - Click "Add New"
   - Name: `VITE_BACKEND_URL`
   - Value: `https://your-app.railway.app` (your Railway backend URL)
   - Select: Production, Preview, Development
   - Save

3. **Update Frontend .env**
   - In your GitHub repo: `/app/frontend/.env`
   - Update:
     ```
     VITE_BACKEND_URL=https://your-app.railway.app
     ```
   - Commit and push

4. **Redeploy Vercel**
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - Wait for completion

---

## Step 4: Verify Complete Deployment

1. **Test Frontend**
   - Visit your Vercel URL
   - Should load landing page properly

2. **Test Early Access**
   - Enter code: `lolamlol`
   - Should redirect to dashboard

3. **Test Full Workflow**
   - Upload a CSV dataset
   - Create new project
   - Should complete analysis and training

---

## Alternative: Deploy Everything to Railway

If you prefer single platform:

### Deploy Both Frontend & Backend to Railway

1. **Create Two Services in Railway**
   - Service 1: Backend (Python)
     - Root: `/app/backend`
     - Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   
   - Service 2: Frontend (Node)
     - Root: `/app/frontend`
     - Build: `yarn build`
     - Command: `yarn preview --host 0.0.0.0 --port $PORT`

2. **Set Environment Variables**
   - Backend service:
     ```
     MONGO_URL=<your-atlas-url>
     DB_NAME=aiml_platform
     ```
   
   - Frontend service:
     ```
     VITE_BACKEND_URL=<backend-service-url>
     ```

3. **Deploy**
   - Railway will handle both
   - Get both URLs

---

## Quick Troubleshooting

### Frontend loads but no data
- ✅ Check `VITE_BACKEND_URL` is set in Vercel
- ✅ Verify backend is running: visit `/api/health`
- ✅ Check browser console for CORS errors

### Backend fails to start
- ✅ Check `MONGO_URL` is correct
- ✅ Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- ✅ Check Railway logs for errors

### CORS errors
- ✅ Backend already has `allow_origins=["*"]` configured
- ✅ Make sure backend URL doesn't have trailing slash
- ✅ Check Railway backend is publicly accessible

### Can't upload datasets
- ✅ Railway has limited storage - consider using S3 for production
- ✅ For MVP, Railway's ephemeral storage is fine

---

## Production Checklist

Before going live:

- [ ] MongoDB Atlas cluster created
- [ ] Backend deployed to Railway/Render
- [ ] Backend health check working
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set correctly
- [ ] Test complete workflow end-to-end
- [ ] Enable MongoDB backups
- [ ] Set up monitoring (Railway provides built-in)
- [ ] Configure custom domain (optional)

---

## Cost Estimate (Free/Hobby Tier)

- **MongoDB Atlas**: Free (M0) - 512MB storage
- **Railway**: $5/month hobby plan - includes 500 hours, $0.000231/min after
- **Vercel**: Free for hobby projects

**Total**: Can start with ~$0-5/month

---

## Need Help?

Common deployment issues:

1. **"Network Error"** → Backend URL not set or wrong
2. **"404 Not Found"** → API routes need `/api` prefix
3. **"CORS Error"** → Backend CORS already configured, check URL
4. **MongoDB Connection Failed** → Check connection string and IP whitelist

---

## Summary

Your current setup:
```
❌ Vercel (Frontend only) → ❌ No Backend → ❌ No Database
```

Correct setup:
```
✅ Vercel (Frontend) → ✅ Railway (Backend) → ✅ MongoDB Atlas (Database)
```

Follow Steps 1-4 above to get fully working deployment! 🚀
