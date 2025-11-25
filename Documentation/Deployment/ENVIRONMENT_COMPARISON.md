# Deployment Environment Comparison

Quick reference guide showing how the application runs in different environments.

## Overview

**Your application works everywhere with the same code!** Here's how it adapts:

| Environment | How to Run | Where Backend Runs | Where Frontend Runs | Notes |
|-------------|------------|-------------------|---------------------|-------|
| **Local Development** | `npm run dev` | `localhost:5000` | `localhost:5173` (Vite) | Separate servers, hot-reload |
| **Production Local Test** | `npm run build` + `npm start` | `localhost:5000` | Served by backend | Single server |
| **Heroku** | `npm run build` + `npm start` | Heroku dyno | Served by backend | Traditional hosting |
| **Render** | `npm run build:render` + `npm start` | Render service | Served by backend | Traditional hosting |
| **Railway** | `npm run build` + `npm start` | Railway service | Served by backend | Traditional hosting |
| **Vercel Separate** | Separate deployments | Backend serverless | Frontend CDN | **Recommended for Vercel** |
| **Vercel Monolithic** | Single deployment | Serverless functions | Global CDN | Legacy approach |

## Detailed Breakdown

### 🖥️ Local Development

**Command:**
```bash
npm run dev              # Terminal 1: Backend with hot-reload
cd frontend && npm run dev   # Terminal 2: Frontend with hot-reload
```

**How it works:**
- Backend TypeScript runs directly with `tsx watch`
- Frontend runs via Vite dev server
- Two separate servers for optimal development experience
- `VERCEL` env var is not set → `app.listen()` starts the server

**Architecture:**
```
┌──────────────────┐         ┌──────────────────┐
│  Frontend (Vite) │ ───────▶│  Backend (tsx)   │
│  localhost:5173  │         │  localhost:5000  │
└──────────────────┘         └──────────────────┘
```

**Environment Variables:**
- `NODE_ENV=development`
- `CLIENT_URL=http://localhost:5173`
- `GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback`

---

### 🏗️ Traditional Hosting (Heroku, Render, Railway, etc.)

**Commands:**
```bash
npm run build   # Compile TypeScript + Build frontend
npm start       # Run production server
```

**How it works:**
- Backend TypeScript compiled to JavaScript in `dist/backend/`
- Frontend React built to static files in `frontend/dist/`
- Single Node.js server serves both API and static files
- `VERCEL` env var is not set → `app.listen()` starts the server

**Architecture:**
```
┌─────────────────────────────────────┐
│     Single Node.js Server           │
│                                     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │   Backend   │  │   Frontend   │ │
│  │  /api/*     │  │   Static     │ │
│  │   (API)     │  │   Files      │ │
│  └─────────────┘  └──────────────┘ │
│                                     │
└─────────────────────────────────────┘
         your-app.platform.com
```

**Production Mode Behavior:**
```typescript
if (process.env.NODE_ENV === "production") {
    // Serve static frontend files
    app.use(express.static(path.join(__dirname, "../../frontend/dist")));
    
    // SPA fallback - all non-API routes serve index.html
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "../../frontend/dist/index.html"));
    });
}
```

**Environment Variables:**
- `NODE_ENV=production`
- `CLIENT_URL=https://your-app.platform.com`
- `GOOGLE_REDIRECT_URI=https://your-app.platform.com/api/auth/google/callback`

---

### ☁️ Vercel Serverless

**Command:**
```
One-click deploy or git push
```

**How it works:**
- Backend runs as serverless functions via `api/index.ts`
- Frontend deployed to global CDN
- Vercel automatically sets `VERCEL=1` environment variable
- `app.listen()` is skipped because `VERCEL === '1'`
- App is exported instead: `export default app`

**Architecture:**
```
┌────────────────────────────────────────┐
│            Vercel Edge Network         │
│                                        │
│  ┌──────────────┐    ┌──────────────┐ │
│  │   Frontend   │    │   Backend    │ │
│  │  (CDN Edge)  │    │ (Serverless  │ │
│  │   Static     │    │  Functions)  │ │
│  └──────────────┘    └──────────────┘ │
│        ▲                    ▲          │
└────────┼────────────────────┼──────────┘
         │                    │
         └────────────────────┘
        your-app.vercel.app
```

