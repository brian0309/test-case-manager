<h1 align="center">Test Case Manager 🧪</h1>

<p align="center">
   <a href="https://github.com/brian0309/test-case-manager/actions/workflows/tests.yml">
      <img src="https://github.com/brian0309/test-case-manager/actions/workflows/tests.yml/badge.svg" alt="Tests Status" />
   </a>
   <a href="https://github.com/brian0309/test-case-manager/actions/workflows/lint.yml">
      <img src="https://github.com/brian0309/test-case-manager/actions/workflows/lint.yml/badge.svg" alt="Lint Status" />
   </a>
   <a href="https://github.com/brian0309/test-case-manager/actions/workflows/typecheck.yml">
      <img src="https://github.com/brian0309/test-case-manager/actions/workflows/typecheck.yml/badge.svg" alt="Type Check Status" />
   </a>
   <a href="https://github.com/brian0309/test-case-manager/actions/workflows/deploy.yml">
      <img src="https://github.com/brian0309/test-case-manager/actions/workflows/deploy.yml/badge.svg" alt="Deploy Status" />
   </a>
</p>

<p align="center">
   <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.3.3-blue?logo=typescript" />
   <img alt="Backend" src="https://img.shields.io/badge/Backend-100%25%20TypeScript-blueviolet" />
   <img alt="Frontend" src="https://img.shields.io/badge/Frontend-100%25%20TypeScript-blueviolet" />
   <img alt="Real-Time" src="https://img.shields.io/badge/Real--Time-Socket.io-brightgreen" />
</p>

<p align="center">
   <a href="https://ko-fi.com/briancarlo" target="_blank" style="display:inline-block; background:linear-gradient(135deg, #FF5E5B, #FF8C42); color:#ffffff; padding:10px 24px; border-radius:8px; font-size:14px; font-weight:bold; text-decoration:none; box-shadow:0 2px 8px rgba(255,94,91,0.35); font-family:Helvetica, Arial, sans-serif;">
      ☕ Support Me on Ko-fi
   </a>
</p>

![ChatGPT Homepage Suite - Test Cases](./screenshots/04-cases.png)

> 📸 See the [Screenshots Guide](./Documentation/SCREENSHOTS.md) for a complete walkthrough from dashboard to ticket creation.

A full-stack **test case management system** built with the MERN stack (MongoDB, Express, React, Node.js). Organize your QA workflow with projects, test suites, test cases, and test runs—featuring real-time collaborative editing, AI-powered test generation, comprehensive reporting, and a modern dashboard UI.

## ✨ Key Highlights

- 📁 **Projects & Test Suites** – Organize test cases into projects with customizable fields and nested test suites
- 📝 **Test Cases** – Create, edit, clone, and bulk-manage test cases with priority, status, steps, and expected results
- ⚡ **Virtualized Tables** – TanStack React Virtual keeps large test case lists fast and responsive
- 🚀 **Test Runs** – Execute test cases, track results (Pass/Fail/Blocked/Skipped), and record actual outcomes
- 🎫 **Tickets & Discussions** – Track bugs with full lifecycle management and thread comments on cases and tickets
- 📊 **Reports & Analytics** – Visual dashboards with execution statistics, pass rates, and trend analysis
- 👥 **Real-Time Collaboration** – Google Docs-style live editing with presence indicators via Socket.io
- 🤖 **Multi-Provider AI Generation** – Generate test cases automatically using Gemini, OpenAI, OpenRouter, Anthropic, or DeepSeek
- 🔐 **Secure Authentication** – JWT-based auth with email/password and Google OAuth 2.0

### Installation

See the "Getting Started" section below for a consolidated, full installation and running guide.
## 📘 Documentation & Resources

This project covers:
- Full-stack MERN development with TypeScript
- Test case management best practices
- Real-time collaboration with Socket.io
- JWT authentication & OAuth 2.0
- AI integration (Gemini) for test generation
- Modern React patterns with Zustand
- Tailwind CSS styling
- Comprehensive API design

**TypeScript Migration:** See [`migrate-to-typescript.md`](./Documentation/Migration/migrate-to-typescript.md) for migration details.

