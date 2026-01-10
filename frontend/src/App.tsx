import { Navigate, Route, Routes, Outlet, useLocation } from "react-router-dom";

import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import DashboardPage from "./pages/DashboardPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import OAuthRedirect from "./pages/OAuthRedirect";
import AppLayout from "./components/AppLayout";
import LoadingSpinner from "./components/LoadingSpinner";

// Import the new page components

import CalendarPage from "./pages/calendar";
import AnalyticsPage from "./pages/analytics";

// Test Manager Pages
import TestManagerLayout from "./pages/testManager/TestManagerLayout";
import ProjectsPage from "./pages/testManager/ProjectsPage";
import TestCasesPage from "./pages/testManager/TestCasesPage";
import TestSuitesPage from "./pages/testManager/TestSuitesPage";
import TestPlansPage from "./pages/testManager/TestPlansPage";
import TestRunsPage from "./pages/testManager/TestRunsPage";
import ReportsPage from "./pages/testManager/ReportsPage";

import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { useEffect } from "react";

// Type for component props
interface ProtectedRouteProps {
  children: React.ReactNode;
}

interface RedirectAuthenticatedUserProps {
  children: React.ReactNode;
}

// protect routes that require authentication
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  if (!user?.isVerified) {
    return <Navigate to='/verify-email' replace />;
  }

  return <>{children}</>;
};

// redirect authenticated users to the home page
const RedirectAuthenticatedUser: React.FC<RedirectAuthenticatedUserProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated && user?.isVerified) {
    return <Navigate to='/' replace />;
  }

  // If user is authenticated but not verified, and they're not on the verify-email page,
  // redirect them to verify-email
  if (isAuthenticated && user && !user.isVerified && location.pathname !== '/verify-email') {
    return <Navigate to='/verify-email' replace />;
  }

  return <>{children}</>;
};

// Public route layout
const PublicRoute: React.FC = () => (
	<div className='min-h-screen bg-background dark:bg-background-dark flex items-center justify-center p-4'>
		<Outlet />
	</div>
);

function App() {
  const { isCheckingAuth, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <LoadingSpinner />;

  return (
    <>
      <Toaster position='top-right' />

      <Routes>
        <Route element={<PublicRoute />}>
          <Route
            path='/signup'
            element={
              <RedirectAuthenticatedUser>
                <SignUpPage />
              </RedirectAuthenticatedUser>
            }
          />
          <Route
            path='/login'
            element={
              <RedirectAuthenticatedUser>
                <LoginPage />
              </RedirectAuthenticatedUser>
            }
          />
          <Route
            path='/verify-email'
            element={
              <RedirectAuthenticatedUser>
                <EmailVerificationPage />
              </RedirectAuthenticatedUser>
            }
          />
          <Route
            path="/oauth-redirect"
            element={
              <RedirectAuthenticatedUser>
                <OAuthRedirect />
              </RedirectAuthenticatedUser>
            }
          />
          <Route
            path='/forgot-password'
            element={
              <RedirectAuthenticatedUser>
                <ForgotPasswordPage />
              </RedirectAuthenticatedUser>
            }
          />
          <Route
            path='/reset-password/:token'
            element={
              <RedirectAuthenticatedUser>
                <ResetPasswordPage />
              </RedirectAuthenticatedUser>
            }
          />
        </Route>

        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path='dashboard' element={<DashboardPage />} />

          <Route path='calendar' element={<CalendarPage />} />
          <Route path='analytics' element={<AnalyticsPage />} />

          <Route path='settings' element={<SettingsPage />} />

          {/* Test Manager Routes */}
          <Route path='test-manager' element={<TestManagerLayout />}>
            <Route index element={<Navigate to="/test-manager/projects" replace />} />
            <Route path='projects' element={<ProjectsPage />} />
            <Route path='cases' element={<TestCasesPage />} />
            <Route path='suites' element={<TestSuitesPage />} />
            <Route path='plans' element={<TestPlansPage />} />
            <Route path='runs' element={<TestRunsPage />} />
            <Route path='reports' element={<ReportsPage />} />
          </Route>
        </Route>

        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </>
  );
}

export default App;
