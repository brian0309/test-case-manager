import { describe, it, expect } from '@jest/globals';
import * as exampleService from '../services/example.service';

describe('Example Service Unit Tests', () => {
  describe('getHelloWorld', () => {
    it('should return hello world message without user info', () => {
      const result = exampleService.getHelloWorld();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'Hello World');
      expect(result).toHaveProperty('timestamp');
      expect(result).not.toHaveProperty('user');
    });

    it('should return hello world message with user info when provided', () => {
      const userId = 'test-user-id-123';
      const userEmail = 'test@example.com';

      const result = exampleService.getHelloWorld(userId, userEmail);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'Hello World');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id', userId);
      expect(result.user).toHaveProperty('email', userEmail);
    });

    it('should return timestamp in ISO format', () => {
      const result = exampleService.getHelloWorld();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should not include user info if only userId is provided', () => {
      const result = exampleService.getHelloWorld('test-user-id');

      expect(result).not.toHaveProperty('user');
    });

    it('should not include user info if only userEmail is provided', () => {
      const result = exampleService.getHelloWorld(undefined, 'test@example.com');

      expect(result).not.toHaveProperty('user');
    });
  });
});
