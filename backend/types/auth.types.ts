/**
 * DTO for user signup
 */
export interface SignupDTO {
  email: string;
  password: string;
  name: string;
}

/**
 * DTO for user login
 */
export interface LoginDTO {
  email: string;
  password: string;
}

/**
 * DTO for email verification
 */
export interface VerifyEmailDTO {
  code: string;
}

/**
 * DTO for forgot password request
 */
export interface ForgotPasswordDTO {
  email: string;
}

/**
 * DTO for password reset
 */
export interface ResetPasswordDTO {
  token: string;
  password: string;
}

/**
 * DTO for password change (authenticated users)
 */
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

/**
 * JWT Token payload
 */
export interface TokenPayload {
  userId: string;
}

/**
 * Google OAuth profile data
 */
export interface GoogleProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string; verified: boolean }>;
  photos?: Array<{ value: string }>;
}
