<h1 align="center">Advanced MERN Auth Application 🔒</h1>

<p align="center">
   <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.3.3-blue?logo=typescript" />
   <img alt="Backend" src="https://img.shields.io/badge/Backend-100%25%20TypeScript-blueviolet" />
   <img alt="Frontend" src="https://img.shields.io/badge/Frontend-100%25%20TypeScript-blueviolet" />
   <img alt="Status" src="https://img.shields.io/badge/Migration-Complete-brightgreen" />
</p>

![Demo App](/frontend/public/screenshot-for-readme.png)

A full-stack authentication system built with the MERN stack (MongoDB, Express, React, Node.js) featuring advanced authentication methods including email/password and Google OAuth, complete with email verification, password reset, and a modern dashboard UI.

> **🟦 Now fully migrated to TypeScript!**
> - Backend and frontend are 100% TypeScript
> - All scripts, types, and configs updated
> - See [`migrate-to-typescript.md`](./Documentation/Migration/migrate-to-typescript.md) for migration details
### Installation

See the "Getting Started" section below for a consolidated, full installation and running guide.
## 📘 TypeScript & Learning Resources

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
   - **TypeScript best practices (see [`migrate-to-typescript.md`](./Documentation/Migration/migrate-to-typescript.md))**

**Recommended:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript with Express](https://blog.logrocket.com/how-to-set-up-node-typescript-express/)

## 🌟 Features Implemented

### Backend Features

-   🔧 **Backend Setup** - Express.js server with MongoDB integration
-   🗄️ **Database Setup** - MongoDB with Mongoose ODM
-   🔐 **Signup Endpoint** - User registration with password hashing
-   📧 **Email Verification System** - Mailtrap integration for email verification
-   🔍 **Verify Email Endpoint** - Token-based email verification
-   📄 **Welcome Email Template** - Professional HTML email templates
-   🚪 **Logout Endpoint** - Secure session termination
-   🔑 **Login Endpoint** - JWT-based authentication
-   🔄 **Forgot Password Flow** - Password reset via email
-   🔁 **Reset Password Endpoint** - Secure password reset with tokens
-   ✔️ **Check Auth Endpoint** - Protected route middleware
-   🔒 **Change Password Endpoint** - Update password for logged-in users
-   � **Google OAuth 2.0 Integration** - Sign in with Google
-   🛡️ **CSRF Protection** - State parameter validation for OAuth
-   🔗 **Account Linking** - Link Google account to existing email/password account
-   🍪 **HTTP-Only Cookies** - Secure token storage
-   🏗️ **Feature-Based Architecture** - Modular backend structure with example implementation

### Frontend Features

-   🌐 **React + Vite Setup** - Fast development environment
-   🎨 **Tailwind CSS** - Modern, responsive UI design
-   ✨ **Framer Motion** - Smooth animations and transitions
-   � **Signup Page UI** - Clean registration interface
-   🔓 **Login Page UI** - User-friendly login form
-   � **Google Login Button** - One-click Google authentication
-   ✅ **Email Verification Page** - OTP-style verification code input
-   � **Password Strength Meter** - Real-time password strength indicator
-   � **Protected Routes** - Client-side route protection
-   🏠 **Dashboard Page** - Feature-rich user dashboard with:
    -   � Analytics section
    -   📅 Calendar integration
    -   👥 Users management
    -   📝 Posts management
    -   💬 Messages section
-   ⚙️ **Settings Page** - Comprehensive user settings with tabs:
    -   General settings (profile, language, timezone)
    -   Security settings (password change)
    -   Additional sections (billing, notifications, apps, etc.)
-   🔐 **Change Password Page** - Dedicated password update interface
-   🔄 **OAuth Redirect Handler** - Seamless Google OAuth callback handling
-   💡 **Example Feature Page** - Demonstrates feature-based architecture integration
-   📱 **Responsive Design** - Mobile-friendly interface
-   🎯 **State Management** - Zustand for global state
-   🔔 **Toast Notifications** - User feedback with react-hot-toast

### Developer Experience

-   📚 **Comprehensive Documentation** - Detailed guides for adding new features
-   🧪 **Testing Setup** - Jest with unit and integration test examples
-   🔍 **Type Safety** - Full TypeScript coverage on frontend and backend
-   📖 **Feature Guide** - Step-by-step instructions in `Documentation/ADDING_FEATURES.md`

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

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Routing
- **Zustand** - State management
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

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

ISC

---

**Happy Coding! 🚀**
