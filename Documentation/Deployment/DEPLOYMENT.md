# 🚀 Deployment Guide

This guide will help you deploy your MERN Advanced Auth application.

## Deployment Options

This application supports **two Vercel deployment strategies**:

### 1. 🎯 Separate Deployment (Recommended)
Deploy frontend and backend as **separate Vercel projects** for maximum flexibility:

- ✅ Independent scaling
- ✅ Better performance  
- ✅ Deploy frontend/backend independently
- ✅ Optimized for each tier

**📖 [See Separate Deployment Guide →](./VERCEL_SEPARATE_DEPLOYMENT.md)**

### 2. 🔄 Traditional Deployment
Deploy to platforms like Heroku, Render, Railway, DigitalOcean, etc. as a **single monolithic application**:

- ✅ Single server deployment
- ✅ Simpler setup
- ✅ Works on any Node.js hosting

**Continue reading this guide for traditional deployment.**

---

## Table of Contents
- [Deployment Compatibility](#deployment-compatibility)
- [Local Development](#local-development)
- [Traditional Hosting Deployment](#traditional-hosting-deployment)
- [Environment Variables](#environment-variables)
- [Post-Deployment Configuration](#post-deployment-configuration)
- [Troubleshooting](#troubleshooting)

---

## Deployment Compatibility

This application is designed to work seamlessly across **all deployment environments**:

### ✅ Local Development
```bash
npm run dev
```
- Hot-reloading with `tsx watch`
- Frontend runs on `localhost:5173`
- Backend runs on `localhost:5000`
- **No changes needed** - works exactly as before

### ✅ Traditional Hosting (Heroku, Render, Railway, DigitalOcean, etc.)
```bash
npm run build
npm start
```
- Compiles TypeScript to JavaScript
- Runs as a traditional Node.js server
- Serves frontend static files
- **No special configuration needed**

### ✅ Vercel Serverless
- One-click deployment with serverless functions
- Automatic scaling
- Global CDN for frontend
- See [One-Click Deployment](#one-click-deployment) section below

### How It Works

The application automatically detects the environment:

```typescript
// Traditional hosting & local development
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        connectDB();
        console.log("Server is running on port: ", PORT);
    });
}
// Vercel serverless
else {
    connectDB();
}
```

**Key Features:**
- 🔄 Single codebase for all platforms
- 🎯 Auto-detects deployment environment
- 🚀 No code changes required
- 📦 Standard npm scripts work everywhere

---

## Local Development

Your local development environment continues to work exactly as before. **No changes needed!**

### Running Locally

1. **Install dependencies**
   ```bash
   npm install
   npm install --prefix frontend
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your local values:
     ```bash
     PORT=5000
     NODE_ENV=development
     MONGO_URI=mongodb://localhost:27017/auth-app
     JWT_SECRET=your_local_secret
     CLIENT_URL=http://localhost:5173
     GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
     # ... other variables
     ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   This starts the backend with hot-reloading

4. **Start frontend (separate terminal)**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

### Development Features

- ✅ Hot-reloading for backend (via `tsx watch`)
- ✅ Hot-reloading for frontend (via Vite)
- ✅ TypeScript type checking
- ✅ Separate backend and frontend servers
- ✅ Full debugging capabilities
- ✅ No build step required

### Testing Production Build Locally

Want to test the production build locally?

```bash
# Build everything
npm run build

# Start production server
npm start
```

Then visit `http://localhost:5000` - the backend will serve the frontend.

**Note:** In production mode, you only need one server running on port 5000.

---

## Traditional Hosting Deployment

Deploy to traditional hosting platforms like Heroku, Render, Railway, DigitalOcean, AWS, etc.

### Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create a new Heroku app**
   ```bash
   heroku create your-app-name
   ```

4. **Add MongoDB Add-on** (optional) or use MongoDB Atlas
   ```bash
   heroku addons:create mongolab:sandbox
   ```

5. **Set Environment Variables**
   ```bash
   heroku config:set MONGO_URI="your_mongodb_uri"
   heroku config:set JWT_SECRET="your_jwt_secret"
   heroku config:set MAILTRAP_TOKEN="your_mailtrap_token"
   heroku config:set MAILTRAP_ENDPOINT="https://send.api.mailtrap.io/"
   # Optional: override the sender used for outgoing emails
   heroku config:set MAILTRAP_SENDER_EMAIL="mailtrap@demomailtrap.com"
   heroku config:set MAILTRAP_SENDER_NAME="MERN Auth"
   heroku config:set GOOGLE_CLIENT_ID="your_google_client_id"
   heroku config:set GOOGLE_CLIENT_SECRET="your_google_client_secret"
   heroku config:set GOOGLE_REDIRECT_URI="https://your-app-name.herokuapp.com/api/auth/google/callback"
   heroku config:set CLIENT_URL="https://your-app-name.herokuapp.com"
   heroku config:set NODE_ENV="production"
   ```

6. **Deploy**
   ```bash
   git push heroku master
   ```

7. **Update Google OAuth**
   - Add `https://your-app-name.herokuapp.com` to authorized origins
   - Add `https://your-app-name.herokuapp.com/api/auth/google/callback` to redirect URIs

### Render Deployment

1. **Create a new Web Service** on [Render](https://render.com)

2. **Connect your GitHub repository**

3. **Configure Build Settings**
   - **Build Command**: `npm run build:render`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. **Add Environment Variables** (same as above)

5. **Deploy** - Render will automatically build and deploy

6. **Update Google OAuth** with your Render URL

### Railway Deployment

1. **Create a new project** on [Railway](https://railway.app)

2. **Deploy from GitHub**
   - Connect your repository
   - Railway auto-detects the Node.js app

3. **Add Environment Variables** in Railway dashboard

4. **Deploy** - Automatic on git push

5. **Update Google OAuth** with your Railway URL

### DigitalOcean App Platform

1. **Create a new App** on [DigitalOcean](https://www.digitalocean.com/products/app-platform)

2. **Connect GitHub repository**

3. **Configure App**
   - **Build Command**: `npm run build`
   - **Run Command**: `npm start`

4. **Add Environment Variables**

5. **Deploy**

6. **Update Google OAuth** with your DigitalOcean URL

### AWS (EC2, Elastic Beanstalk, etc.)

For AWS deployments:
1. Use `npm run build` to compile the application
2. Use `npm start` to run in production
3. Configure environment variables in AWS console
4. Set up load balancer and SSL certificate
5. Update Google OAuth with your domain

### General Steps for Any Platform

1. **Build the application**
   ```bash
   npm run build
   ```
   This compiles TypeScript and builds the frontend

2. **Start the application**
   ```bash
   npm start
   ```
   This runs the compiled JavaScript from `dist/backend/index.js`

3. **Set environment variables** (all platforms need these):
   - `MONGO_URI`
   - `JWT_SECRET`
   - `MAILTRAP_TOKEN`
   - `MAILTRAP_ENDPOINT`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (with your platform's URL)
   - `CLIENT_URL` (with your platform's URL)
   - `NODE_ENV=production`

4. **Update Google OAuth credentials** with your deployment URL

5. **Test all features** after deployment

---

## Environment Variables

### Required Variables

Add these environment variables in your Vercel project settings:

```bash
# MongoDB Connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT Secret (use a strong random string - generate with: openssl rand -base64 32)
JWT_SECRET=your_strong_random_secret_here

# Mailtrap Configuration
MAILTRAP_TOKEN=your_mailtrap_api_token
MAILTRAP_ENDPOINT=https://send.api.mailtrap.io/
# Optional: override the default "from" email and name
MAILTRAP_SENDER_EMAIL=mailtrap@demomailtrap.com
MAILTRAP_SENDER_NAME=MT5 Webhook

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback

# Frontend URL (your Vercel deployment URL)
CLIENT_URL=https://your-app.vercel.app

# Node Environment
NODE_ENV=production
```

### How to Add Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add each variable:
   - Name: Variable name (e.g., `MONGO_URI`)
   - Value: Your secret value
   - Environment: Select "Production", "Preview", and "Development" as needed
4. Click "Save"

### Getting Your Environment Values

#### MongoDB URI
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a cluster (if you haven't)
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password

#### JWT Secret
Generate a secure random string:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or using OpenSSL
openssl rand -base64 32
```

#### Mailtrap Token
1. Go to [Mailtrap](https://mailtrap.io/)
2. Navigate to "API Tokens"
3. Create a new token or copy existing one

#### Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Copy your OAuth 2.0 Client ID and Client Secret

---

## Post-Deployment Configuration

### 1. Update Google OAuth Settings

After your first deployment, you need to update Google OAuth credentials:

1. **Get Your Vercel URL**
   - After deployment, Vercel provides you with a URL (e.g., `https://your-app.vercel.app`)

2. **Update Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" → "Credentials"
   - Click on your OAuth 2.0 Client ID
   - Add to "Authorized JavaScript origins":
     ```
     https://your-app.vercel.app
     ```
   - Add to "Authorized redirect URIs":
     ```
     https://your-app.vercel.app/api/auth/google/callback
     ```
   - Click "Save"

3. **Update Vercel Environment Variables**
   - Go to your Vercel project settings
   - Update these variables with your actual deployment URL:
     ```
     GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
     CLIENT_URL=https://your-app.vercel.app
     ```

4. **Redeploy**
   - Go to "Deployments" tab
   - Click "..." on the latest deployment
   - Click "Redeploy"
   - Or simply push a new commit to trigger redeployment

### 2. Test Your Deployment

Test all features:
- ✅ User signup
- ✅ Email verification
- ✅ User login
- ✅ Google OAuth login
- ✅ Password reset
- ✅ Change password
- ✅ Protected routes

---

## Troubleshooting

### Build Fails

**Issue**: Build fails during deployment

**Solutions**:
1. Check build logs in Vercel deployment details
2. Ensure all dependencies are in `package.json`
3. Verify TypeScript compilation works locally:
   ```bash
   npm run build
   ```
4. Check for TypeScript errors:
   ```bash
   npm run type-check
   ```

### API Routes Not Working

**Issue**: `/api/*` routes return 404

**Solutions**:
1. Verify `vercel.json` routing configuration is correct
2. Check that backend files are being included in the build
3. Verify environment variables are set correctly
4. Check Vercel function logs for errors

### Google OAuth Fails

**Issue**: Google OAuth returns error or redirects incorrectly

**Solutions**:
1. Verify `GOOGLE_REDIRECT_URI` matches exactly what's in Google Cloud Console
2. Ensure the redirect URI is added to Google's authorized list
3. Check that `CLIENT_URL` is set to your actual Vercel URL
4. Clear cookies and try again
5. Check browser console for CORS errors

### Database Connection Issues

**Issue**: Can't connect to MongoDB

**Solutions**:
1. Verify `MONGO_URI` is correct
2. Check MongoDB Atlas Network Access settings
   - Add `0.0.0.0/0` to allow connections from anywhere (Vercel uses dynamic IPs)
3. Verify database user has correct permissions
4. Check MongoDB Atlas cluster is running

### Email Not Sending

**Issue**: Verification emails not being sent

**Solutions**:
1. Verify `MAILTRAP_TOKEN` is correct
2. Check Mailtrap account is active
3. For production, consider using a real email service:
   - SendGrid
   - AWS SES
   - Mailgun
   - Postmark

### Environment Variables Not Loading

**Issue**: App can't access environment variables

**Solutions**:
1. Redeploy after adding/changing environment variables
2. Make sure variables are set for the correct environment (Production/Preview/Development)
3. Don't use quotes around values in Vercel UI
4. Check variable names match exactly (case-sensitive)

### CORS Errors

**Issue**: Frontend can't communicate with backend

**Solutions**:
1. Verify `CLIENT_URL` environment variable is set correctly
2. Check that the backend CORS configuration uses `process.env.CLIENT_URL`
3. Ensure credentials are set to `true` in CORS options
4. Clear browser cache and cookies

---

## Custom Domain (Optional)

To add a custom domain to your Vercel deployment:

1. Go to your project in Vercel
2. Navigate to "Settings" → "Domains"
3. Add your custom domain
4. Update DNS settings as instructed by Vercel
5. Update environment variables:
   ```
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
   CLIENT_URL=https://yourdomain.com
   ```
6. Update Google OAuth credentials with new domain
7. Redeploy

---

## Continuous Deployment

Vercel automatically deploys:
- **Production**: When you push to `main` or `master` branch
- **Preview**: When you push to other branches or open a PR

To trigger a manual deployment:
1. Go to Vercel Dashboard → Your Project
2. Click on the deployment
3. Click "..." on a deployment
4. Select "Redeploy"

---

## Monitoring and Logs

### View Logs
1. Go to Vercel Dashboard → Your Project
2. Click on a deployment
3. Click "View Function Logs" to see backend logs
4. Click "Build Logs" to see build output

### Performance Monitoring
- Vercel provides analytics in the "Analytics" tab
- Monitor function execution time
- Track error rates
- View bandwidth usage

---

## Cost Considerations

Vercel Free Tier includes:
- Unlimited deployments
- 100GB bandwidth per month
- Serverless function execution (100GB-hrs)
- Automatic HTTPS
- Preview deployments

For production apps with higher traffic, consider:
- Vercel Pro ($20/month)
- Vercel Enterprise (custom pricing)

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI](https://vercel.com/docs/cli)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Vercel deployment logs
3. Check GitHub Issues
4. Open a new issue with details about your problem

---

**Happy Deploying! 🚀**
