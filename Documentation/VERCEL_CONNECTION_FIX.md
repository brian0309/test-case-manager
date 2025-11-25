# Vercel Connection Fix - Frontend and Backend Communication

## Problem

When deploying the frontend and backend separately to Vercel, the frontend was unable to connect to the backend API, even with correct environment variables set. This was particularly noticeable with Google OAuth and other API calls.

## Root Cause

The issue was a **hardcoded localhost URL** in `frontend/src/components/GoogleLoginButton.tsx`:

```typescript
// ❌ BEFORE - Hardcoded localhost URL
const response = await fetch('http://localhost:5000/api/auth/google/url', {
  method: 'GET',
  credentials: 'include',
});
```

This meant that in production, the frontend was still trying to call `localhost:5000` instead of the actual backend URL deployed on Vercel.

## Solution

### 1. Created Centralized API Configuration

Created a new utility file `frontend/src/utils/api.ts` to centralize API URL logic:

```typescript
export const getApiUrl = (): string => {
	if (import.meta.env.MODE === "development") {
		return "http://localhost:5000/api";
	}
	
	// In production, prefer VITE_API_URL if set, otherwise use relative path
	return import.meta.env.VITE_API_URL || "/api";
};

export const API_URL = getApiUrl();
```

### 2. Updated GoogleLoginButton.tsx

Changed the hardcoded URL to use the centralized configuration:

```typescript
// ✅ AFTER - Uses environment-aware API_URL
import { API_URL } from "../utils/api";

const response = await fetch(`${API_URL}/auth/google/url`, {
  method: 'GET',
  credentials: 'include',
});
```

### 3. Updated authStore.ts

Modified to import and use the shared API_URL configuration instead of duplicating the logic:

```typescript
import { API_URL } from "../utils/api";
```

## How It Works

### Development Mode
- Automatically uses `http://localhost:5000/api`
- Auth endpoints accessed via `${API_URL}/auth/...`
- No environment variables needed for local development

### Production Mode (Vercel Separate Deployment)
- Reads `VITE_API_URL` environment variable
- Example: `VITE_API_URL=https://your-backend.vercel.app/api`
- Auth endpoints accessed via `${API_URL}/auth/...`
- All API calls use this URL

### Production Mode (Monolithic Deployment)
- If `VITE_API_URL` is not set, falls back to `/api`
- Auth endpoints accessed via `${API_URL}/auth/...`
- Works for traditional deployments where frontend and backend are on the same domain

## Deployment Checklist

When deploying to Vercel separately, ensure these environment variables are set:

### Backend Project (Vercel)
```bash
CLIENT_URL=https://your-frontend.vercel.app
GOOGLE_REDIRECT_URI=https://your-backend.vercel.app/api/auth/google/callback
# ... other backend env vars
```

### Frontend Project (Vercel)
```bash
VITE_API_URL=https://your-backend.vercel.app/api
```

⚠️ **Important Notes:**
- The `VITE_API_URL` should point to the `/api` base path (not `/api/auth`)
- Do NOT include a trailing slash after `/api`
- Variables are case-sensitive
- Must redeploy after changing environment variables

## Verification

### Test in Development
```bash
cd frontend
npm run dev
# Should connect to http://localhost:5000/api
# Auth endpoints will be at /api/auth
```

### Test Production Build Locally
```bash
cd frontend
VITE_API_URL=https://your-backend.vercel.app/api npm run build
npm run preview
# Should connect to your Vercel backend
# Auth endpoints will be at /api/auth
```

### Test in Browser Console
When on your deployed frontend, check the API URL being used:

```javascript
// In browser console
console.log(import.meta.env.VITE_API_URL);
```

## Files Changed

1. **frontend/src/utils/api.ts** (new file)
   - Centralized API URL configuration
   - Single source of truth for API endpoint

2. **frontend/src/components/GoogleLoginButton.tsx**
   - Removed hardcoded localhost URL
   - Now uses centralized API_URL

3. **frontend/src/store/authStore.ts**
   - Removed duplicate API URL logic
   - Now imports from shared utility

4. **Documentation/Deployment/VERCEL_SEPARATE_DEPLOYMENT.md**
   - Enhanced troubleshooting section
   - Added clear examples of correct/incorrect values

## Common Mistakes to Avoid

❌ **Don't:**
- Use `VITE_API_URL=https://your-backend.vercel.app` (missing `/api`)
- Use `VITE_API_URL=https://your-backend.vercel.app/api/` (extra trailing slash)
- Use `VITE_API_URL=https://your-backend.vercel.app/api/auth` (includes `/auth` - should be in code, not env)
- Forget to redeploy after changing environment variables
- Use quotes around values in Vercel environment variables UI

✅ **Do:**
- Use exact format: `VITE_API_URL=https://your-backend.vercel.app/api`
- Redeploy both frontend and backend after initial setup
- Verify environment variables in Vercel dashboard
- Test locally with production build before deploying

## Additional Resources

- [Vercel Separate Deployment Guide](./Deployment/VERCEL_SEPARATE_DEPLOYMENT.md)
- [Environment Comparison](./Deployment/ENVIRONMENT_COMPARISON.md)
- [Vercel Configuration Explained](./Deployment/VERCEL_CONFIG.md)
- [Traditional Deployment Guide](./Deployment/DEPLOYMENT.md)

## Support

If you still experience connection issues after applying this fix:

1. Check browser console for CORS errors
2. Verify both deployments are successful in Vercel dashboard
3. Test backend directly by visiting: `https://your-backend.vercel.app/api/auth/check-auth`
4. Ensure MongoDB connection is working (check backend logs in Vercel)
5. Clear browser cache and cookies

---

**Date Fixed:** November 2024  
**Issue:** Frontend-Backend Connection in Vercel  
**Status:** ✅ Resolved
