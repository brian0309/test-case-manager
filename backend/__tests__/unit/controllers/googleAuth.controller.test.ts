import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../../helpers/testHelpers';

// Set environment
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5000/api/auth/google/callback';
process.env.GOOGLE_ALLOWED_REDIRECT_URIS = 'http://localhost:5000/api/auth/google/callback';

// Mock dependencies
jest.mock('../../../config/googleAuth');
jest.mock('../../../models/user.model');

import { getGoogleAuthUrl, googleAuthCallback } from '../../../controllers/googleAuth.controller';
import * as googleAuthConfig from '../../../config/googleAuth';

describe('Google Auth Controller', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = createMockRequest({});
    mockResponse = createMockResponse();
    jest.clearAllMocks();
  });

  describe('getGoogleAuthUrl', () => {
    it('should return Google OAuth URL', () => {
      const mockUrl = 'https://accounts.google.com/o/oauth2/auth?client_id=test';
      const mockState = 'random-state-123';

      (googleAuthConfig.getGoogleAuthURL as jest.Mock).mockReturnValue({
        url: mockUrl,
        state: mockState,
      });

      getGoogleAuthUrl(mockRequest, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ url: mockUrl });
    });

    it('should set oauth_state cookie', () => {
      const mockState = 'state-456';

      (googleAuthConfig.getGoogleAuthURL as jest.Mock).mockReturnValue({
        url: 'https://accounts.google.com/auth',
        state: mockState,
      });

      getGoogleAuthUrl(mockRequest, mockResponse as any);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'oauth_state',
        mockState,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        })
      );
    });

    it('should handle errors gracefully', () => {
      (googleAuthConfig.getGoogleAuthURL as jest.Mock).mockImplementation(() => {
        throw new Error('Config error');
      });

      getGoogleAuthUrl(mockRequest, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error generating Google URL',
      });
    });
  });

  describe('googleAuthCallback', () => {
    it('should redirect to error if state does not match', async () => {
      mockRequest.query = { code: 'auth-code', state: 'different-state' };
      mockRequest.cookies = { oauth_state: 'original-state' };

      await googleAuthCallback(mockRequest, mockResponse as any);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=invalid_state')
      );
    });

    it('should redirect to error if no code provided', async () => {
      const state = 'matching-state';
      mockRequest.query = { state };
      mockRequest.cookies = { oauth_state: state };

      await googleAuthCallback(mockRequest, mockResponse as any);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=no_code')
      );
    });

    it('should clear oauth_state cookie on valid request', async () => {
      const state = 'matching-state';
      mockRequest.query = { code: 'valid-code', state };
      mockRequest.cookies = { oauth_state: state };

      const mockGoogleUser: any = {
        id: 'google-123',
        email: 'user@example.com',
        name: 'User',
        picture: 'pic.jpg',
        verified_email: true,
      };

      (googleAuthConfig.getGoogleUser as any).mockResolvedValue(mockGoogleUser);

      await googleAuthCallback(mockRequest, mockResponse as any);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('oauth_state');
    });
  });
});
