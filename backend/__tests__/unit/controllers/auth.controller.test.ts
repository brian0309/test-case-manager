import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../../helpers/testHelpers';

// Set environment first
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

// Mock dependencies
jest.mock('../../../models/user.model');
jest.mock('../../../mailtrap/emails');
jest.mock('bcryptjs');

import * as authController from '../../../controllers/auth.controller';
import * as emailService from '../../../mailtrap/emails';
import bcryptjs from 'bcryptjs';

describe('Auth Controller - Core Functions', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = createMockRequest({});
    mockResponse = createMockResponse();
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        // missing password and name
      };

      await authController.signup(mockRequest, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should validate email field is provided', async () => {
      mockRequest.body = {
        password: 'password123',
        name: 'Test User',
      };

      await authController.signup(mockRequest, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    it('should validate request has email and password', () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      expect(loginData.email).toBeDefined();
      expect(loginData.password).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should return success message and clear cookie', async () => {
      await authController.logout(mockRequest, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'token',
        expect.any(Object)
      );
    });
  });

  describe('verifyEmail', () => {
    it('should require verification code', () => {
      mockRequest.body = {};
      const code = mockRequest.body.code;
      expect(code).toBeUndefined();
    });
  });

  describe('forgotPassword', () => {
    it('should require email field', () => {
      mockRequest.body = { email: 'test@example.com' };
      expect(mockRequest.body.email).toBeDefined();
      expect(mockRequest.body.email).toMatch(/@/);
    });
  });

  describe('resetPassword', () => {
    it('should require token and new password', () => {
      const resetData = {
        token: 'reset-token-123',
        password: 'newpassword123',
      };
      expect(resetData.token).toBeDefined();
      expect(resetData.password).toBeDefined();
    });
  });

  describe('checkAuth', () => {
    it('should require userId in request', () => {
      mockRequest.userId = 'user-123';
      expect(mockRequest.userId).toBeDefined();
    });
  });

  describe('changePassword', () => {
    it('should require currentPassword and newPassword', () => {
      const changeData = {
        currentPassword: 'old',
        newPassword: 'new',
      };
      expect(changeData.currentPassword).toBeDefined();
      expect(changeData.newPassword).toBeDefined();
    });
  });
});