**Serverless Detection:**
```typescript
if (process.env.VERCEL !== '1') {
    // Traditional: Start server
    app.listen(PORT, () => {
        connectDB();
        console.log("Server is running on port: ", PORT);
    });
} else {
    // Serverless: Just connect to DB, don't listen
    connectDB();
}
```

**Environment Variables:**
- `NODE_ENV=production`
- `VERCEL=1` (automatically set)
- `CLIENT_URL=https://your-app.vercel.app`
- `GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback`

---

## Key Differences

### Server Lifecycle

| Environment | Server Type | Startup | Requests |
|-------------|-------------|---------|----------|
| **Local Dev** | Long-running | Starts once, runs continuously | Always the same process |
| **Traditional** | Long-running | Starts once per deployment | Same process handles all requests |
| **Vercel** | Serverless | Cold start on first request | New/reused function instances |

### Static File Serving

| Environment | How Frontend is Served |
|-------------|------------------------|
| **Local Dev** | Vite dev server (separate) |
| **Traditional** | Express static middleware |
| **Vercel** | Global CDN (Edge Network) |

### Database Connections

| Environment | Connection Strategy |
|-------------|---------------------|
| **Local Dev** | Single persistent connection |
| **Traditional** | Connection pool, long-lived |
| **Vercel** | Connection reuse across invocations, potential cold starts |

---

## Migration Path

If you want to switch platforms:

### From Local → Vercel
1. Push to GitHub
2. Click deploy button
3. Add environment variables
4. Update Google OAuth URLs
5. Done! ✅

### From Local → Heroku/Render/Railway
1. Create app on platform
2. Add environment variables
3. Connect GitHub or push code
4. Platform runs `npm run build` + `npm start`
5. Update Google OAuth URLs
6. Done! ✅

### From Vercel → Traditional Hosting
1. Create app on new platform
2. Add same environment variables
3. Deploy (builds automatically)
4. Update Google OAuth URLs (if domain changed)
5. Done! ✅

### From Traditional → Vercel
1. Click Vercel deploy button
2. Add environment variables
3. Update Google OAuth URLs
4. Done! ✅

**No code changes required for any migration!** 🎉

---

## Environment Detection Logic

The app automatically detects where it's running:

```typescript
// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

// Check if in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Determine CORS origin
const corsOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

// Start server only if not serverless
if (!isVercel) {
    app.listen(PORT, () => {
        connectDB();
        console.log("Server is running on port: ", PORT);
    });
} else {
    connectDB();
}

// Serve frontend static files only in production (non-Vercel)
if (isProduction && !isVercel) {
    app.use(express.static(path.join(__dirname, "../../frontend/dist")));
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "../../frontend/dist/index.html"));
    });
}

---

## Testing Different Modes Locally

### Test Development Mode
```bash
npm run dev
cd frontend && npm run dev
```
Visit: `http://localhost:5173`

### Test Production Mode (Traditional Hosting Simulation)
```bash
npm run build
npm start
```
Visit: `http://localhost:5000`

### Test TypeScript Compilation
```bash
npm run type-check
```

### Test Backend Build Only
```bash
npm run build:backend
```

---

## Recommended Platform by Use Case

| Use Case | Recommended Platform | Why |
|----------|---------------------|-----|
| **Learning/Development** | Local | Full control, easy debugging |
| **Small projects** | Vercel | Free tier, automatic scaling |
| **Medium projects** | Render/Railway | Good free tier, traditional hosting |
| **Large projects** | Heroku/AWS | More resources, better scaling options |
| **Enterprise** | AWS/GCP/Azure | Full control, compliance requirements |
| **Rapid prototyping** | Vercel | Fastest deployment |
| **Long-running processes** | Traditional hosting | Better suited than serverless |

---

## Summary

✅ **Works everywhere with same code**
✅ **Auto-detects environment**
✅ **No platform-specific code**
✅ **Easy to migrate between platforms**
✅ **Optimal for each environment**

Choose the platform that best fits your needs - the code adapts automatically! 🚀
