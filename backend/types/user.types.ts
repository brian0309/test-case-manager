import { Document, Types } from "mongoose";

/**
 * Core User interface representing user data structure
 */
export interface IUser {
  _id: string;
  email: string;
  name: string;
  password?: string;
  googleId?: string;
  profilePicture?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  geminiVisibleModels?: string[];
  preferredAiProvider?: 'gemini' | 'openrouter';
  openrouterApiKey?: string;
  openrouterModel?: string;
  openrouterVisibleModels?: string[];
  openrouterCustomModels?: string[];
  isVerified: boolean;
  lastLogin: Date;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: Date;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  verificationTokenSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User document interface extending Mongoose Document
 * Used for MongoDB operations
 */
export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  _id: Types.ObjectId;
}

/**
 * DTO for creating a new user (signup)
 */
export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
}

/**
 * DTO for creating a user via Google OAuth
 */
export interface CreateGoogleUserDTO {
  email: string;
  name: string;
  googleId: string;
  profilePicture?: string;
}

/**
 * User response object (without sensitive data)
 */
export interface UserResponse {
  _id: string;
  email: string;
  name: string;
  googleId?: string;
  profilePicture?: string;
  isVerified: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}
