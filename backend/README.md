# Backend - Test Case Manager

This is the backend API for the Test Case Manager application, providing test case management, real-time collaboration, and authentication services.

## Development

### Local Development

From the root directory:
```bash
npm run dev
```

Or from this directory:
```bash
npm install
npx tsx watch index.ts
```

### Environment Variables

Create a `.env` file in the **root directory** (not here) with the following variables:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Mailtrap (Email Service)
MAILTRAP_TOKEN=your_mailtrap_token
MAILTRAP_ENDPOINT=https://send.api.mailtrap.io/
MAILTRAP_SENDER_EMAIL=mailtrap@demomailtrap.com
MAILTRAP_SENDER_NAME=MERN Auth
# Optional: Mailtrap template UUID for the welcome email. If set, the backend will try to use the Mailtrap-hosted template.
# If the template UUID is missing or invalid, the backend falls back to a built-in HTML welcome template.
MAILTRAP_WELCOME_TEMPLATE_UUID=your_mailtrap_welcome_template_uuid

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
GOOGLE_ALLOWED_REDIRECT_URIS=http://localhost:5000/api/auth/google/callback

# Frontend URL
CLIENT_URL=http://localhost:5173
```

See `.env.example` in this directory for production/Vercel deployment.

### Vercel / Production environment variables (quick reference)

When deploying the backend separately to Vercel (recommended), set the following environment variables in the Vercel dashboard for the `backend` project:

- `MONGO_URI` - MongoDB connection string (required)
- `JWT_SECRET` - JWT signing secret (required)
- `CLIENT_URL` - Frontend origin (e.g. `https://your-frontend.vercel.app`) (required)
- `NODE_ENV` - set to `production` on Vercel (Vercel usually sets this automatically)
- `MAILTRAP_TOKEN` and `MAILTRAP_ENDPOINT` - if using Mailtrap for emails (optional)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` - Google OAuth settings (if using OAuth)
- `ALLOWED_ORIGINS` - optional comma-separated allow-list of origins (useful for multiple preview deployments);
    e.g. `https://frontend-pr-123.vercel.app,https://frontend-pr-456.vercel.app,https://your-frontend.vercel.app`
- `COOKIE_DOMAIN` - optional domain for cookies (e.g. `.example.com`) when sharing cookies across subdomains

Notes:
- For cross-site cookies to work in production browsers, cookies must be set with `SameSite=None` and `Secure=true`. This project automatically uses `sameSite='none'` and `secure=true` when `NODE_ENV=production`.
- If you deploy frontend and backend to different top-level domains (not subdomains of the same parent), cookies will still belong to the backend domain and must be sent with credentials from the frontend (the frontend code already sets credentials). If you need to share auth across unrelated top-level domains, use Authorization headers or a central auth domain.
- To support many preview deployments, set `ALLOWED_ORIGINS` to include each preview origin or set it dynamically via your CI process.

## Deployment

### Deploy to Vercel (Separate Backend)

