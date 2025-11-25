import { UserResponse } from "./user.types.js";

/**
 * Base API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  user: UserResponse;
}

/**
 * Verification response
 */
export interface VerificationResponse {
  success: boolean;
  message: string;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Check auth response
 */
export interface CheckAuthResponse {
  success: boolean;
  user: UserResponse;
}

/**
 * Google OAuth URL response
 */
export interface GoogleOAuthUrlResponse {
  success: boolean;
  url: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}
