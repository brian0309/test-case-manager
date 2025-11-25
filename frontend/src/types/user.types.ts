/**
 * User interface matching backend User model
 * Represents the user data structure in the frontend
 */
export interface User {
  _id: string;
  email: string;
  name: string;
  googleId?: string;
  profilePicture?: string;
  isVerified: boolean;
  lastLogin: Date | string; // Can be Date or ISO string from API
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * User profile update DTO
 */
export interface UpdateUserProfileDTO {
  name?: string;
  email?: string;
}