[![Deploy Backend to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brian0309/mern-advanced-auth&project-name=mern-auth-backend&root-directory=backend&env=MONGO_URI,JWT_SECRET,MAILTRAP_TOKEN,MAILTRAP_ENDPOINT,MAILTRAP_SENDER_EMAIL,MAILTRAP_SENDER_NAME,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,GOOGLE_REDIRECT_URI,CLIENT_URL,NODE_ENV)

**Important:** Set root directory to `backend` when deploying to Vercel.

See [VERCEL_SEPARATE_DEPLOYMENT.md](../Documentation/Deployment/VERCEL_SEPARATE_DEPLOYMENT.md) for detailed instructions.

### Deploy to Traditional Hosting

For Heroku, Render, Railway, etc., deploy from the **root directory**, not this backend directory.

See [DEPLOYMENT.md](../Documentation/Deployment/DEPLOYMENT.md) for instructions.

## API Endpoints

All API endpoints are prefixed with `/api`. Authentication endpoints are under `/api/auth`.

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

### Example Feature
- `GET /api/example/example` - Example protected endpoint (requires authentication)

## Project Structure

```
backend/
├── config/
│   └── googleAuth.ts            # Google OAuth configuration
├── controllers/
│   ├── auth.controller.ts       # Auth endpoints
│   └── googleAuth.controller.ts # Google OAuth endpoints
├── db/
│   └── connectDB.ts             # MongoDB connection
├── mailtrap/
│   ├── emails.ts                # Email sending functions
│   ├── emailTemplates.ts        # HTML email templates
│   └── mailtrap.config.ts       # Mailtrap configuration
├── middleware/
│   └── verifyToken.ts           # JWT verification middleware
├── models/
│   └── user.model.ts            # User schema
├── routes/
│   └── auth.route.ts            # Auth routes
├── services/                    # Feature-based modules
│   └── example/                 # Example feature (demonstrates architecture)
│       ├── controllers/
│       │   └── example.controller.ts
│       ├── routes/
│       │   └── example.route.ts
│       ├── services/
│       │   └── example.service.ts
│       ├── types/
│       │   └── example.types.ts
│       └── __tests__/
│           ├── example.test.ts
│           └── example.service.test.ts
├── types/
│   ├── api.types.ts
│   ├── auth.types.ts
│   ├── express.d.ts
│   ├── index.ts
│   └── user.types.ts
├── utils/
│   └── generateTokenAndSetCookie.ts
├── index.ts                     # Backend entry point
├── vercel.json                  # Vercel configuration (separate deployment)
├── .env.example                 # Example environment variables
└── tsconfig.json                # TypeScript configuration
```

## Adding New Features

The backend supports a feature-based architecture where each feature is self-contained in its own directory under `backend/services/`.

For a comprehensive guide on adding new features, see [**Documentation/ADDING_FEATURES.md**](../Documentation/ADDING_FEATURES.md).

Quick example:
```
backend/services/{feature-name}/
├── controllers/     # HTTP request handlers
├── routes/          # Route definitions
├── services/        # Business logic
├── types/           # TypeScript types
└── __tests__/       # Feature tests
```

## TypeScript

This backend is fully written in TypeScript.

### Type Checking

```bash
npm run type-check
```

### Building

```bash
npm run build:backend
```

Compiles TypeScript to JavaScript in `dist/backend/` directory.

## How It Works

### Environment Detection

The backend automatically detects the deployment environment:

- **Local Development**: Runs with `tsx watch` for hot-reloading
- **Traditional Hosting**: Compiled to JavaScript, runs with Node.js, serves frontend
- **Vercel Serverless**: Exported as Express app, runs as serverless function

### Vercel Deployment

When deployed to Vercel:
- `VERCEL=1` environment variable is automatically set
- Backend skips `app.listen()` and just exports the Express app
- Runs as serverless functions
- Does NOT serve frontend static files (frontend deployed separately)

### Traditional Deployment

When deployed to traditional hosting:
- Backend compiled to JavaScript
- `app.listen()` starts the server
- In production mode, serves frontend static files
- Single server for both API and frontend

## CORS Configuration

CORS is configured to allow requests from the frontend URL specified in `CLIENT_URL` environment variable:

```typescript
const corsOptions = {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
};
```

Make sure to set `CLIENT_URL` correctly in production.

## Security

- ✅ JWT tokens stored in HTTP-only cookies
- ✅ Password hashing with bcrypt
- ✅ CSRF protection for OAuth
- ✅ Email verification required
- ✅ Secure password reset flow
- ✅ Input validation
- ✅ Protected API routes

## Dependencies

Key dependencies:
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **cookie-parser** - Cookie handling
- **cors** - CORS support
- **mailtrap** - Email service
- **google-auth-library** - Google OAuth
- **socket.io** - Real-time WebSocket communication

## Real-Time / WebSocket Support

The backend includes Socket.io for real-time features:

### Socket Manager (`backend/socket/socketManager.ts`)

Central class managing WebSocket connections with:
- **Cookie-based JWT authentication** - Same auth as REST API
- **Room-based broadcasting** - Scoped event delivery (project, suite, testcase rooms)
- **Collaborative editing support** - Live field updates between users

### Usage in Controllers

```typescript
import { socketManager } from '../../socket/socketManager.js';

// After any CRUD operation, emit the event
socketManager.emitToProject(projectId, 'testcase:created', { testCase, suiteId });
socketManager.emitToSuite(suiteId, 'testcase:updated', { testCase });
```

### Available Methods

| Method | Description |
|--------|-------------|
| `emitToProject(projectId, event, data)` | Broadcast to all users viewing a project |
| `emitToSuite(suiteId, event, data)` | Broadcast to users viewing a specific suite |
| `emitToTestCase(testCaseId, event, data)` | Broadcast to users editing a test case |

For detailed documentation, see [REALTIME_ARCHITECTURE.md](../Documentation/REALTIME_ARCHITECTURE.md).

## Development Tips

- Use `npx tsx watch index.ts` for hot-reloading during development
- Check `npm run type-check` before committing
- Test both development and production builds locally
- Ensure all environment variables are set correctly

## Support

For deployment issues, see:
- [Separate Vercel Deployment Guide](../Documentation/Deployment/VERCEL_SEPARATE_DEPLOYMENT.md)
- [Traditional Deployment Guide](../Documentation/Deployment/DEPLOYMENT.md)
- [Environment Comparison](../Documentation/Deployment/ENVIRONMENT_COMPARISON.md)
