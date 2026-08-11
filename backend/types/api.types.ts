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

/**
 * Custom field option
 */
export interface CustomFieldOption {
  id: string;
  label: string;
}

/**
 * Custom field definition
 */
export interface CustomFieldDefinition {
  id: string;
  key?: string;
  label: string;
  type: "text" | "long_text" | "dropdown" | "wysiwyg";
  required?: boolean;
  options?: CustomFieldOption[];
  defaultValue?: string;
  showOnTableByDefault?: boolean;
  order?: number;
  deleted?: boolean;
  deletedAt?: string;
}

/**
 * Hidden default fields configuration
 */
export interface HiddenDefaultFields {
  area?: boolean;
  testDescription?: boolean;
  stepsContent?: boolean;
  expectedResult?: boolean;
  comments?: boolean;
  priority?: boolean;
  status?: boolean;
  assignedTester?: boolean;
}

/**
 * Hidden default columns configuration
 */
export interface HiddenDefaultColumns {
  id?: boolean;
  title?: boolean;
  priority?: boolean;
  status?: boolean;
  lastModified?: boolean;
  assignedTester?: boolean;
}

/**
 * Project settings for test cases
 */
export interface ProjectSettings {
  testCases?: {
    hiddenDefaultFields?: HiddenDefaultFields;
    table?: {
      hiddenDefaultColumns?: HiddenDefaultColumns;
      visibleCustomFieldIds?: string[];
    };
    customFields?: CustomFieldDefinition[];
  };
  videoEvidence?: {
    enabled?: boolean;
    publicLinks?: boolean;
  };
}

/**
 * Project settings response
 */
export interface ProjectSettingsResponse {
  success: boolean;
  data: ProjectSettings;
}
