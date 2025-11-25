/**
 * Extend Express Request interface to include custom properties
 * This file augments the Express namespace to add type safety for custom request properties
 */

declare global {
  namespace Express {
    interface Request {
      /**
       * User ID extracted from JWT token by verifyToken middleware
       */
      userId?: string;
    }
  }
}

// This export is required for TypeScript to treat this file as a module
export {};
