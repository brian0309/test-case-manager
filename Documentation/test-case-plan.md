# Test Case Management - Frontend & Backend Integration Plan

This document outlines the chronological implementation plan for integrating the Test Case Management frontend with a proper backend API.

---

## Overview

**Current State:**
- Frontend uses mock data from `frontend/src/utils/mockData.ts`
- State management with Zustand in `frontend/src/store/testManagerStore.ts`
- No backend persistence for test cases, projects, or suites

**Target State:**
- Full CRUD operations via REST API
- Data persisted in MongoDB
- Real-time updates and proper error handling
- Follow existing patterns from `authStore.ts` and `backend/services/example/`

---

## Phase 1: Backend - Database Models

- [x] **1.1 Create Project Model**
  - File: `backend/models/project.model.ts`
  - Fields: `name`, `description`, `color`, `ownerId` (ref User), `members[]` (ref User), `createdAt`, `updatedAt`
  - Add proper indexes for `ownerId` and member queries

- [x] **1.2 Create TestSuite Model**
  - File: `backend/models/testSuite.model.ts`
  - Fields: `name`, `description`, `projectId` (ref Project), `createdBy` (ref User), `createdAt`, `updatedAt`
  - Add index for `projectId`

- [x] **1.3 Create TestCase Model**
  - File: `backend/models/testCase.model.ts`
  - Fields based on existing `TestCase` type:
    - `title`, `priority` (enum), `status` (enum)
    - `projectId` (ref Project), `suiteId` (ref TestSuite)
    - `assignedTester` (ref User)
    - `area`, `expectedResult`, `stepsContent`, `comments`
    - `history[]` (embedded subdocument)
    - `createdBy` (ref User), `createdAt`, `updatedAt`, `lastModified`
  - Add compound index for `projectId` + `suiteId`

- [x] **1.4 Create shared types for backend**
  - File: `backend/services/testCase/types/testCase.types.ts`
  - Define interfaces: `IProject`, `ITestSuite`, `ITestCase`, `IHistoryEntry`
  - Define enums: `Priority`, `Status` (match frontend enums)
  - Define API response types

---

## Phase 2: Backend - Project Service

- [x] **2.1 Create Project Service**
  - File: `backend/services/testCase/services/project.service.ts`
  - Functions:
    - `createProject(ownerId, data)`
    - `getProjectsByUser(userId)`
    - `getProjectById(projectId, userId)`
    - `updateProject(projectId, userId, data)`
    - `deleteProject(projectId, userId)`
    - `addProjectMember(projectId, ownerId, memberEmail)`
    - `removeProjectMember(projectId, ownerId, memberId)`

- [x] **2.2 Create Project Controller**
  - File: `backend/services/testCase/controllers/project.controller.ts`
  - Endpoints:
    - `POST /api/projects` - Create project
    - `GET /api/projects` - List user's projects
    - `GET /api/projects/:id` - Get single project
    - `PUT /api/projects/:id` - Update project
    - `DELETE /api/projects/:id` - Delete project
    - `POST /api/projects/:id/members` - Add member
    - `DELETE /api/projects/:id/members/:memberId` - Remove member

- [x] **2.3 Create Project Routes**
  - File: `backend/services/testCase/routes/project.route.ts`
  - Apply `verifyToken` middleware to all routes
  - Export router

---

## Phase 3: Backend - TestSuite Service

- [x] **3.1 Create TestSuite Service**
  - File: `backend/services/testCase/services/testSuite.service.ts`
  - Functions:
    - `createTestSuite(projectId, userId, data)`
    - `getTestSuitesByProject(projectId, userId)`
    - `getTestSuiteById(suiteId, userId)`
    - `updateTestSuite(suiteId, userId, data)`
    - `deleteTestSuite(suiteId, userId)` - cascade delete test cases

- [x] **3.2 Create TestSuite Controller**
  - File: `backend/services/testCase/controllers/testSuite.controller.ts`
  - Endpoints:
    - `POST /api/projects/:projectId/suites` - Create suite
    - `GET /api/projects/:projectId/suites` - List suites in project
    - `GET /api/suites/:id` - Get single suite
    - `PUT /api/suites/:id` - Update suite
    - `DELETE /api/suites/:id` - Delete suite

- [x] **3.3 Create TestSuite Routes**
  - File: `backend/services/testCase/routes/testSuite.route.ts`
  - Apply `verifyToken` middleware to all routes
  - Export router

---

## Phase 4: Backend - TestCase Service

- [x] **4.1 Create TestCase Service**
  - File: `backend/services/testCase/services/testCase.service.ts`
  - Functions:
    - `createTestCase(suiteId, userId, data)`
    - `getTestCasesBySuite(suiteId, userId)`
    - `getTestCasesByProject(projectId, userId)`
    - `getTestCaseById(testCaseId, userId)`
    - `updateTestCase(testCaseId, userId, data)` - auto-add to history
    - `deleteTestCase(testCaseId, userId)`
    - `bulkUpdateStatus(testCaseIds[], userId, status)`

