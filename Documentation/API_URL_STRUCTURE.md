# API URL Structure and Configuration

This document explains how API URLs are structured and configured in this application, making it easy to understand and extend for future features.

## Overview

The application uses a **base + feature** pattern for API URLs:
- **Base URL**: `/api` (configured via environment variables)
- **Feature paths**: `/auth`, `/users`, `/posts`, etc. (defined in code)
- **Final URLs**: `/api/auth/login`, `/api/users/list`, etc.

This separation makes it easy to add new features without changing environment variables.

## Current Structure

### Environment Variables

#### Frontend (`.env` or Vercel settings)

```bash
# Development
VITE_DEV_API_URL=http://localhost:5000/api

# Production
VITE_API_URL=https://your-backend.vercel.app/api
```

**Note:** The environment variable points to `/api`, NOT `/api/auth`. The `/auth` part is added in the code.

#### Backend (`.env` or Vercel settings)

```bash
# CORS and OAuth callback URLs still use the full path
CLIENT_URL=https://your-frontend.vercel.app
GOOGLE_REDIRECT_URI=https://your-backend.vercel.app/api/auth/google/callback
```

### Code Structure

#### Frontend (`frontend/src/utils/api.ts`)

```typescript
/**
 * Get the API URL based on the current environment
 * - Development: uses VITE_DEV_API_URL if set, otherwise defaults to /api
 * - Production: uses VITE_API_URL if set, otherwise defaults to /api
 */
export const getApiUrl = (): string => {
  if (import.meta.env.MODE === "development") {
    return import.meta.env.VITE_DEV_API_URL || "/api";
  }
  
  return import.meta.env.VITE_API_URL || "/api";
};

export const API_URL = getApiUrl();
```

#### Frontend API Calls (`frontend/src/store/authStore.ts`)

```typescript
import { API_URL } from "../utils/api";

// Auth endpoints - append /auth to base URL
await axios.post(`${API_URL}/auth/signup`, { email, password, name });
await axios.post(`${API_URL}/auth/login`, { email, password });
await axios.post(`${API_URL}/auth/logout`);
await axios.get(`${API_URL}/auth/check-auth`);
// ... more auth endpoints
```

#### Backend Route Mounting (`backend/index.ts`)

```typescript
import authRoutes from "./routes/auth.route.js";

// Mount auth routes at /api/auth prefix
app.use("/api/auth", authRoutes);
```

#### Backend Route Definitions (`backend/routes/auth.route.ts`)

```typescript
const router = express.Router();

// Define routes without prefix (prefix is in mount point)
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/check-auth", verifyToken, checkAuth);
// ... more auth routes
```

**Result:** Routes are accessible at `/api/auth/signup`, `/api/auth/login`, etc.

## Final Endpoint URLs

All endpoints remain at their original paths:

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/check-auth` - Verify authentication
- `POST /api/auth/verify-email` - Verify email with code
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `POST /api/auth/change-password` - Change password (protected)

### Google OAuth
- `GET /api/auth/google/url` - Get Google OAuth URL
- `GET /api/auth/google/callback` - Handle Google OAuth callback

## Adding New Features

This structure makes it easy to add new features. Here's how:

### Example: Adding a Users Feature

1. **Create the route file** (`backend/routes/users.route.ts`):

```typescript
import express, { Router } from "express";
import { getUsers, getUser, updateUser } from "../controllers/users.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router: Router = express.Router();

// Define routes without prefix (prefix is in mount point)
router.get("/", verifyToken, getUsers);
router.get("/:id", verifyToken, getUser);
router.put("/:id", verifyToken, updateUser);

export default router;
```

2. **Mount the routes** (`backend/index.ts`):

```typescript
import authRoutes from "./routes/auth.route.js";
import usersRoutes from "./routes/users.route.js";

// Mount each feature at its own path
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);  // Add this line
```

3. **Use in frontend** (`frontend/src/store/userStore.ts`):

```typescript
import { API_URL } from "../utils/api";

// Users endpoints - append /users to base URL
await axios.get(`${API_URL}/users`);
await axios.get(`${API_URL}/users/${userId}`);
await axios.put(`${API_URL}/users/${userId}`, updateData);
```

**Result:** New endpoints available at `/api/users`, `/api/users/:id`, etc.

### Example: Adding a Posts Feature

1. **Create route file** (`backend/routes/posts.route.ts`):

```typescript
const router = express.Router();

