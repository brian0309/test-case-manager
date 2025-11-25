import { describe, it, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { generateTokenAndSetCookie } from '../../../utils/generateTokenAndSetCookie';
import { createMockResponse } from '../../helpers/testHelpers';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

describe('generateTokenAndSetCookie', () => {
  let mockResponse: any;

  beforeEach(() => {
    mockResponse = createMockResponse();
  });

  it('should generate a valid JWT token', () => {
    const userId = 'test-user-id-123';
    const token = generateTokenAndSetCookie(mockResponse, userId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // Verify token is valid JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    expect(decoded.userId).toBe(userId);
  });

  it('should set cookie with correct options in test environment', () => {
    const userId = 'test-user-id-123';
    generateTokenAndSetCookie(mockResponse, userId);

    expect(mockResponse.cookie).toHaveBeenCalledTimes(1);
    
    const cookieCall = (mockResponse.cookie as jest.Mock).mock.calls[0];
    expect(cookieCall[0]).toBe('token');
    expect(cookieCall[1]).toBeDefined(); // token value
    
    const cookieOptions = cookieCall[2];
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.secure).toBe(false); // false in test environment
    expect(cookieOptions.sameSite).toBe('lax');
    expect(cookieOptions.maxAge).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
  });

  it('should set cookie with production options when NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const userId = 'test-user-id-123';
    generateTokenAndSetCookie(mockResponse, userId);

    const cookieCall = (mockResponse.cookie as jest.Mock).mock.calls[0];
    const cookieOptions = cookieCall[2];
    
    expect(cookieOptions.secure).toBe(true);
    expect(cookieOptions.sameSite).toBe('none');

    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  it('should include domain in cookie options when COOKIE_DOMAIN is set', () => {
    const originalDomain = process.env.COOKIE_DOMAIN;
    process.env.COOKIE_DOMAIN = '.example.com';

    const userId = 'test-user-id-123';
    generateTokenAndSetCookie(mockResponse, userId);

    const cookieCall = (mockResponse.cookie as jest.Mock).mock.calls[0];
    const cookieOptions = cookieCall[2];
    
    expect(cookieOptions.domain).toBe('.example.com');

    // Restore original environment
    if (originalDomain) {
      process.env.COOKIE_DOMAIN = originalDomain;
    } else {
      delete process.env.COOKIE_DOMAIN;
    }
  });

  it('should return a token that expires in 7 days', () => {
    const userId = 'test-user-id-123';
    const token = generateTokenAndSetCookie(mockResponse, userId);

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const expiresIn = decoded.exp - decoded.iat;
    
    // Should be 7 days in seconds
    expect(expiresIn).toBe(7 * 24 * 60 * 60);
  });
});
