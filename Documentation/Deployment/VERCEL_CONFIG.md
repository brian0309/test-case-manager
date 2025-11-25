# Vercel Configuration Explained

This document explains the Vercel configuration options for deploying the MERN Advanced Auth application.

## Deployment Options

This repository supports **two Vercel deployment strategies**:

### 1. Separate Deployment (Recommended)
Deploy frontend and backend as **separate Vercel projects**:
- Each component has its own `vercel.json` configuration
- Backend: `backend/vercel.json`
- Frontend: `frontend/vercel.json`
- **📖 [See Complete Guide](./VERCEL_SEPARATE_DEPLOYMENT.md)**

### 2. Monolithic Deployment (Legacy)
Deploy both together as a single Vercel project:
- Uses `vercel.json.monolithic` at repository root
- Combines frontend and backend in one deployment
- Useful for simpler setups or migration

---

## Separate Deployment Configuration

### Backend Configuration (`backend/vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.ts"
    }
  ]
}
```

**How it works:**
- `builds`: Compiles TypeScript backend to serverless function
- `routes`: Routes all requests to the backend Express app
- Vercel automatically sets `VERCEL=1` environment variable
- Backend detects this and exports app instead of calling `app.listen()`

### Frontend Configuration (`frontend/vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install"
}
```

**How it works:**
- `framework`: Vercel recognizes Vite and optimizes deployment
- `buildCommand`: Compiles React app to static files
- `outputDirectory`: Where built files are located
- Static files deployed to Vercel's global CDN

---

## Monolithic Deployment Configuration

### Root Configuration (`vercel.json.monolithic`)

**This is the legacy approach.** The file `vercel.json.monolithic` at repository root contains:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/index.ts"
    },
    {
      "src": "/(.+\\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|webp))",
      "dest": "frontend/dist/$1"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/index.html"
    }
  ],
  "framework": null,
  "installCommand": "npm install && npm install --prefix frontend",
  "buildCommand": "npm run build"
}
```

**How it works:**
1. **Backend Build**: Compiles `api/index.ts` as serverless function
2. **Frontend Build**: Builds React app to `frontend/dist/`
3. **Routing**:
   - `/api/*` → Backend serverless function
   - Static files → Direct CDN serving
   - All else → `index.html` (SPA routing)

**To use this approach:**
1. Rename `vercel.json.monolithic` to `vercel.json` at repository root
2. Create `api/index.ts` that imports `backend/index.ts`
3. Deploy from repository root

---

## Environment Variables

Environment variables are set in Vercel project settings, not in configuration files.

### Backend Environment Variables

Required for backend deployment:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `MAILTRAP_TOKEN` - Mailtrap API token
- `MAILTRAP_ENDPOINT` - Mailtrap API endpoint
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL
- `CLIENT_URL` - Frontend URL for CORS
- `NODE_ENV` - Set to `production`

### Frontend Environment Variables

Required for frontend deployment:
- `VITE_API_URL` - Backend API base URL

**See `.env.example` files in `backend/` and `frontend/` directories for details.**

---

## How Backend Adapts to Vercel

The backend code automatically detects Vercel deployment:

```typescript
// Only serve frontend static files in production for traditional deployment
// (not when deployed separately to Vercel)
if (process.env.NODE_ENV === "production" && process.env.VERCEL !== '1') {
    app.use(express.static(path.join(__dirname, "../../frontend/dist")));
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "../../frontend/dist/index.html"));
    });
}

// Export app for Vercel serverless
export default app;

// Only listen when not in serverless environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        connectDB();
        console.log("Server is running on port: ", PORT);
    });
} else {
    connectDB();
}
```

**Key points:**
- Vercel automatically sets `VERCEL=1` environment variable
- Backend detects this and skips `app.listen()`
- In separate deployment, backend doesn't serve frontend files
- In traditional deployment, backend serves frontend files

---

## Deployment Workflow

### Separate Deployment Workflow

1. **Backend**: Push to GitHub → Vercel detects changes in `backend/` → Deploys serverless functions
2. **Frontend**: Push to GitHub → Vercel detects changes in `frontend/` → Deploys to CDN
3. **Independent**: Each can be deployed without affecting the other

### Monolithic Deployment Workflow

1. Push to GitHub → Vercel detects changes
2. Builds both frontend and backend together
3. Deploys as single project

---## Serverless Function Limitations

Vercel serverless functions have limitations:
- **Execution Time**: 10s (Hobby), 60s (Pro), 900s (Enterprise)
- **Payload Size**: 4.5MB request, 4.5MB response
- **Memory**: 1024MB (default)
- **Cold Start**: First request may be slower

For long-running operations, consider:
- Background jobs with Queue services
- Webhooks
- Scheduled functions (Vercel Cron)

## Differences from Traditional Hosting

### Traditional Hosting (e.g., Heroku, Render)
- Single long-running server
- Persistent connections
- Background jobs on same server
- Single deployment

### Vercel Serverless
- Functions spin up on demand
- Stateless (no persistent connections)
- Separate background job services needed
- Backend and frontend optimized separately

## Benefits of This Setup

1. **Automatic Scaling**: Serverless functions scale automatically
2. **Global CDN**: Frontend served from edge locations
3. **Fast Deployments**: Incremental builds
4. **Preview Deployments**: Each PR gets a unique URL
5. **Zero Config SSL**: Automatic HTTPS
6. **Cost Effective**: Pay for usage, not idle time

## Troubleshooting

### Function Timeout
If requests take too long:
- Optimize database queries
- Add database indexes
- Use connection pooling
- Consider upgrading Vercel plan

### Cold Starts
If first request is slow:
- Expected behavior for serverless
- Vercel Pro has warmer functions
- Optimize import statements
- Reduce bundle size

### Database Connections
MongoDB connections in serverless:
- Use connection pooling
- Reuse connections across invocations
- Set appropriate timeout values
- Consider MongoDB Atlas for better performance

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel Static Build](https://vercel.com/docs/frameworks/vite)
- [Serverless Functions Best Practices](https://vercel.com/docs/functions/best-practices)
