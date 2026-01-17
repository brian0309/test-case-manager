import { User } from "./user.types";

/**
 * Base API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Authentication API response
 */
export interface AuthApiResponse {
  success: boolean;
  message: string;
  user: User;
}

/**
 * Verification API response
 */
export interface VerificationApiResponse {
  success: boolean;
  message: string;
}

/**
 * Check auth API response
 */
export interface CheckAuthApiResponse {
  success: boolean;
  user: User;
}

/**
 * Google OAuth URL response
 */
export interface GoogleOAuthUrlResponse {
  success: boolean;
  url: string;
}

/**
 * Error API response
 */
export interface ErrorApiResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * Axios error response data
 */
export interface AxiosErrorResponse {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}
