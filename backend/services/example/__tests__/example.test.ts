import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../../../__tests__/setup/testDb';
import { User } from '../../../models/user.model';
import exampleRoutes from '../routes/example.route';

describe('Example Feature Integration Tests', () => {
  let app: Express;
  let testUserId: string;
  let validToken: string;

  beforeAll(async () => {
    await connectTestDb();

    // Create test app
    app = express();
    app.use(express.json());
    // lgtm[js/missing-token-validation] - Test environment only, CSRF not needed for unit tests
    app.use(cookieParser());
    app.use('/api/example', exampleRoutes);

    // Create a test user
    const testUser = await User.create({
      email: 'test@example.com',
      password: 'hashedPassword123',
      name: 'Test User',
      isVerified: true,
    });
    testUserId = testUser._id.toString();

    // Generate valid JWT token
    validToken = jwt.sign(
      { userId: testUserId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );
  });

  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  describe('GET /api/example/example', () => {
    it('should return hello world message when authenticated', async () => {
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
        .expect(401);

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
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return error when user is deleted', async () => {
      // Create and delete a user
      const tempUser = await User.create({
        email: 'temp@example.com',
        password: 'hashedPassword123',
        name: 'Temp User',
        isVerified: true,
      });
      const tempUserId = tempUser._id.toString();
      const tempToken = jwt.sign(
        { userId: tempUserId },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '7d' }
      );

      await User.findByIdAndDelete(tempUserId);

      const response = await request(app)
        .get('/api/example/example')
        .set('Cookie', [`token=${tempToken}`])
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'User not found');
    });
  });
});
