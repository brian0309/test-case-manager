// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Mock modules before importing
jest.mock('../../models/user.model.js');
jest.mock('../../mailtrap/emails.js');
jest.mock('../../config/googleAuth.js');

import authRoutes from '../../routes/auth.route.js';
import { User } from '../../models/user.model.js';

const mockUserModel = User as any;

describe('Auth Integration Tests - Complete Flows', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // lgtm[js/missing-token-validation] - Test environment only, CSRF not needed for integration tests
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);

    process.env.JWT_SECRET = 'test-jwt-secret-key';
    process.env.CLIENT_URL = 'http://localhost:3000';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Signup Flow', () => {
    it('should successfully create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      };

      // Mock: User doesn't exist
      mockUserModel.findOne.mockResolvedValue(null);

      // Mock: User creation with constructor
      const hashedPassword = await bcryptjs.hash(userData.password, 10);
      const createdUser = {
        _id: '507f1f77bcf86cd799439011',
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        isVerified: false,
        verificationToken: '123456',
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          email: userData.email,
          name: userData.name,
          isVerified: false,
        }),
      };

      // Mock the User constructor to return our created user
      mockUserModel.mockImplementation(() => createdUser);

      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User created successfully');
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject signup with existing email', async () => {
      mockUserModel.findOne.mockResolvedValue({ email: 'existing@example.com' });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'Password123!',
          name: 'Existing User',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User already exists');
    });

    it('should reject signup with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('All fields are required');
    });

    it('should reject signup with invalid email format (no TLD)', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'thisis@invalid',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('valid email address');
    });

    it('should reject signup with invalid email format (missing @)', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalidemail.com',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('valid email address');
    });

    it('should reject signup with invalid email format (missing domain)', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'user@',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('valid email address');
    });
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const password = 'Password123!';
      const hashedPassword = await bcryptjs.hash(password, 10);

      mockUserModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        password: hashedPassword,
        isVerified: true,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'user@example.com',
          isVerified: true,
        }),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: password,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged in successfully');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      const hashedPassword = await bcryptjs.hash('CorrectPassword', 10);

      mockUserModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        password: hashedPassword,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject login for non-existent user', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should prevent OAuth users from logging in with password', async () => {
      mockUserModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'oauth@example.com',
        password: undefined, // OAuth user has no password
        googleId: 'google-id-123',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'oauth@example.com',
          password: 'AnyPassword123!',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please use Google OAuth to login');
    });

    it('should reject login with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@email',
          password: 'Password123!',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('valid email address');
    });
  });

  describe('Email Verification Flow', () => {
    it('should successfully verify email with valid code', async () => {
      const verificationToken = '123456';

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'user@example.com',
          name: 'Test User',
          isVerified: false,
          verificationToken,
          verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          save: jest.fn().mockResolvedValue(true),
          toObject: jest.fn().mockReturnValue({
            _id: '507f1f77bcf86cd799439011',
            email: 'user@example.com',
            isVerified: true,
          }),
        }),
      });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ code: verificationToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Email verified successfully');
    });

    it('should reject invalid verification code', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ code: '000000' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired verification code');
    });
  });

  describe('Password Reset Flow', () => {
    it('should send password reset email', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'user@example.com',
          save: jest.fn().mockResolvedValue(true),
        }),
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Password reset link sent to your email');
    });

    it('should reject password reset for non-existent user', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User not found');
    });

    it('should reject forgot password with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid@email' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('valid email address');
    });

    it('should successfully reset password with valid token', async () => {
      const resetToken = crypto.randomBytes(20).toString('hex');
      const newPassword = 'NewPassword123!';

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'user@example.com',
          resetPasswordToken: resetToken,
          resetPasswordExpiresAt: new Date(Date.now() + 3600000),
          save: jest.fn().mockResolvedValue(true),
        }),
      });

      const res = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: newPassword })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Password reset successful');
    });

    it('should reject password reset with invalid token', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post('/api/auth/reset-password/invalid-token')
        .send({ password: 'NewPassword123!' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired reset token');
    });
  });

  describe('Logout Flow', () => {
    it('should successfully logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
      
      const cookieHeader = res.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader[0]).toContain('token=;');
    });
  });

  describe('Check Auth (Protected Route)', () => {
    it('should reject access without token', async () => {
      const res = await request(app)
        .get('/api/auth/check-auth')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unauthorized - no token provided');
    });

    it('should reject access with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/check-auth')
        .set('Cookie', 'token=invalid-token')
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Server error');
    });
  });

  describe('Change Password (Protected Route)', () => {
    it('should reject password change without authentication', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'CurrentPassword123!',
          newPassword: 'NewPassword123!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unauthorized - no token provided');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);
    });

    it('should sanitize passwords from responses', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const hashedPassword = await bcryptjs.hash('Password123!', 10);
      mockUserModel.mockImplementation(() => ({
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          name: 'Test User',
        }),
      }));

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      expect(res.body.user.password).toBeUndefined();
    });
  });

  describe('Resend Verification Code Flow', () => {
    it('should successfully resend verification code', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
        verificationToken: '123456',
        verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        verificationTokenSentAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/auth/resend-verification-code')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Verification code sent to your email');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should reject resend for already verified user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        isVerified: true, // Already verified
      };

      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/auth/resend-verification-code')
        .set('Cookie', [`token=${token}`])
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email is already verified');
    });

    it('should enforce 5-minute rate limit', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
        verificationToken: '123456',
        verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        verificationTokenSentAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      };

      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/auth/resend-verification-code')
        .set('Cookie', [`token=${token}`])
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please wait');
      expect(res.body.message).toContain('minute(s)');
    });

    it('should reject resend without authentication', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification-code')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });
});
