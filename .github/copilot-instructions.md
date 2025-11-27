## Quick orientation for AI coding agents

This repo is a full-stack MERN authentication example (TypeScript). The goal of this file is to give an AI agent the concrete, immediately-actionable context it needs to be productive.

- Architecture at a glance
  - backend/ (Express + Mongoose, TypeScript, ES modules). Entry: `backend/index.ts` (exports app for Vercel when `VERCEL=1`, otherwise calls `app.listen`).
  - frontend/ (React + Vite + TypeScript). Entry: `frontend/src/main.tsx`. Frontend chooses API URL using `import.meta.env` and `VITE_API_URL`.
  - Monolithic vs separate deploys: backend can serve built frontend in production (see `backend/index.ts`) or be deployed separately to Vercel (backend sets `VERCEL=1`).

- Important runtime contracts & examples (use these verbatim when editing/instrumenting code)
  - Auth token cookie name: `token` (set by `backend/utils/generateTokenAndSetCookie.ts`). Payload: `{ userId }` signed with `JWT_SECRET` and 7d expiry.
  - Protected routes expect cookie-based JWT: middleware `backend/middleware/verifyToken.ts` reads `req.cookies.token` and sets `req.userId`.
  - OAuth endpoints: `GET /api/auth/google/url` and `GET /api/auth/google/callback` (controllers in `backend/controllers/googleAuth.controller.ts`).
  - Email verification and password reset tokens are stored on the User model (see `backend/models/user.model.ts`) with expiry fields and indexes.

- Dev / test / build commands (from repo READMEs)
  - Dev (root): `npm run dev` (starts backend with hot reload). Frontend dev: `cd frontend && npm run dev`.
  - Production build: `npm run build` (root) and `npm run start` to run built app.
  - Backend-specific: `npx tsx watch index.ts` (or `npm run build:backend` + run dist). Type-check: `npm run type-check`.
  - Tests: `npm test` (all), `npm run test:unit`, `npm run test:integration`. Tests use Jest + Supertest + mongodb-memory-server (see `backend/__tests__/`).

- Environment variables that matter (use these keys and exact behavior)
  - `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `MAILTRAP_TOKEN`, `MAILTRAP_ENDPOINT`
  - Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_ALLOWED_REDIRECT_URIS`
  - Cookie behavior: `COOKIE_DOMAIN` (optional), `NODE_ENV` controls `secure` & `sameSite` (`sameSite='none'` in production)
  - `VERCEL=1` used to toggle serverless export behavior in `backend/index.ts`.

- Project-specific patterns & conventions
  - Imports in backend source use `.js` file extensions (e.g., `import authRoutes from "./routes/auth.route.js"`). Keep that pattern when working with ES modules / build outputs.
  - The backend favors selecting only necessary fields in queries for security/performance (see `auth.controller.ts` usages of `.select(...)`). Follow that pattern when adding new controllers.
  - Cookies: always set `httpOnly: true` and set `secure`/`sameSite` according to `NODE_ENV`. Use `generateTokenAndSetCookie` to keep behavior consistent.
  - CORS: dynamic allow-list pattern (see `backend/config/dynamicCors.ts`) — avoid hardcoding origins; prefer environment-driven allow-lists.
  - Tests: use helpers in `backend/__tests__/helpers/testHelpers.ts` and the in-memory DB utilities in `backend/__tests__/setup/testDb.ts` for reliable local/CI tests.

- Editing guidance for PRs and changes
  - When changing auth cookie behavior, update both `generateTokenAndSetCookie.ts` and `verifyToken.ts` and add tests covering cookie options (dev vs production). Use the same cookie name `token` for backward compatibility.
  - If adding endpoints that will be called from the frontend, update frontend API URL handling (`frontend` uses `VITE_API_URL` / relative `/api/auth`) and ensure CORS/credentials are configured.
  - For deployment changes, remember the two deployment modes: monolithic (backend serves `frontend/dist`) vs separate Vercel projects. Keep `VERCEL` checks in `backend/index.ts` in mind when modifying server startup.

- Frontend API patterns (CRITICAL: always follow this pattern)
  - **ALWAYS** use the `API_URL` constant from `frontend/src/utils/api.ts` for all API calls
  - **NEVER** use hardcoded URLs like `/api/...` or relative paths directly in API calls
  - Example of CORRECT usage: `axios.post(\`${API_URL}/upload/presigned-url\`, ...)`
  - Example of WRONG usage: `axios.post("/api/upload/presigned-url", ...)` ❌
  - The `API_URL` automatically handles different environments:
    - Development: uses `VITE_DEV_API_URL` (default: `/api`)
    - Production: uses `VITE_API_URL` or falls back to `/api`
  - All API calls must include `withCredentials: true` for cookie-based auth
  - See `frontend/src/store/authStore.ts` or `frontend/src/services/testManagerApi.ts` for reference implementations

- Quick places to look for examples
  - JWT + cookie pattern: `backend/utils/generateTokenAndSetCookie.ts` and `backend/middleware/verifyToken.ts`
  - Auth flows: `backend/controllers/auth.controller.ts` and `backend/routes/auth.route.ts`
  - OAuth flow + dynamic CORS: `backend/controllers/googleAuth.controller.ts` and `backend/config/dynamicCors.ts`
  - User schema & token indexes: `backend/models/user.model.ts`
  - Tests & helpers: `backend/__tests__/` (unit, integration, setup helpers)

- Quick checklist the agent should follow before submitting code
  1. Update/confirm environment variable names and README if behavior changed.
 2. Run `npm run type-check` and `npm test` (or the subset affected) locally—use in-memory DB helpers for backend tests.
 3. Preserve `.js`-style import paths in compiled/ESM server files.
 4. Add or update tests for auth-sensitive changes (token/cookie, login flows, OAuth). Use `backend/__tests__` helpers.

If anything above is unclear or you want more examples from a specific file, tell me which area to expand (controllers, tests, deployment notes, or frontend API integration) and I will iterate. 