**Recommended:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Socket.io Documentation](https://socket.io/docs/v4/)

## 🌟 Features Implemented

### Test Management Features

-   📁 **Projects** – Create and manage testing projects with custom fields and member collaboration
-   👥 **Project Members** – Add/remove members who share access to a project
-   ⚙️ **Project Settings** – Hide default fields/columns and define custom fields (text, long text, dropdown, rich text) per project
-   📂 **Test Suites** – Organize test cases into logical groupings within projects
-   📝 **Test Cases** – Full CRUD with priority, status, steps, expected results, custom fields, areas, tags, and assigned testers
-   🔄 **Bulk Operations** – Clone, move, delete, and reorder multiple test cases at once
-   📥 **Import Test Cases** – Bulk import test cases from CSV/Excel, with or without creating a suite
-   📤 **Export Test Cases** – Export test cases with selectable columns to CSV/Excel
-   🚀 **Test Runs** – Execute test cases and record Pass/Fail/Blocked/Skipped results
-   🏃 **Run Execution Wizard** – Step-by-step guided execution with pass/fail/skip/retry; failing an item prompts instant bug-ticket creation
-   📁 **Run Groups** – Organize test runs into nested, color-coded groups (children reparent on group deletion)
-   🏷️ **Tags & Environments** – Tag test runs and track execution environments (staging, production, etc.)
-   ⏱️ **Run Item Details** – Track time spent, attachments, assignees, and execution timestamps per test run item
-   🎫 **Tickets** – Bug/defect tracking with status, priority, severity, assignee, tags, attachments, and links to related run items
-   💬 **Discussions** – Threaded comments on test cases and tickets with fix-state tracking and attachments
-   ⚙️ **System Messages** – Run item executions and ticket status changes automatically post status updates to discussions
-   📊 **Reports & Analytics** – Visual dashboards with execution statistics, trends, suite comparisons, and test case health (flaky tests, never executed); exportable to CSV/PDF
-   📈 **Dashboard Statistics** – Aggregated project overview stats via `/api/statistics`
-   🖼️ **Rich Text Editing** – Tiptap-based WYSIWYG editor with image uploads to S3-compatible storage
-   🤖 **AI Generation** – Generate test cases automatically from **multiple AI providers**: Gemini, OpenAI, OpenRouter, Anthropic Claude, and DeepSeek
-   📜 **History Tracking** – Full audit trail of test case changes with snapshots, viewable and **restorable** to any previous version

### Real-Time Collaboration

-   📡 **WebSocket Integration** – Socket.io for instant updates across all clients
-   👥 **Live Presence** – See who's viewing and editing in real-time (projects, test cases, and tickets)
-   ✏️ **Collaborative Editing** – Google Docs-style field-level live editing for test cases and tickets
-   🔄 **Automatic Sync** – UI updates instantly when team members make changes
-   💬 **Real-Time Discussions** – New/updated/deleted discussion messages broadcast instantly

### Authentication Features

-   🔑 **Email/Password Auth** - User registration with password hashing and JWT
-   📧 **Email Verification** - Mailtrap integration with OTP-style verification (24h token validity, 5-min resend cooldown)
-   🔄 **Password Reset Flow** - Secure forgot/reset password via email (1-hour token expiry)
-   🔒 **Change Password** - Update password for logged-in users
-   🌐 **Google OAuth 2.0** - One-click sign in with Google
-   🛡️ **CSRF Protection** - State parameter validation for OAuth
-   🔗 **Account Linking** - Link Google to existing email/password account
-   🍪 **HTTP-Only Cookies** - Secure token storage

### Frontend Features

-   🧪 **Test Manager UI** - Full-featured test case management interface
-   📁 **Projects Page** - Create and manage testing projects
-   📂 **Test Suites Page** - Organize test cases into suites
-   📝 **Test Cases Page** - Table view with inline editing and bulk operations
-   ⚡ **Virtualized Table** - TanStack React Virtual keeps large lists responsive
-   🚀 **Test Runs Page** - Execute tests and record results
-   🎫 **Tickets Page** - Track and manage bugs/defects linked to runs
-   📊 **Reports Page** - Analytics dashboards and execution statistics
-   🏠 **Dashboard** - Overview with quick actions and recent activity
-   📈 **Analytics Page** - Interactive charts with Recharts
-   ⚙️ **Settings Page** - Profile, security, AI provider preferences, and API key management
-   🧠 **AI Generation Modal** - Stream test cases from Gemini, OpenAI, OpenRouter, Anthropic, or DeepSeek with per-provider model selection
-   🎛️ **Filtering** - Filter modal for narrowing down test cases and tickets
-   📄 **Report Export** - Download analytics as CSV or print-to-PDF
-   📄 **Pagination** - Paginated case/run/ticket lists and infinite scroll on projects
-   🧷 **Deep Links** - Shareable URLs for specific test cases, runs, run groups, and tickets
-   🖼️ **Rich Text Editor** - Tiptap editor with S3-backed image uploads (test descriptions, steps, discussions)
-   🗑️ **Type-to-Confirm Deletion** - Typing confirms destructive actions
-   🎨 **Modern UI** - Tailwind CSS with Framer Motion animations
-   🌙 **Dark Mode** - Light/dark theme toggle
-   📱 **Responsive Design** - Works on desktop and mobile
-   🎯 **State Management** - Zustand for global state
-   🔔 **Toast Notifications** - User feedback with react-hot-toast
-   📦 **Code Splitting** - Lazy-loaded routes and error boundaries

### Developer Experience

-   📚 **Comprehensive Documentation** - Detailed guides for adding new features
-   🧪 **Backend Testing** - Jest + Supertest with unit, integration, and service tests (mongodb-memory-server)
-   🧪 **Frontend Testing** - Vitest + Testing Library for components and flows
-   🔍 **Type Safety** - Full TypeScript coverage on frontend and backend
-   📖 **Feature Guide** - Step-by-step instructions in `Documentation/ADDING_FEATURES.md`
-   📡 **Real-Time Architecture** - Socket.io patterns documented in `Documentation/REALTIME_ARCHITECTURE.md`

## 🚀 Getting Started

### Prerequisites

-   Node.js (v14 or higher)
-   MongoDB (local or Atlas)
-   Google Cloud Console account (for OAuth)
-   Mailtrap account (for email testing)

### Setup Environment Variables

Create a `.env` file in the root directory.

Example (development):

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=your_mongo_uri

# JWT
JWT_SECRET=your_secret_key

# Mailtrap (Email Service)
MAILTRAP_TOKEN=your_mailtrap_token
MAILTRAP_ENDPOINT=https://send.api.mailtrap.io/
# Optional: override the "from" address and display name used for sent emails
# If not set, the app falls back to mailtrap@demomailtrap.com /"MERN Auth"
MAILTRAP_SENDER_EMAIL=mailtrap@demomailtrap.com
MAILTRAP_SENDER_NAME=MERN Auth

# Google OAuth 2.0 (development)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Comma-separated list of allowed redirect URIs (required)
# Used by the backend to validate the configured callback
GOOGLE_ALLOWED_REDIRECT_URIS=http://localhost:5000/api/auth/google/callback

# CORS Configuration
# Comma-separated list of allowed origins (required)
# Include all frontend URLs that should be allowed to make requests to the backend
ALLOWED_ORIGINS=http://localhost:5173

# Frontend URL (deprecated - use ALLOWED_ORIGINS instead)
# Kept for backward compatibility
CLIENT_URL=http://localhost:5173

# Encryption key for AI provider API key storage (must be 32 characters)
ENCRYPTION_KEY=your_32_char_encryption_key_here

# Optional: OpenRouter request identification headers (sent to OpenRouter)
#OPENROUTER_HTTP_REFERER=https://your-app.com
#OPENROUTER_TITLE=Test Case Manager

# Optional: Mailtrap template UUID for welcome emails (falls back to local HTML)
#MAILTRAP_WELCOME_TEMPLATE_UUID=your_mailtrap_template_uuid

# S3-Compatible Storage (Cloudflare R2, AWS S3, MinIO, etc.)
# Required for image uploads in the rich text editor
S3_ACCESS_KEY_ID=your_s3_access_key_id
S3_SECRET_ACCESS_KEY=your_s3_secret_access_key
# For Cloudflare R2: https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_BUCKET_NAME=your-bucket-name
# For Cloudflare R2 use 'auto', for AWS S3 use your region (e.g., 'us-east-1')
S3_REGION=auto
# Optional: Public URL for uploaded files (falls back to S3_ENDPOINT/S3_BUCKET_NAME/key)
S3_PUBLIC_URL=https://your-custom-domain.com

# Optional: Custom DNS servers for development (defaults to 1.1.1.1,8.8.8.8)
#DNS_OVERRIDE_SERVERS=1.1.1.1,8.8.8.8

# Optional: cookie domain for auth cookies (e.g., .example.com)
#COOKIE_DOMAIN=
```

Production / Render example (use your actual domain):

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Google OAuth 2.0 (production)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-app.onrender.com/api/auth/google/callback

# Allowed redirect URIs (required)
GOOGLE_ALLOWED_REDIRECT_URIS=https://your-app.onrender.com/api/auth/google/callback

# CORS Configuration (required)
# Add all your frontend URLs, including preview deployments if needed
# Example: ALLOWED_ORIGINS=https://your-app.onrender.com,https://preview-123.onrender.com
ALLOWED_ORIGINS=https://your-app.onrender.com

# Frontend URL (deprecated - use ALLOWED_ORIGINS instead)
# Kept for backward compatibility
CLIENT_URL=https://your-app.onrender.com
```

**Important Notes:**

**CORS Configuration:**
- `ALLOWED_ORIGINS` is now **required** and must be a comma-separated list of all frontend URLs allowed to make requests to the backend
- Examples:
  - Development: `ALLOWED_ORIGINS=http://localhost:5173`
  - Production: `ALLOWED_ORIGINS=https://your-app.onrender.com`
  - Multiple origins: `ALLOWED_ORIGINS=https://your-app.vercel.app,https://preview-123.vercel.app,https://preview-456.vercel.app`
- `CLIENT_URL` is deprecated but kept for backward compatibility. Use `ALLOWED_ORIGINS` instead.

**Google OAuth:**
- `GOOGLE_REDIRECT_URI` must exactly match one of the Authorized redirect URIs configured in your Google Cloud Console for the OAuth client.
- `GOOGLE_ALLOWED_REDIRECT_URIS` is **required** and must be a comma-separated list of valid redirect URIs the backend will accept.
- On Render, set both `GOOGLE_REDIRECT_URI` and `GOOGLE_ALLOWED_REDIRECT_URIS` in the service's environment settings (do not commit secrets to source control).

### Notes on Google redirect URIs

- `GOOGLE_REDIRECT_URI` should contain the exact callback URL that Google will redirect to after auth, for example `http://localhost:5000/api/auth/google/callback` in development or `https://your-app.onrender.com/api/auth/google/callback` in production.
- `GOOGLE_ALLOWED_REDIRECT_URIS` is **required** and must be a comma-separated list of valid redirect URIs. In production you should include your deployed callback URL here. The same deployed callback URL must also be added in your Google Cloud Console (APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs).

### Google OAuth Setup (Step-by-Step)

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a New Project**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter project name (e.g., "MERN Auth App")
   - Click "Create"

3. **Enable Google+ API**
   - In the search bar, type "Google+ API"
   - Click on "Google+ API"
   - Click "Enable"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" user type
   - Click "Create"
   - Fill in the required fields:
     - App name: Your app name
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Skip the Scopes section (click "Save and Continue")
   - Add test users if needed
   - Click "Save and Continue"

5. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Name: "MERN Auth Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (frontend URL)
     - `http://localhost:5000` (backend URL)
   - Authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback`
   - Click "Create"

6. **Copy Credentials**
   - Copy the Client ID and Client Secret
   - Paste them into your `.env` file:
     ```
     GOOGLE_CLIENT_ID=your_client_id_here
     GOOGLE_CLIENT_SECRET=your_client_secret_here
     ```

7. **Update for Production**
   - When deploying, add your production URLs to:
     - Authorized JavaScript origins
     - Authorized redirect URIs
   - Update `.env` with production URLs

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mern-advanced-auth
   ```

2. **Install dependencies**
   ```bash
   npm run build
   ```
   This will install both backend and frontend dependencies.

### Running the Application

**Development Mode:**
```bash
npm run dev
```
This starts the backend server with nodemon for hot-reloading.

**Production Mode:**
```bash
npm run start
```

**Frontend (separate terminal):**
```bash
cd frontend
npm run dev
```

**Lint:**
```bash
# Backend
npm run lint:backend

# Frontend
cd frontend && npm run lint
```

**Type-check:**
```bash
# Backend
npm run type-check

# Frontend
cd frontend && npm run type-check
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## 📁 Project Structure

```
mern-advanced-auth/
├── backend/
│   ├── config/
│   │   └── googleAuth.ts            # Google OAuth configuration
│   ├── controllers/
│   │   ├── auth.controller.ts       # Auth endpoints
│   │   └── googleAuth.controller.ts # Google OAuth endpoints
│   ├── db/
│   │   └── connectDB.ts             # MongoDB connection
│   ├── mailtrap/
│   │   ├── emails.ts                # Email sending functions
│   │   ├── emailTemplates.ts        # HTML email templates
│   │   └── mailtrap.config.ts       # Mailtrap configuration
│   ├── middleware/
│   │   └── verifyToken.ts           # JWT verification middleware
│   ├── models/
│   │   └── user.model.ts            # User schema
│   ├── routes/
│   │   └── auth.route.ts            # Auth routes
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   ├── express.d.ts
│   │   ├── index.ts
│   │   └── user.types.ts
│   └── utils/
│       └── generateTokenAndSetCookie.ts
│   └── index.ts                     # Backend entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── FloatingShape.tsx
│   │   │   ├── GoogleLoginButton.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── PasswordStrengthMeter.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── SidebarMenuLayout.tsx
│   │   ├── pages/
│   │   │   ├── ChangePasswordPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EmailVerificationPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── OAuthRedirect.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── SignUpPage.tsx
│   │   │   ├── analytics/
│   │   │   │   └── index.tsx
│   │   │   ├── calendar/
│   │   │   │   └── index.tsx
│   │   │   ├── messages/
│   │   │   │   └── index.tsx
│   │   │   ├── posts/
│   │   │   │   └── index.tsx
│   │   │   └── users/
│   │   │       └── index.tsx
│   │   ├── store/
│   │   │   └── authStore.ts         # Zustand state management
│   │   ├── types/
│   │   │   ├── api.types.ts
│   │   │   ├── auth.types.ts
│   │   │   ├── component.types.ts
│   │   │   ├── index.ts
│   │   │   ├── store.types.ts
│   │   │   └── user.types.ts
│   │   ├── utils/
│   │   │   └── date.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── vite-env.d.ts
│   ├── public/
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.js
├── migrate-to-typescript.md
├── package.json
├── README.md
└── ...
```

## 🔑 Key API Endpoints

All API endpoints are prefixed with `/api`. Authentication endpoints are under `/api/auth`.

> 📖 **For detailed API structure and how to add new features**, see [API URL Structure Guide](./Documentation/API_URL_STRUCTURE.md)

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

### Test Case Management

**Projects** (`/api/projects`)
- `POST /` - Create project · `GET /` - List projects · `GET /:id` - Get project
- `PUT /:id` - Update project · `DELETE /:id` - Delete project
- `POST /:id/members` - Add member · `DELETE /:id/members/:memberId` - Remove member
- `GET /:id/settings` / `PUT /:id/settings` - Get/update project settings (custom fields, hidden fields/columns)
- `DELETE /:id/settings/custom-fields/:fieldId` - Permanently delete custom field data

**Test Suites** (`/api/projects/:projectId/suites`, `/api/suites`)
- `POST /` / `GET /` - Create/list suites within a project
- `GET /:id` / `PUT /:id` / `DELETE /:id` - Suite CRUD

**Test Cases** (`/api/projects/:projectId/cases`, `/api/suites/:suiteId/cases`, `/api/cases`)
- `POST /` / `GET /` - Create/list test cases in a suite
- `GET /areas` - List distinct areas · `POST /bulk-import` - Bulk import (CSV/Excel, optionally creating a suite)
- `PATCH /reorder` - Reorder test cases
- `GET /:id` / `PUT /:id` / `DELETE /:id` - Test case CRUD · `POST /:id/clone` - Clone a test case
- `PATCH /bulk-status` - Bulk status update · `DELETE /bulk` - Bulk delete

**Test Runs** (`/api/projects/:projectId/runs`, `/api/runs`)
- `POST /` / `GET /` - Create/list runs · `GET /tags` - List distinct tags
- `GET /:id` / `PUT /:id` / `DELETE /:id` - Run CRUD
- `PATCH /:id/items/:itemId` - Update run item (status, actual result, time spent, attachments)
- `PATCH /:id/reorder` - Reorder run items · `POST /:id/clone` - Clone a run · `POST /:id/complete` - Complete a run

**Run Groups** (`/api/projects/:projectId/run-groups`, `/api/run-groups`)
- `POST /` / `GET /` - Create/list run groups · `GET /:id` / `PUT /:id` / `DELETE /:id` - Group CRUD

**Tickets** (`/api/projects/:projectId/tickets`, `/api/tickets`)
- `POST /` / `GET /` - Create/list tickets · `GET /by-run/:runId` - Tickets linked to a run
- `GET /:id` / `PUT /:id` / `DELETE /:id` - Ticket CRUD

**Discussions** (`/api/cases/:testCaseId/discussions`, `/api/tickets/:ticketId/discussions`)
- `GET /` / `POST /` - List/create messages
- `DELETE /:messageId` - Delete a message · `PATCH /:messageId/fix-state` - Update fix-state

### AI Test Generation

Per-provider endpoints (all protected; keys are encrypted at rest and per-user):
- `POST /api/gemini/key` · `GET /api/gemini/settings` · `GET /api/gemini/models`
- `POST /api/gemini/generate` · `POST /api/gemini/generate-stream`
- Same pattern for `/api/openrouter`, `/api/openai`, `/api/anthropic`, `/api/deepseek`

### Reports, Statistics & Uploads

- `GET /api/statistics` - Dashboard overview statistics
- `GET /api/reports/project/:projectId/summary` - Project summary report
- `GET /api/reports/project/:projectId/trends` - Time-series trend data (day/week/month)
- `GET /api/reports/project/:projectId/suite-comparison` - Suite pass-rate comparison
- `GET /api/reports/project/:projectId/test-case-health` - Flaky/never-executed/most-failing cases
- `GET /api/reports/run/:runId/detailed` - Detailed run report
- `POST /api/upload/presigned-url` - Generate presigned URL for image upload (S3-compatible storage)

## 🛠️ Technologies Used

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Mailtrap** - Email service
- **google-auth-library** - Google OAuth
- **cookie-parser** - Cookie handling
- **cors** - Cross-origin resource sharing
- **Socket.io** - Real-time collaboration
- **@aws-sdk/client-s3** - S3-compatible image uploads (Cloudflare R2, AWS S3, MinIO)
- **AI SDKs** - Gemini, OpenAI, OpenRouter, Anthropic, DeepSeek (streaming + encrypted key storage)

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Routing
- **Zustand** - State management
- **TanStack React Virtual** - Virtualized lists/tables
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **Socket.io Client** - Real-time updates
- **Recharts** - Analytics charts
- **Tiptap** - Rich text editor
- **PapaParse / SheetJS (xlsx)** - CSV/Excel import & export
- **@dnd-kit** - Drag-and-drop reordering

## 🔐 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT tokens stored in HTTP-only cookies
- ✅ CSRF protection for OAuth
- ✅ Email verification required
- ✅ Secure password reset flow
- ✅ Token expiration handling
- ✅ Protected API routes
- ✅ Input validation
- ✅ Google OAuth 2.0 with state parameter
- ✅ API rate limiting on test run, ticket, and upload routes

## 📝 Additional Notes

- **OAuth Account Linking**: If a user signs up with email/password and later uses Google OAuth with the same email, the accounts are automatically linked.
- **Email Verification**: Google OAuth users are automatically verified since Google verifies email addresses.
- **Password Strength**: The app includes a real-time password strength meter for better security.
- **Responsive Design**: The entire application is mobile-friendly and works on all screen sizes.

## 🚀 Deployment

### Deployment Options

This application supports **flexible deployment strategies**:

#### 🎯 Separate Vercel Deployment (Recommended)

Deploy frontend and backend as **separate Vercel projects** for maximum flexibility and performance:


**Deploy Backend:**

[![Deploy Backend to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brian0309/mern-advanced-auth&project-name=mern-auth-backend&root-directory=backend&env=MONGO_URI,JWT_SECRET,MAILTRAP_TOKEN,MAILTRAP_ENDPOINT,MAILTRAP_SENDER_EMAIL,MAILTRAP_SENDER_NAME,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,GOOGLE_REDIRECT_URI,CLIENT_URL,NODE_ENV)

**Deploy Frontend:**

[![Deploy Frontend to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brian0309/mern-advanced-auth&project-name=mern-auth-frontend&root-directory=frontend&env=VITE_API_URL)

📖 **[Complete Guide: Separate Vercel Deployment →](./Documentation/Deployment/VERCEL_SEPARATE_DEPLOYMENT.md)**

> 🔧 **Troubleshooting Connection Issues?** See the [Vercel Connection Fix Guide](./Documentation/VERCEL_CONNECTION_FIX.md) for common issues and solutions.

#### 🐳 CapRover Deployment

Deploy to your own CapRover instance with automated CI/CD via GitHub Actions.

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `CAPROVER_SERVER` | Your CapRover server URL (e.g., `https://captain.your-domain.com`) |
| `APP_NAME` | Your CapRover app name |
| `APP_TOKEN` | Deploy token from CapRover dashboard |

**CI/CD Pipeline:**

On push to `main`, the workflow:
1. Runs all tests (lint, type-check, unit/integration tests)
2. Builds the Docker image
3. Pushes to GitHub Container Registry (GHCR)
4. Deploys to CapRover

**Files:**
- `captain-definition` - CapRover deployment config
- `.github/workflows/deploy.yml` - GitHub Actions workflow

#### 🔄 Traditional Hosting

Deploy to platforms like Heroku, Render, Railway, DigitalOcean, AWS, etc. as a single application:

```bash
npm run build
npm start
```

📖 **[Complete Guide: Traditional Deployment →](./Documentation/Deployment/DEPLOYMENT.md)**

### Deployment Compatibility

**This application works on ALL platforms with the same code!** ✨

- ✅ **Local Development** - `npm run dev` (works exactly as before)
- ✅ **Traditional Hosting** - Heroku, Render, Railway, DigitalOcean, AWS, etc.
- ✅ **Vercel Separate** - Deploy frontend and backend independently
- ✅ **Vercel Monolithic** - Deploy as a single application (use `vercel.json.monolithic`)

The app automatically detects the environment and adapts. **No code changes needed!**

📖 **Additional Documentation:**

- [Deployment Guide](./Documentation/Deployment/DEPLOYMENT.md) - Traditional hosting
- [Separate Vercel Deployment](./Documentation/Deployment/VERCEL_SEPARATE_DEPLOYMENT.md) - Separate Vercel deployment
- [Vercel Connection Fix](./Documentation/VERCEL_CONNECTION_FIX.md) - **Fix frontend-backend connection issues**
- [Environment Comparison](./Documentation/Deployment/ENVIRONMENT_COMPARISON.md) - Compare deployment environments
- [Vercel Configuration](./Documentation/Deployment/VERCEL_CONFIG.md) - Vercel config explained

These files live in `Documentation/Deployment/`.

## 📚 Learning Resources

This project covers:
- Full-stack MERN development
- JWT authentication
- OAuth 2.0 implementation
- Email verification systems
- Password reset flows
- Modern React patterns
- State management with Zustand
- Tailwind CSS styling
- API design and security

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements.

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

Copyright (c) 2026 Brian Carlo (brian0309)

---

**Happy Coding! 🚀**
