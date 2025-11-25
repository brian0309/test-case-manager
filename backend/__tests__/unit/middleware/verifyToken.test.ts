import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../../../middleware/verifyToken';
import { createMockRequest, createMockResponse } from '../../helpers/testHelpers';

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

describe('verifyToken middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = createMockRequest({});
    mockResponse = createMockResponse();
    nextFunction = jest.fn();
  });

  it('should return 401 if no token is provided', () => {
    mockRequest.cookies = {};

    verifyToken(mockRequest, mockResponse as any, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unauthorized - no token provided',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    mockRequest.cookies = { token: 'invalid-token' };

    verifyToken(mockRequest, mockResponse as any, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Server error',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() and set userId if token is valid', () => {
    const userId = 'test-user-id-123';
    const validToken = jwt.sign({ userId }, process.env.JWT_SECRET as string);
    mockRequest.cookies = { token: validToken };

    verifyToken(mockRequest, mockResponse as any, nextFunction);

    expect(mockRequest.userId).toBe(userId);
    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should return 500 if token verification throws an error', () => {
    const invalidToken = jwt.sign({ userId: 'test' }, 'wrong-secret');
    mockRequest.cookies = { token: invalidToken };

    verifyToken(mockRequest, mockResponse as any, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Server error',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if decoded token is falsy', () => {
    // Create a mock where jwt.verify returns null
    const jwtSpy = jest.spyOn(jwt, 'verify').mockReturnValue(null as any);
    mockRequest.cookies = { token: 'some-token' };

    verifyToken(mockRequest, mockResponse as any, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unauthorized - invalid token',
    });
    expect(nextFunction).not.toHaveBeenCalled();

    jwtSpy.mockRestore();
  });

  it('should handle expired tokens', () => {
    const expiredToken = jwt.sign(
      { userId: 'test-user-id' },
      process.env.JWT_SECRET as string,
      { expiresIn: '-1h' } // Already expired
    );
    mockRequest.cookies = { token: expiredToken };

    verifyToken(mockRequest, mockResponse as any, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
