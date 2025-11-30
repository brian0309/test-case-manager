import { Document, Types } from "mongoose";

// Enums - Match frontend enums
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

// Subdocument interfaces
export interface IHistoryEntry {
  userId: Types.ObjectId;
  timestamp: Date;
  snapshot: {
    title?: string;
    priority?: Priority;
    status?: Status;
    area?: string;
    expectedResult?: string;
    testDescription?: string;
    stepsContent?: string;
    comments?: string;
  };
  changedFields: string[];
}

export interface ITestStep {
  action: string;
  expectedResult: string;
}

// Project interfaces
export interface IProject {
  name: string;
  description?: string;
  color: string;
  ownerId: Types.ObjectId;
  members: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectDocument extends IProject, Document {}

// TestSuite interfaces
export interface ITestSuite {
  name: string;
  description?: string;
  projectId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestSuiteDocument extends ITestSuite, Document {}

// TestCase interfaces
export interface ITestCase {
  title: string;
  priority: Priority;
  status: Status;
  projectId: Types.ObjectId;
  suiteId: Types.ObjectId;
  assignedTester?: Types.ObjectId;
  area?: string;
  expectedResult?: string;
  testDescription?: string;
  stepsContent?: string;
  comments?: string;
  history: IHistoryEntry[];
  createdBy: Types.ObjectId;
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestCaseDocument extends ITestCase, Document {}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  color: string;
  ownerId: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  stats: {
    suites: number;
    cases: number;
    members: number;
  };
  createdAt: string;
  updatedAt: string;
}

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

export interface TesterResponse {
  id: string;
  name: string;
  avatar: string;
}

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
    testDescription?: string;
    stepsContent?: string;
    comments?: string;
  };
  changedFields: string[];
}

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
  testDescription?: string;
  stepsContent?: string;
  comments?: string;
  history: HistoryEntryResponse[];
  lastModified: string;
  createdAt: string;
  updatedAt: string;
}

// Request body types
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
  testDescription?: string;
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
  testDescription?: string;
  stepsContent?: string;
  comments?: string;
}

export interface BulkUpdateStatusRequest {
  testCaseIds: string[];
  status: Status;
}