- [x] **4.2 Create TestCase Controller**
  - File: `backend/services/testCase/controllers/testCase.controller.ts`
  - Endpoints:
    - `POST /api/suites/:suiteId/cases` - Create test case
    - `GET /api/suites/:suiteId/cases` - List cases in suite
    - `GET /api/projects/:projectId/cases` - List all cases in project
    - `GET /api/cases/:id` - Get single test case
    - `PUT /api/cases/:id` - Update test case
    - `DELETE /api/cases/:id` - Delete test case
    - `PATCH /api/cases/bulk-status` - Bulk update status

- [x] **4.3 Create TestCase Routes**
  - File: `backend/services/testCase/routes/testCase.route.ts`
  - Apply `verifyToken` middleware to all routes
  - Export router

---

## Phase 5: Backend - Integration & Testing

- [x] **5.1 Register routes in main index.ts**
  - File: `backend/index.ts`
  - Add imports for project, testSuite, testCase routes
  - Register under `/api/projects`, `/api/suites`, `/api/cases`

- [x] **5.2 Create unit tests for services**
  - Files:
    - `backend/services/testCase/__tests__/testCase.services.test.ts`
  - Use existing test helpers from `backend/__tests__/helpers/testHelpers.ts`

- [ ] **5.3 Create integration tests for routes**
  - File: `backend/__tests__/integration/testCase.routes.test.ts`
  - Test all CRUD operations
  - Test authorization (can't access other user's projects)
  - Use `mongodb-memory-server` pattern from existing tests

- [x] **5.4 Run type-check and tests**
  - Run `npm run type-check`
  - Run `npm test`

---

## Phase 6: Frontend - API Service Layer

- [x] **6.1 Create API types for Test Manager**
  - File: `frontend/src/types/api/testManager.api.ts`
  - Define request/response types for all endpoints
  - Match backend response types

- [x] **6.2 Create Test Manager API service**
  - File: `frontend/src/services/testManagerApi.ts`
  - Use `API_URL` from `frontend/src/utils/api.ts`
  - Use axios with `withCredentials: true`
  - Functions:
    ```typescript
    // Projects
    createProject(data): Promise<Project>
    getProjects(): Promise<Project[]>
    getProject(id): Promise<Project>
    updateProject(id, data): Promise<Project>
    deleteProject(id): Promise<void>
    
    // Test Suites
    createTestSuite(projectId, data): Promise<TestSuite>
    getTestSuites(projectId): Promise<TestSuite[]>
    updateTestSuite(id, data): Promise<TestSuite>
    deleteTestSuite(id): Promise<void>
    
    // Test Cases
    createTestCase(suiteId, data): Promise<TestCase>
    getTestCases(suiteId): Promise<TestCase[]>
    getTestCasesByProject(projectId): Promise<TestCase[]>
    getTestCase(id): Promise<TestCase>
    updateTestCase(id, data): Promise<TestCase>
    deleteTestCase(id): Promise<void>
    bulkUpdateStatus(ids[], status): Promise<void>
    ```

---

## Phase 7: Frontend - Store Migration

- [x] **7.1 Update testManagerStore with async actions**
  - File: `frontend/src/store/testManagerStore.ts`
  - Add loading/error states
  - Replace mock data with API calls
  - Pattern to follow (from `authStore.ts`):
    ```typescript
    interface TestManagerStore {
      // ... existing state
      isLoading: boolean;
      error: string | null;
      
      // Async actions
      fetchProjects: () => Promise<void>;
      createProject: (data) => Promise<Project>;
      // ... etc
    }
    ```

- [x] **7.2 Implement Project actions**
  - `fetchProjects()` - call on mount
  - `createProject(data)` - add to store on success
  - `updateProject(id, data)` - update in store
  - `deleteProject(id)` - remove from store

- [x] **7.3 Implement TestSuite actions**
  - `fetchTestSuites(projectId)`
  - `createTestSuite(projectId, data)`
  - `updateTestSuite(id, data)`
  - `deleteTestSuite(id)`

- [x] **7.4 Implement TestCase actions**
  - `fetchTestCases(suiteId)`
  - `fetchTestCasesByProject(projectId)`
  - `createTestCase(suiteId, data)`
  - `updateTestCase(id, data)`
  - `deleteTestCase(id)`
  - `bulkUpdateStatus(ids[], status)`

---

## Phase 8: Frontend - Component Updates

- [x] **8.1 Update TestManagerPage.tsx**
  - Remove mock data imports
  - Call `fetchProjects()` on mount with useEffect
  - Add loading and error UI states
  - Update handlers to use store async actions

