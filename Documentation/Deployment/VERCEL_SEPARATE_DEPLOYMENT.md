# Vercel Separate Deployment Guide

This guide explains how to deploy the backend and frontend separately to Vercel.

## Why Separate Deployment?

Deploying backend and frontend separately provides:

- ✅ **Independent Scaling** - Frontend and backend scale independently
- ✅ **Better Performance** - Frontend on global CDN, backend optimized for API
- ✅ **Flexible Updates** - Deploy frontend or backend changes independently
- ✅ **Cost Optimization** - Pay for what you use in each tier
- ✅ **Team Workflow** - Frontend and backend teams can work independently

## Deployment Options

This repository supports **two deployment strategies**:

### 1. Separate Deployment (Recommended for Vercel)
- Deploy backend and frontend as separate Vercel projects
- Each has its own repository/configuration
- Best for production applications
- **This guide covers this approach**

### 2. Monolithic Deployment (Traditional)
- Deploy both together on platforms like Heroku, Render, Railway
- Single server serves both frontend and backend
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for details

---

## Quick Deploy to Vercel

### Deploy Backend

[![Deploy Backend to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brian0309/mern-advanced-auth&project-name=mern-auth-backend&root-directory=backend&env=MONGO_URI,JWT_SECRET,MAILTRAP_TOKEN,MAILTRAP_ENDPOINT,MAILTRAP_SENDER_EMAIL,MAILTRAP_SENDER_NAME,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,GOOGLE_REDIRECT_URI,GOOGLE_ALLOWED_REDIRECT_URIS,ALLOWED_ORIGINS,CLIENT_URL,COOKIE_DOMAIN,NODE_ENV)

### Deploy Frontend

[![Deploy Frontend to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brian0309/mern-advanced-auth&project-name=mern-auth-frontend&root-directory=frontend&env=VITE_API_URL)

---

## Manual Deployment Steps

### Prerequisites

1. **Vercel Account** - [Sign up here](https://vercel.com/signup)
2. **MongoDB Atlas** - [Create a free cluster](https://cloud.mongodb.com/)
3. **Google OAuth Credentials** - [Get from Google Cloud Console](https://console.cloud.google.com/)
4. **Mailtrap Account** - [Sign up here](https://mailtrap.io/)

### Step 1: Deploy Backend

1. **Push your code to GitHub** (if not already done)

2. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your repository

3. **Configure Backend Project**
   - Project Name: `mern-auth-backend` (or your choice)
   - Root Directory: **`backend`** ⚠️ **Important!**
   - Framework Preset: Other
   - Build Command: Leave empty or `npm run build:backend`
   - Output Directory: Leave empty
   - Install Command: `npm install`

4. **Add Environment Variables**

   Click "Environment Variables" and add these:

   ```bash
   # MongoDB
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
   
   # JWT Secret (generate with: openssl rand -base64 32)
   JWT_SECRET=your_strong_random_secret_key
   
   # Mailtrap
   MAILTRAP_TOKEN=your_mailtrap_api_token
   MAILTRAP_ENDPOINT=https://send.api.mailtrap.io/
      # Optional: override the default from-address & display name used by the app
      MAILTRAP_SENDER_EMAIL=mailtrap@demomailtrap.com
      MAILTRAP_SENDER_NAME=MT5 Webhook
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret

   # OAuth redirect URIs (single callback and allowed redirect list)
   GOOGLE_REDIRECT_URI=https://your-backend.vercel.app/api/auth/google/callback
   GOOGLE_ALLOWED_REDIRECT_URIS=https://your-frontend.vercel.app/oauth-redirect,https://your-frontend.vercel.app
   
   # Comma-separated list of frontend origins that are allowed to call the backend (preferred)
   # Example: ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://preview-123.onvercel.app
   ALLOWED_ORIGINS=https://your-frontend.vercel.app

   # Frontend URL (kept for backward compatibility; prefer ALLOWED_ORIGINS)
   CLIENT_URL=https://your-frontend.vercel.app

   # Optional: cookie domain to scope auth cookie (omit for default)
   COOKIE_DOMAIN=yourdomain.com

   # Environment
   NODE_ENV=production
   ```

5. **Deploy Backend**
   - Click "Deploy"
   - Wait for deployment to complete
   - **Copy your backend URL** (e.g., `https://mern-auth-backend.vercel.app`)

### Step 2: Deploy Frontend

1. **Import Project Again**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select the **same repository**

2. **Configure Frontend Project**
   - Project Name: `mern-auth-frontend` (or your choice)
   - Root Directory: **`frontend`** ⚠️ **Important!**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Add Environment Variables**

   Add this single variable:

   ```bash
   # Backend API URL (use your actual backend URL from Step 1)
   VITE_API_URL=https://mern-auth-backend.vercel.app/api
   ```

4. **Deploy Frontend**
   - Click "Deploy"
   - Wait for deployment to complete
   - **Copy your frontend URL** (e.g., `https://mern-auth-frontend.vercel.app`)

### Step 3: Update Backend Configuration

Now that you have both URLs, update the backend environment variables:

1. **Go to Backend Project Settings**
   - Open your backend project in Vercel
   - Navigate to Settings → Environment Variables

2. **Update These Variables**

   Update `ALLOWED_ORIGINS` (preferred):
   ```
   ALLOWED_ORIGINS=https://mern-auth-frontend.vercel.app
   ```

   (Optional) `CLIENT_URL` — kept for backward compatibility:
   ```
   CLIENT_URL=https://mern-auth-frontend.vercel.app
   ```

   Update `GOOGLE_REDIRECT_URI`:
   ```
   GOOGLE_REDIRECT_URI=https://mern-auth-backend.vercel.app/api/auth/google/callback
   ```

3. **Redeploy Backend**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

### Step 4: Configure Google OAuth

Update your Google Cloud Console OAuth settings:

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**

2. **Navigate to Credentials**
   - APIs & Services → Credentials
   - Click on your OAuth 2.0 Client ID

3. **Add Authorized JavaScript Origins**
   ```
   https://mern-auth-frontend.vercel.app
   https://mern-auth-backend.vercel.app
   ```

4. **Add Authorized Redirect URIs**
   ```
   https://mern-auth-backend.vercel.app/api/auth/google/callback
   ```

5. **Save Changes**

### Step 5: Test Your Deployment

Visit your frontend URL and test all features:

- ✅ User signup
- ✅ Email verification
- ✅ User login
- ✅ Google OAuth login
- ✅ Password reset
- ✅ Change password
- ✅ Protected routes

---

## Environment Variables Reference

### Backend Environment Variables

See `backend/.env.example` for the complete list:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for JWT tokens | Generate with `openssl rand -base64 32` |
| `MAILTRAP_TOKEN` | Mailtrap API token | From Mailtrap dashboard |
| `MAILTRAP_ENDPOINT` | Mailtrap API endpoint | `https://send.api.mailtrap.io/` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `https://your-backend.vercel.app/api/auth/google/callback` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins (preferred for CORS). Include all preview and production origins. | `https://your-frontend.vercel.app,https://preview-123.onvercel.app` |
| `CLIENT_URL` | Frontend URL for CORS (deprecated — use `ALLOWED_ORIGINS` instead) | `https://your-frontend.vercel.app` |
| `NODE_ENV` | Environment mode | `production` |
| `GOOGLE_ALLOWED_REDIRECT_URIS` | Comma-separated list of allowed redirect URIs used by the frontend (for front-end initiated OAuth) | `https://your-frontend.vercel.app/oauth-redirect,https://your-frontend.vercel.app` |
| `COOKIE_DOMAIN` | Optional cookie domain used when setting the auth cookie (omit to use default host) | `yourdomain.com` |

### Frontend Environment Variables

See `frontend/.env.example`:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://your-backend.vercel.app/api` |

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User's Browser                    │
└────────────┬────────────────────────┬───────────────┘
             │                        │
             │                        │
    ┌────────▼────────┐      ┌────────▼────────┐
    │   Frontend      │      │    Backend      │
    │   (Vercel CDN)  │─────▶│   (Serverless)  │
    │                 │      │                 │
    │  React + Vite   │      │   Express API   │
    └─────────────────┘      └────────┬────────┘
                                      │
                             ┌────────▼────────┐
                             │  MongoDB Atlas  │
                             └─────────────────┘
```

### Request Flow

1. **Static Assets** (HTML, CSS, JS)
   - Served from Vercel's global CDN
   - Ultra-fast loading worldwide

2. **API Requests** (`/api/auth/*`)
   - Frontend calls backend URL
   - Serverless functions handle requests
   - Connects to MongoDB Atlas

3. **Authentication**
   - JWT tokens are stored in an HTTP-only cookie named `token` (see `backend/utils/generateTokenAndSetCookie.ts`)
   - `COOKIE_DOMAIN` can be used to scope the cookie to a custom domain
   - `NODE_ENV` controls `secure` and `sameSite` cookie options (production sets `sameSite='none'` and `secure=true`)
   - CORS is configured to allow requests from `CLIENT_URL`

---

## Updating Your Deployment

### Update Backend Code

```bash
git add backend/
git commit -m "Update backend"
git push
```

Vercel automatically redeploys the backend project.

### Update Frontend Code

```bash
git add frontend/
git commit -m "Update frontend"
git push
```

Vercel automatically redeploys the frontend project.

### Update Both

```bash
git add .
git commit -m "Update both frontend and backend"
git push
```

Both projects redeploy automatically!

---

## Troubleshooting

### CORS Errors

**Problem:** Frontend can't communicate with backend

**Solution:**
1. Verify `CLIENT_URL` in backend environment variables
2. Make sure it matches your frontend URL exactly
3. Redeploy backend after changing

### Google OAuth Not Working

**Problem:** Google OAuth fails or redirects incorrectly

**Solutions:**
1. Verify `GOOGLE_REDIRECT_URI` matches backend URL exactly
2. Check Google Cloud Console has the correct redirect URI
3. Ensure both origins are in "Authorized JavaScript origins"
4. Clear browser cookies and try again

### API Requests Failing

**Problem:** Frontend can't reach backend APIs

**Solutions:**
1. Check `VITE_API_URL` in frontend environment variables
2. Make sure it points to the `/api` endpoint (without `/auth`)
   - ✅ Correct: `https://your-backend.vercel.app/api`
   - ❌ Wrong: `https://your-backend.vercel.app/api/`
   - ❌ Wrong: `https://your-backend.vercel.app`
3. Verify backend is deployed and working (visit backend URL)
4. Check browser console for CORS or network errors
5. **Important:** Ensure frontend is using the environment variable, not hardcoded URLs
   - All API calls should use the centralized `API_URL` from `utils/api.ts`
   - No hardcoded `localhost:5000` should appear in production builds

### Database Connection Issues

**Problem:** Backend can't connect to MongoDB

**Solutions:**
1. Verify `MONGO_URI` is correct
2. Check MongoDB Atlas Network Access allows `0.0.0.0/0`
3. Verify database user credentials are correct
4. Check MongoDB cluster is running

### Environment Variables Not Working

**Problem:** Changes to environment variables not taking effect

**Solutions:**
1. **Always redeploy** after changing environment variables
2. Check variables are set for "Production" environment
3. Don't use quotes around values in Vercel UI
4. Variable names are case-sensitive

---

## Custom Domains

### Add Custom Domain to Frontend

1. Go to frontend project → Settings → Domains
2. Add your domain (e.g., `app.yourdomain.com`)
3. Configure DNS as instructed
4. Update backend `CLIENT_URL` to use custom domain
5. Update Google OAuth origins and redirect URIs

### Add Custom Domain to Backend

1. Go to backend project → Settings → Domains
2. Add your domain (e.g., `api.yourdomain.com`)
3. Configure DNS as instructed
4. Update frontend `VITE_API_URL` to use custom domain
5. Update `GOOGLE_REDIRECT_URI` to use custom domain
6. Update Google OAuth redirect URIs

---

## Monitoring and Logs

### View Backend Logs

1. Go to backend project in Vercel
2. Click on a deployment
3. Click "View Function Logs"
4. See real-time serverless function logs

### View Frontend Build Logs

1. Go to frontend project in Vercel
2. Click on a deployment
3. See build output and errors

### Analytics

Both projects have analytics available:
- Go to project → Analytics
- View visitor stats, performance metrics
- Monitor function execution times

---

## Cost Considerations

### Vercel Free Tier (Hobby)

**Per Project:**
- Unlimited deployments
- 100GB bandwidth/month
- Serverless functions: 100GB-hrs
- 6,000 build minutes/month

**For This App:**
- **Backend**: ~1-5GB/month (API calls)
- **Frontend**: ~5-20GB/month (static assets)
- **Total**: Usually well within free tier

### When to Upgrade

Consider Vercel Pro ($20/month per user) if you need:
- More bandwidth (1TB/month)
- Faster functions (60s timeout vs 10s)
- Team collaboration
- Advanced analytics
- Priority support

---

## Migration Guide

### From Monolithic to Separate Deployment

Already deployed as monolithic? Here's how to migrate:

1. **Deploy backend separately** (follow Step 1 above)
2. **Deploy frontend separately** (follow Step 2 above)
3. **Update environment variables** (follow Step 3 above)
4. **Update Google OAuth** (follow Step 4 above)
5. **Test everything works**
6. **Delete old monolithic deployment** (optional)

### From Separate to Monolithic

Want to switch back?

1. Use `vercel.json.monolithic` as `vercel.json` at root
2. Restore `/api/index.ts` that imports backend
3. Deploy from root directory
4. Update environment variables
5. Done!

---

## Best Practices

### Security

- ✅ Always use environment variables, never hardcode secrets
- ✅ Use strong JWT secrets (32+ random characters)
- ✅ Keep Google OAuth credentials secure
- ✅ Enable CORS only for your frontend domain
- ✅ Use HTTPS (Vercel provides this automatically)

### Performance

- ✅ Use MongoDB Atlas in the same region as backend
- ✅ Enable MongoDB connection pooling
- ✅ Minimize API payload sizes
- ✅ Use Vercel's edge network for static assets
- ✅ Implement proper error handling

### Development Workflow

- ✅ Test locally before deploying
- ✅ Use preview deployments for testing (push to branches)
- ✅ Keep frontend and backend versions in sync
- ✅ Document API changes in commit messages
- ✅ Use semantic versioning for releases

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)

---

## Support

Having issues? Here's how to get help:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Vercel deployment logs
3. Check browser console for frontend errors
4. Review backend function logs for API errors
5. Open an issue on GitHub with details

---

**Enjoy your separate Vercel deployment! 🚀**