// Define routes without prefix (prefix is in mount point)
router.get("/", getPosts);
router.post("/", verifyToken, createPost);
router.get("/:id", getPost);
router.put("/:id", verifyToken, updatePost);
router.delete("/:id", verifyToken, deletePost);

export default router;
```

2. **Mount routes** (`backend/index.ts`):

```typescript
import postsRoutes from "./routes/posts.route.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/posts", postsRoutes);  // Add this line
```

3. **Use in frontend**:

```typescript
await axios.get(`${API_URL}/posts`);
await axios.post(`${API_URL}/posts`, postData);
await axios.get(`${API_URL}/posts/${postId}`);
```

**Result:** Posts endpoints at `/api/posts`, `/api/posts/:id`, etc.

## Benefits of This Structure

1. **Clean Environment Variables**: `VITE_API_URL` only needs to specify the base API path
2. **Easy to Extend**: Add new features without changing environment variables
3. **Clear Organization**: Feature paths are in code where they belong
4. **Consistent Patterns**: All features follow the same `/api/{feature}/{action}` pattern
5. **Future-Proof**: Ready for microservices or API versioning (e.g., `/api/v2/...`)

## Migration from Old Structure

### What Changed

**Old structure:**
- Environment: `VITE_API_URL=https://backend.vercel.app/api/auth`
- Code: `axios.post(\`${API_URL}/signup\`)`
- Result: `https://backend.vercel.app/api/auth/signup`

**New structure:**
- Environment: `VITE_API_URL=https://backend.vercel.app/api`
- Code: `axios.post(\`${API_URL}/auth/signup\`)`
- Result: `https://backend.vercel.app/api/auth/signup` (same!)

### Migration Steps

If you're updating an existing deployment:

1. **Update frontend environment variable**:
   - Old: `VITE_API_URL=https://backend.vercel.app/api/auth`
   - New: `VITE_API_URL=https://backend.vercel.app/api`

2. **Redeploy frontend** (code already handles the `/auth` part)

3. **Redeploy backend** (routes now include `/auth` prefix)

4. **Test all endpoints** to ensure everything works

## Examples in Different Environments

### Local Development

```bash
# Frontend
npm run dev  # Runs on http://localhost:5173

# Backend  
npm run dev  # Runs on http://localhost:5000

# API calls resolve to:
http://localhost:5000/api/auth/login
http://localhost:5000/api/auth/signup
```

### Production (Separate Vercel Deployment)

```bash
# Frontend deployed to: https://my-app-frontend.vercel.app
# Backend deployed to: https://my-app-backend.vercel.app

# Frontend .env:
VITE_API_URL=https://my-app-backend.vercel.app/api

# API calls resolve to:
https://my-app-backend.vercel.app/api/auth/login
https://my-app-backend.vercel.app/api/auth/signup
```

### Production (Monolithic Deployment)

```bash
# Both deployed to: https://my-app.onrender.com

# Frontend .env: (not needed - uses relative URLs)
# VITE_API_URL not set

# API calls resolve to:
https://my-app.onrender.com/api/auth/login
https://my-app.onrender.com/api/auth/signup
```

## Troubleshooting

### API calls failing with 404

**Check:**
1. Frontend `VITE_API_URL` points to `/api` (not `/api/auth`)
2. Backend routes include the feature prefix (e.g., `/auth/login`, not just `/login`)
3. Routes are mounted at `/api` in `backend/index.ts`

### Environment variable not working

**Check:**
1. Variable name is exactly `VITE_API_URL` (case-sensitive)
2. No trailing slash: ✅ `/api` ❌ `/api/`
3. Redeploy after changing environment variables
4. Clear browser cache

### CORS errors in production

**Check:**
1. Backend `CLIENT_URL` includes your frontend URL
2. Backend `ALLOWED_ORIGINS` includes your frontend URL
3. Backend CORS configuration allows credentials

## Summary

The key insight is that environment variables specify the **base** API path (`/api`), while code specifies the **feature** paths (`/auth`, `/users`, etc.). This makes the application:

- **Easier to configure** (one simple environment variable)
- **Easier to extend** (add features without touching env vars)
- **Better organized** (feature paths live in code, not config)
- **More maintainable** (clear separation of concerns)

For more information, see:
- [Frontend README](../frontend/README.md)
- [Backend README](../backend/README.md)
- [Vercel Deployment Guide](./Deployment/VERCEL_SEPARATE_DEPLOYMENT.md)
