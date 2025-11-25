import { Response } from 'express';
import bcryptjs from 'bcryptjs';
import { User } from '../../models/user.model.js';

export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
  return res;
};

export const createMockRequest = (data: any = {}): any => {
  return {
    body: data.body || {},
    params: data.params || {},
    query: data.query || {},
    cookies: data.cookies || {},
    userId: data.userId || undefined,
  };
};

export const generateVerificationToken = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to create a test user in the database
export const createTestUser = async (data: {
  email: string;
  password: string;
  name: string;
  isVerified?: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
}): Promise<any> => {
  const hashedPassword = await bcryptjs.hash(data.password, 10);
  const user = await User.create({
    email: data.email,
    password: hashedPassword,
    name: data.name,
    isVerified: data.isVerified ?? false,
    verificationToken: data.verificationToken,
    verificationTokenExpiresAt: data.verificationTokenExpiresAt,
  });
  return user;
};

// Helper to extract token from cookie header
export const extractTokenFromCookie = (cookieHeader: string | string[]): string | null => {
  if (!cookieHeader) return null;
  
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  for (const cookie of cookies) {
    const match = cookie.match(/token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
};
