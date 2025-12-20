import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

// Mock User model
jest.mock('../../../models/user.model');

import { User } from '../../../models/user.model';
import exampleRoutes from '../routes/example.route';

const mockUser = User as jest.Mocked<typeof User>;

describe('Example Feature Integration Tests', () => {
  let app: Express;
  let testUserId: string;
  let validToken: string;

  beforeAll(() => {
    testUserId = new Types.ObjectId().toString();

    // Create test app
    app = express();
    app.use(express.json());
    // lgtm[js/missing-token-validation] - Test environment only, CSRF not needed for unit tests
    app.use(cookieParser());
    app.use('/api/example', exampleRoutes);

    // Set environment
    process.env.JWT_SECRET = 'test-secret';

    // Generate valid JWT token
    validToken = jwt.sign(
      { userId: testUserId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/example/example', () => {
    it('should return hello world message when authenticated', async () => {
      // Mock User.findById for authentication
      (mockUser.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(testUserId),
          email: 'test@example.com',
          name: 'Test User',
        } as any),
      });

      const response = await request(app)
        .get('/api/example/example')
        .set('Cookie', [`token=${validToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Hello World');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', testUserId);
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should reject request without authentication token', async () => {
      const response = await request(app)
        .get('/api/example/example')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/example/example')
        .set('Cookie', ['token=invalid-token'])
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUserId },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/api/example/example')
        .set('Cookie', [`token=${expiredToken}`])
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return error when user is deleted', async () => {
      const tempUserId = new Types.ObjectId().toString();
      const tempToken = jwt.sign(
        { userId: tempUserId },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '7d' }
      );

      // Mock User.findById to return null (user deleted)
      (mockUser.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null as any),
      });

      const response = await request(app)
        .get('/api/example/example')
        .set('Cookie', [`token=${tempToken}`])
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'User not found');
    });
  });
});
