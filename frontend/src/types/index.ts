/**
 * Central export file for all frontend TypeScript types
 * Import types from here: import { User, AuthStoreState } from '../types';
 */

// User types
export type { User, UpdateUserProfileDTO } from "./user.types";

// Auth types
export type {
  SignupFormData,
  LoginFormData,
  VerifyEmailFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  ChangePasswordFormData,
  AuthState,
} from "./auth.types";

// API types
export type {
  ApiResponse,
  AuthApiResponse,
  VerificationApiResponse,
  CheckAuthApiResponse,
  GoogleOAuthUrlResponse,
  ErrorApiResponse,
  AxiosErrorResponse,
} from "./api.types";

// Store types
export type { AuthStoreState } from "./store.types";

// Component types
export type {
  InputProps,
  FloatingShapeProps,
  PasswordStrengthMeterProps,
  PasswordCriteriaProps,
  LoadingSpinnerProps,
  GoogleLoginButtonProps,
  HeaderProps,
  SidebarProps,
  SidebarMenuLayoutProps,
  AppLayoutProps,
  PageProps,
  ProtectedRouteProps,
  RedirectAuthenticatedUserProps,
} from "./component.types";
