/**
 * Signup form data
 */
export interface SignupFormData {
  email: string;
  password: string;
  name: string;
}

/**
 * Login form data
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Email verification form data
 */
export interface VerifyEmailFormData {
  code: string;
}

/**
 * Forgot password form data
 */
export interface ForgotPasswordFormData {
  email: string;
}

/**
 * Reset password form data
 */
export interface ResetPasswordFormData {
  password: string;
  confirmPassword?: string;
}

/**
 * Change password form data
 */
export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

/**
 * Auth state interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  error: string | null;
  isLoading: boolean;
  isCheckingAuth: boolean;
  message: string | null;
}