- [x] **8.2 Update ProjectList.tsx**
  - Connect to store for projects data
  - Handle loading state
  - Handle create/delete with API

- [x] **8.3 Update TestSuiteList.tsx**
  - Fetch suites when project is selected
  - Handle loading state
  - Handle create/delete with API

- [x] **8.4 Update TestCaseTable.tsx**
  - Fetch cases when suite is selected
  - Handle loading state
  - Handle inline updates via API

- [x] **8.5 Update TestCaseModal.tsx**
  - Save changes via API (`updateTestCase`)
  - Handle loading state during save
  - Show error messages
  - History is now populated from backend

- [x] **8.6 Add error handling toast/notification**
  - Error banner added to TestManagerPage
  - Show API errors to user
  - Auto-dismiss after 5 seconds

---

## Phase 9: Frontend - Optimistic Updates & UX

- [x] **9.1 Implement optimistic updates**
  - Update UI immediately on action
  - Rollback on API error
  - Improves perceived performance

- [ ] **9.2 Add data caching**
  - Cache fetched data in store
  - Add refresh/invalidation strategy
  - Consider `stale-while-revalidate` pattern

- [ ] **9.3 Add keyboard shortcuts**
  - `Ctrl+N` / `Cmd+N` - New test case
  - `Ctrl+S` / `Cmd+S` - Save in modal
  - `Escape` - Close modal

- [ ] **9.4 Add confirmation dialogs**
  - Confirm before delete (project, suite, case)
  - Confirm before discarding unsaved changes

---

## Phase 10: Testing & Documentation

- [ ] **10.1 Manual testing checklist**
  - [ ] Create project, suite, test case
  - [ ] Update all fields in test case
  - [ ] Delete test case, suite, project
  - [ ] Verify history is tracked
  - [ ] Test with multiple users
  - [ ] Test error scenarios (network failure, unauthorized)

- [x] **10.2 Update frontend types**
  - Added `TestSuite` type to `testManager.ts`
  - Added `projectId` to `TestCase`
  - Ensure type safety across components

- [ ] **10.3 Update README.md**
  - Document new API endpoints
  - Update environment variables section
  - Add test case management feature documentation

- [ ] **10.4 Remove mock data (cleanup)**
  - Remove `frontend/src/utils/mockData.ts` after full integration
  - Remove mock data imports from components

---

## API Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project |
| GET | `/api/projects` | List user's projects |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:memberId` | Remove member |
| POST | `/api/projects/:projectId/suites` | Create suite |
| GET | `/api/projects/:projectId/suites` | List suites |
| GET | `/api/projects/:projectId/cases` | List all cases in project |
| GET | `/api/suites/:id` | Get suite |
| PUT | `/api/suites/:id` | Update suite |
| DELETE | `/api/suites/:id` | Delete suite |
| POST | `/api/suites/:suiteId/cases` | Create test case |
| GET | `/api/suites/:suiteId/cases` | List cases in suite |
| GET | `/api/cases/:id` | Get test case |
| PUT | `/api/cases/:id` | Update test case |
| DELETE | `/api/cases/:id` | Delete test case |
| PATCH | `/api/cases/bulk-status` | Bulk update status |

---

## File Structure After Implementation

```
backend/
├── models/
│   ├── user.model.ts          (existing)
│   ├── project.model.ts       (new)
│   ├── testSuite.model.ts     (new)
│   └── testCase.model.ts      (new)
├── services/
│   ├── example/               (existing)
│   └── testCase/
│       ├── controllers/
│       │   ├── project.controller.ts
│       │   ├── testSuite.controller.ts
│       │   └── testCase.controller.ts
│       ├── routes/
│       │   ├── project.route.ts
│       │   ├── testSuite.route.ts
│       │   └── testCase.route.ts
│       ├── services/
│       │   ├── project.service.ts
│       │   ├── testSuite.service.ts
│       │   └── testCase.service.ts
│       ├── types/
│       │   └── testCase.types.ts
│       └── __tests__/
│           ├── project.service.test.ts
│           ├── testSuite.service.test.ts
│           └── testCase.service.test.ts

frontend/
├── src/
│   ├── services/
│   │   ├── geminiService.ts   (existing)
│   │   └── testManagerApi.ts  (new)
│   ├── store/
│   │   ├── authStore.ts       (existing)
│   │   └── testManagerStore.ts (updated)
│   └── types/
│       ├── testManager.ts     (existing)
│       └── api/
│           └── testManager.api.ts (new)
```

---

## Notes

- Follow `.js` import extensions in backend (ES modules)
- Use `verifyToken` middleware for all protected routes
- Use `req.userId` set by middleware for user context
- Follow existing error handling patterns from `auth.controller.ts`
- Use `API_URL` constant from `frontend/src/utils/api.ts` for all API calls
- Set `axios.defaults.withCredentials = true` for cookie-based auth
