/**
 * API Types for Test Case Manager
 * These types match the backend response structures
 */

// Enums - Must match backend
export enum Priority {
  Low = "Low",
  Medium = "Medium",
  High = "High",
  Critical = "Critical",
}

export enum Status {
  Draft = "Draft",
  Passed = "Passed",
  Failed = "Failed",
  Retest = "Retest",
  PassFixed = "Pass - Fixed",
  Skipped = "Skipped",
}

// Base API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// Member in a project
export interface ProjectMember {
  id: string;
  name: string;
  email: string;
}

// Tester attached to test case
export interface TesterResponse {
  id: string;
  name: string;
  avatar: string;
}

// Project stats
export interface ProjectStats {
  suites: number;
  cases: number;
  members: number;
}

// Project API Response
export interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  color: string;
  ownerId: string;
  members: ProjectMember[];
  stats: ProjectStats;
  createdAt: string;
  updatedAt: string;
}

// Test Suite API Response
export interface TestSuiteResponse {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  createdBy: string;
  caseCount: number;
  createdAt: string;
  updatedAt: string;
}

// History Entry Response
export interface HistoryEntryResponse {
  id: string;
  timestamp: string;
  user: TesterResponse;
  snapshot: {
    title?: string;
    priority?: Priority;
    status?: Status;
    area?: string;
    expectedResult?: string;
    stepsContent?: string;
    comments?: string;
  };
  changedFields: string[];
}

// Test Case API Response
export interface TestCaseResponse {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
  projectId: string;
  suiteId: string;
  suite: string; // Suite name for display
  assignedTester: TesterResponse;
  area?: string;
  expectedResult?: string;
  stepsContent?: string;
  comments?: string;
  history: HistoryEntryResponse[];
  lastModified: string;
  createdAt: string;
  updatedAt: string;
}

// Request Types
export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface AddMemberRequest {
  email: string;
}

export interface CreateTestSuiteRequest {
  name: string;
  description?: string;
}

export interface UpdateTestSuiteRequest {
  name?: string;
  description?: string;
}

export interface CreateTestCaseRequest {
  title: string;
  priority?: Priority;
  status?: Status;
  assignedTesterId?: string;
  area?: string;
  expectedResult?: string;
  stepsContent?: string;
  comments?: string;
}

export interface UpdateTestCaseRequest {
  title?: string;
  priority?: Priority;
  status?: Status;
  assignedTesterId?: string;
  area?: string;
  expectedResult?: string;
  stepsContent?: string;
  comments?: string;
}

export interface BulkUpdateStatusRequest {
  testCaseIds: string[];
  status: Status;
}

// API Error Response
export interface ApiErrorResponse {
  message: string;
  success: false;
}
