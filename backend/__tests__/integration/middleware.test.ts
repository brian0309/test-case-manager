import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../../middleware/verifyToken.js';

describe('Middleware Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    process.env.JWT_SECRET = 'test-jwt-secret-key';
    process.env.CLIENT_URL = 'http://localhost:3000';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  });

  beforeEach(() => {
    // Reset app routes for each test
    // Note: In production, routes shouldn't be added in beforeEach,
    // but for testing different middleware scenarios, this is acceptable
  });

  describe('verifyToken Middleware', () => {
    it('should allow access with valid token', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });

      // lgtm[js/missing-rate-limiting] - Test route only, rate limiting not needed
      app.get('/test/protected-valid', verifyToken, (req: Request, res: Response) => {
        res.status(200).json({
          success: true,
          userId: req.userId,
        });
      });

      const res = await request(app)
        .get('/test/protected-valid')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.userId).toBe(userId);
    });

    it('should reject access without token', async () => {
      // lgtm[js/missing-rate-limiting] - Test route only, rate limiting not needed
      app.get('/test/protected-no-token', verifyToken, (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      const res = await request(app)
        .get('/test/protected-no-token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unauthorized - no token provided');
    });

    it('should reject access with invalid token', async () => {
      // lgtm[js/missing-rate-limiting] - Test route only, rate limiting not needed
      app.get('/test/protected-invalid', verifyToken, (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      const res = await request(app)
        .get('/test/protected-invalid')
        .set('Cookie', 'token=invalid.token.here')
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Server error');
    });

    it('should reject access with expired token', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const expiredToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '0s' });

      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // lgtm[js/missing-rate-limiting] - Test route only, rate limiting not needed
      app.get('/test/protected-expired', verifyToken, (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      const res = await request(app)
        .get('/test/protected-expired')
        .set('Cookie', `token=${expiredToken}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Server error');
    });

    it('should reject token with wrong secret', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const wrongToken = jwt.sign({ userId }, 'wrong-secret', { expiresIn: '7d' });

      // lgtm[js/missing-rate-limiting] - Test route only, rate limiting not needed
      app.get('/test/protected-wrong-secret', verifyToken, (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      const res = await request(app)
        .get('/test/protected-wrong-secret')
        .set('Cookie', `token=${wrongToken}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Server error');
    });

    it('should handle malformed tokens', async () => {
      // lgtm[js/missing-rate-limiting] - Test route only, rate limiting not needed
      app.get('/test/protected-malformed', verifyToken, (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      const malformedTokens = ['not-a-jwt', 'single', 'too.many.parts.in.this'];

      for (const token of malformedTokens) {
        const res = await request(app)
          .get('/test/protected-malformed')
          .set('Cookie', `token=${token}`)
          .expect(500);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Server error');
      }
    });
  });

  describe('Middleware Chain', () => {
    it('should execute middleware in correct order', async () => {
      const executionOrder: string[] = [];

      const middleware1 = (req: Request, res: Response, next: NextFunction) => {
        executionOrder.push('middleware1');
        next();
      };

      const middleware2 = (req: Request, res: Response, next: NextFunction) => {
        executionOrder.push('middleware2');
        next();
      };

      app.get('/test/chain-order', middleware1, middleware2, (req: Request, res: Response) => {
        executionOrder.push('handler');
        res.status(200).json({ order: executionOrder });
      });

      const res = await request(app)
        .get('/test/chain-order')
        .expect(200);

      expect(res.body.order).toEqual(['middleware1', 'middleware2', 'handler']);
    });

    it('should stop execution if middleware does not call next', async () => {
      let handlerCalled = false;

      const blockingMiddleware = (req: Request, res: Response) => {
        res.status(403).json({ blocked: true });
      };

      app.get('/test/blocking', blockingMiddleware, (req: Request, res: Response) => {
        handlerCalled = true;
        res.status(200).json({ success: true });
      });

      const res = await request(app)
        .get('/test/blocking')
        .expect(403);

      expect(res.body.blocked).toBe(true);
      expect(handlerCalled).toBe(false);
    });
  });

  describe('Request/Response Processing', () => {
    it('should parse JSON body correctly', async () => {
      app.post('/test/json-body', (req: Request, res: Response) => {
        res.status(200).json({ received: req.body });
      });

      const testData = {
        name: 'Test',
        email: 'test@example.com',
        nested: { value: 123 },
      };

      const res = await request(app)
        .post('/test/json-body')
        .send(testData)
        .expect(200);

      expect(res.body.received).toEqual(testData);
    });

    it('should parse cookies correctly', async () => {
      app.get('/test/cookies-parse', (req: Request, res: Response) => {
        res.status(200).json({ cookies: req.cookies });
      });

      const res = await request(app)
        .get('/test/cookies-parse')
        .set('Cookie', 'session=abc123; user=john')
        .expect(200);

      expect(res.body.cookies.session).toBe('abc123');
      expect(res.body.cookies.user).toBe('john');
    });

    it('should handle query parameters', async () => {
      app.get('/test/query-params', (req: Request, res: Response) => {
        res.status(200).json({ query: req.query });
      });

      const res = await request(app)
        .get('/test/query-params')
        .query({ page: '2', limit: '10' })
        .expect(200);

      expect(res.body.query.page).toBe('2');
      expect(res.body.query.limit).toBe('10');
    });

    it('should handle URL parameters', async () => {
      app.get('/test/params/:id/:action', (req: Request, res: Response) => {
        res.status(200).json({ params: req.params });
      });

      const res = await request(app)
        .get('/test/params/123/edit')
        .expect(200);

      expect(res.body.params.id).toBe('123');
      expect(res.body.params.action).toBe('edit');
    });
  });

  describe('Cookie Management', () => {
    it('should set cookies with correct attributes', async () => {
      app.get('/test/set-cookie', (req: Request, res: Response) => {
        res.cookie('test_cookie', 'value123', {
          httpOnly: true,
          secure: false,
        });
        res.status(200).json({ success: true });
      });

      const res = await request(app)
        .get('/test/set-cookie')
        .expect(200);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('test_cookie=value123');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should clear cookies', async () => {
      app.get('/test/clear-cookie', (req: Request, res: Response) => {
        res.clearCookie('test_cookie');
        res.status(200).json({ success: true });
      });

      const res = await request(app)
        .get('/test/clear-cookie')
        .expect(200);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('test_cookie=;');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for undefined routes', async () => {
      const res = await request(app)
        .get('/nonexistent/route/path')
        .expect(404);
    });

    it('should handle different HTTP methods', async () => {
      app.get('/test/methods', (req: Request, res: Response) => {
        res.status(200).json({ method: 'GET' });
      });

      app.post('/test/methods', (req: Request, res: Response) => {
        res.status(200).json({ method: 'POST' });
      });

      const getRes = await request(app).get('/test/methods').expect(200);
      expect(getRes.body.method).toBe('GET');

      const postRes = await request(app).post('/test/methods').expect(200);
      expect(postRes.body.method).toBe('POST');
    });

    it('should handle large payloads', async () => {
      app.post('/test/large-payload', (req: Request, res: Response) => {
        res.status(200).json({ size: JSON.stringify(req.body).length });
      });

      const largeData = {
        items: Array(1000).fill({ name: 'Item', value: 'Data'.repeat(10) }),
      };

      const res = await request(app)
        .post('/test/large-payload')
        .send(largeData)
        .expect(200);

      expect(res.body.size).toBeGreaterThan(1000);
    });
  });

  describe('Security Headers', () => {
    it('should set custom headers', async () => {
      app.get('/test/custom-headers', (req: Request, res: Response) => {
        res.setHeader('X-Custom-Header', 'test-value');
        res.status(200).json({ success: true });
      });

      const res = await request(app)
        .get('/test/custom-headers')
        .expect(200);

      expect(res.headers['x-custom-header']).toBe('test-value');
    });
  });
});
