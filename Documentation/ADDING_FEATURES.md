# Adding Backend Features Guide

This guide provides a comprehensive overview of how to add new features to the backend using a feature-based architecture.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Feature Structure](#feature-structure)
- [Step-by-Step Guide](#step-by-step-guide)
- [Example Implementation](#example-implementation)
- [Best Practices](#best-practices)
- [Testing](#testing)

## Architecture Overview

The backend uses a feature-based architecture where each feature is organized in its own directory under `backend/services/`. This approach provides:

- **Modularity**: Each feature is self-contained with its own controllers, routes, services, models, types, and tests
- **Scalability**: Easy to add, modify, or remove features without affecting others
- **Maintainability**: Clear separation of concerns and easier navigation
- **Testability**: Each feature can be tested independently

## Feature Structure

Each feature should follow this directory structure:

```
backend/
└── services/
    └── {feature-name}/
        ├── controllers/
        │   └── {feature}.controller.ts
        ├── routes/
        │   └── {feature}.route.ts
        ├── services/
        │   └── {feature}.service.ts
        ├── models/
        │   └── {feature}.model.ts (optional)
        ├── types/
        │   └── {feature}.types.ts
        └── __tests__/
            ├── {feature}.test.ts (integration tests)
            └── {feature}.service.test.ts (unit tests)
```

### Directory Responsibilities

- **controllers/**: Handle HTTP requests and responses, validate inputs, call services
- **routes/**: Define API endpoints and apply middleware
- **services/**: Business logic and data operations
- **models/**: Mongoose schemas (if feature needs its own models)
- **types/**: TypeScript interfaces and types
- **__tests__/**: Feature-specific tests

## Step-by-Step Guide

### 1. Create Feature Directory Structure

```bash
mkdir -p backend/services/{feature-name}/{controllers,routes,services,types,__tests__}
```

### 2. Define Types

Create `types/{feature}.types.ts`:

```typescript
export interface FeatureResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface FeatureRequest {
  // Define request body structure
}
```

### 3. Implement Service Layer

Create `services/{feature}.service.ts`:

```typescript
import { FeatureResponse } from "../types/{feature}.types.js";

/**
 * Business logic for the feature
 */
export const doSomething = async (data: any): Promise<FeatureResponse> => {
  // Implement business logic here
  return {
    success: true,
    message: "Operation successful",
    data: result,
  };
};
```

**Key Points:**
- Use `.js` import extensions (ES module convention)
- Keep business logic separate from HTTP handling
- Make functions testable and reusable
- Add JSDoc comments for documentation

### 4. Create Controller

Create `controllers/{feature}.controller.ts`:

```typescript
import { Request, Response } from "express";
import * as featureService from "../services/{feature}.service.js";

/**
 * GET /api/{feature}/action
 * Description of what this endpoint does
 */
export const getAction = async (req: Request, res: Response): Promise<void> => {
  try {
    // Access authenticated user ID (if using verifyToken middleware)
    const userId = req.userId;
    
    // Validate request
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // Call service
    const result = await featureService.doSomething(req.body);

    // Send response
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getAction:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
```

**Key Points:**
- Always handle errors with try-catch
- Return appropriate HTTP status codes
- Use TypeScript types from Express
- Access `req.userId` for authenticated routes (set by `verifyToken` middleware)

### 5. Define Routes

Create `routes/{feature}.route.ts`:

```typescript
import express, { Router } from "express";
import { getAction, postAction } from "../controllers/{feature}.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router();

// Public routes
router.get("/public", getAction);

// Protected routes (require authentication)
router.post("/protected", verifyToken, postAction);

export default router;
```

**Key Points:**
- Use `.js` import extensions
- Apply `verifyToken` middleware for protected routes
- Group related endpoints together
- Add comments for clarity

### 6. Mount Routes in Main App

Edit `backend/index.ts`:

```typescript
// Add import at the top (use .js extension)
import featureRoutes from "./services/{feature}/routes/{feature}.route.js";

// Mount route after other routes
app.use("/api/{feature}", featureRoutes);
```

**Important:**
- Use `.js` extension in import path (repository convention)
- Mount routes before the catch-all frontend route
- Use consistent API path structure

### 7. Create Tests

Create integration tests in `__tests__/{feature}.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../../../__tests__/setup/testDb';
import { User } from '../../../models/user.model';
import featureRoutes from '../routes/{feature}.route';

describe('Feature Integration Tests', () => {
  let app: Express;
  let testUserId: string;
  let validToken: string;

  beforeAll(async () => {
    await connectTestDb();

    app = express();
    app.use(express.json());
    // lgtm[js/missing-token-validation] - Test environment only, CSRF not needed for unit tests
    app.use(cookieParser());
    app.use('/api/{feature}', featureRoutes);

    // Create test user and token if needed
    const testUser = await User.create({
      email: 'test@example.com',
      password: 'hashedPassword123',
      name: 'Test User',
      isVerified: true,
    });
    testUserId = testUser._id.toString();

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

  describe('GET /api/{feature}/action', () => {
    it('should return expected result', async () => {
      const response = await request(app)
        .get('/api/{feature}/action')
        .set('Cookie', [`token=${validToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});
```

Create unit tests in `__tests__/{feature}.service.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import * as featureService from '../services/{feature}.service';

describe('Feature Service Unit Tests', () => {
  describe('doSomething', () => {
    it('should perform expected operation', () => {
      const result = featureService.doSomething();
      expect(result).toHaveProperty('success', true);
    });
  });
});
```

## Example Implementation

See the `backend/services/example/` directory for a complete working example that demonstrates:

- Protected route requiring authentication
- Service layer with business logic
- Controller with error handling
- Route definition with middleware
- Comprehensive integration and unit tests
- TypeScript types and interfaces

### Example Feature Endpoint

**URL**: `GET /api/example/example`

**Authentication**: Required (uses JWT token in cookie)

**Response**:
```json
{
  "success": true,
  "message": "Hello World",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

## Best Practices

### Code Organization

1. **Use Feature-Based Structure**: Keep related code together in feature directories
2. **Separate Concerns**: Controllers handle HTTP, services handle business logic
3. **Import Paths**: Always use `.js` extensions in imports (ES module convention)
4. **Consistent Naming**: Use `{feature}.controller.ts`, `{feature}.service.ts`, etc.

### TypeScript

1. **Define Types**: Create interfaces for requests, responses, and data structures
2. **Type Safety**: Use TypeScript types from Express (`Request`, `Response`)
3. **Export Types**: Make types available for reuse across the application
4. **Avoid `any`**: Use specific types whenever possible

### Error Handling

1. **Try-Catch Blocks**: Wrap async operations in try-catch
2. **Meaningful Messages**: Return clear error messages to clients
3. **Log Errors**: Console.log errors for debugging
4. **HTTP Status Codes**: Use appropriate status codes (401, 404, 500, etc.)

### Authentication

1. **Protected Routes**: Apply `verifyToken` middleware for authenticated endpoints
2. **User ID**: Access `req.userId` in controllers (set by middleware)
3. **Validation**: Check if user exists in database
4. **Error Responses**: Return 401 for unauthorized, 404 for not found

### Security

1. **Rate Limiting**: Consider adding rate limiting for production endpoints (not currently implemented in this codebase)
2. **Input Validation**: Validate and sanitize all user inputs
3. **SQL Injection**: Use Mongoose queries properly (parameterized queries)
4. **CSRF Protection**: Test environments can suppress CSRF warnings with `// lgtm[js/missing-token-validation]` comment
5. **Authentication**: Always use `verifyToken` middleware for protected routes
6. **Secrets**: Never commit secrets or tokens to the repository

### Testing

1. **Integration Tests**: Test full request/response cycle
2. **Unit Tests**: Test service functions independently
3. **Test Database**: Use `mongodb-memory-server` for isolated tests
4. **Coverage**: Test success cases, error cases, and edge cases
5. **Cleanup**: Clear test data in `afterAll` hooks

### API Design

1. **RESTful Conventions**: Use appropriate HTTP methods (GET, POST, PUT, DELETE)
2. **Consistent Responses**: Always include `success` and `message` fields
3. **Pagination**: Support pagination for list endpoints
4. **Filtering**: Allow filtering and sorting where appropriate

### Documentation

1. **JSDoc Comments**: Document functions with description, params, and return types
2. **Route Comments**: Add comments describing what each route does
3. **README Updates**: Update documentation when adding new features
4. **Examples**: Provide usage examples in documentation

## Testing Your Feature

### Run Type Check

```bash
npm run type-check
```

### Run All Tests

```bash
npm test
```

### Run Feature-Specific Tests

```bash
npm test -- services/example
```

### Run in Development Mode

```bash
npm run dev
```

Then test the endpoint:
```bash
curl -X GET http://localhost:5000/api/{feature}/action \
  -H "Content-Type: application/json" \
  -b "token=YOUR_JWT_TOKEN"
```

## Migration from Old Structure

If you have existing controllers/routes in the top-level directories:

1. **Create New Feature Directory**: Follow the structure above
2. **Move Files**: Copy controller and route to new locations
3. **Update Imports**: Change import paths to use `.js` extensions and new structure
4. **Update Route Mounting**: Change `backend/index.ts` to import from new location
5. **Add Tests**: Create tests for the migrated feature
6. **Verify**: Run tests and manual testing
7. **Clean Up**: Remove old files after verification

## Common Patterns

### Accessing Current User

```typescript
export const myController = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId; // Set by verifyToken middleware
  const user = await User.findById(userId).select("email name");
  // Use user data...
};
```

### Pagination

```typescript
export const getList = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const items = await Model.find().skip(skip).limit(limit);
  const total = await Model.countDocuments();

  res.json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};
```

### Filtering

```typescript
export const getFiltered = async (req: Request, res: Response): Promise<void> => {
  const { status, category } = req.query;
  
  const filter: any = {};
  if (status) filter.status = status;
  if (category) filter.category = category;

  const items = await Model.find(filter);
  res.json({ success: true, data: items });
};
```

## Troubleshooting

### Import Errors

**Problem**: `Cannot find module` errors

**Solution**: Ensure you're using `.js` extensions in imports:
```typescript
// ✅ Correct
import { something } from "./path/to/file.js";

// ❌ Wrong
import { something } from "./path/to/file";
```

### Type Errors

**Problem**: TypeScript compilation errors

**Solution**: Run `npm run type-check` to see all type errors and fix them

### Test Failures

**Problem**: Tests failing unexpectedly

**Solution**: 
- Check test database setup
- Ensure proper cleanup in `afterAll`
- Verify JWT_SECRET is set for tests
- Check for async/await issues

### 404 Not Found

**Problem**: API endpoint returns 404

**Solution**:
- Verify route is mounted in `backend/index.ts`
- Check route path matches request URL
- Ensure middleware order is correct

## Adding Real-Time Support to Features

If your feature needs live updates (e.g., when one user creates/updates data, others should see it immediately), follow this pattern:

### Step 1: Emit Events from Controllers

After any CRUD operation, emit a socket event:

```typescript
import { socketManager } from '../../socket/socketManager.js';

// In your controller after successful operation
export const createItem = async (req, res) => {
    const item = await ItemService.create(req.body);
    
    // Emit to all users viewing this project
    socketManager.emitToProject(item.projectId, 'myfeature:created', {
        item,
        projectId: item.projectId,
    });
    
    res.status(201).json(item);
};
```

### Step 2: Define Frontend Event Types

Add event types in `frontend/src/services/socket.ts`:

```typescript
export interface SocketEvents {
    // ... existing events
    'myfeature:created': { item: MyItem; projectId: string };
    'myfeature:updated': { item: MyItem };
    'myfeature:deleted': { itemId: string; projectId: string };
}
```

### Step 3: Subscribe in Components

Use the socket service to listen for events:

```typescript
import { socketService } from '../services/socket';

useEffect(() => {
    const handleCreated = (data) => {
        // Update your Zustand store or local state
        useMyStore.getState().addItem(data.item);
    };

    socketService.on('myfeature:created', handleCreated);
    
    return () => {
        socketService.off('myfeature:created', handleCreated);
    };
}, []);
```

### For Collaborative Editing

If you need Google Docs-style live editing, adapt the `useCollaborativeEditing` hook pattern. See `Documentation/REALTIME_ARCHITECTURE.md` for full details.

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
- [Jest Testing Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Real-Time Architecture Guide](./REALTIME_ARCHITECTURE.md)

## Support

For questions or issues:
1. Review this guide and the example implementation
2. Check existing features for similar patterns
3. Review test files for usage examples
4. Consult the main README for deployment and environment setup
5. **For real-time features**: See `Documentation/REALTIME_ARCHITECTURE.md`
