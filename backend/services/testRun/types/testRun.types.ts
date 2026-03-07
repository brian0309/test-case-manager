import { Document, Types } from "mongoose";

// Enums
export enum TestRunStatus {
  Draft = "Draft",
  InProgress = "In Progress",
  Completed = "Completed",
  Abandoned = "Abandoned",
}

export enum RunItemStatus {
  NotRun = "Not Run",
  Passed = "Passed",
  Failed = "Failed",
  Blocked = "Blocked",
  Skipped = "Skipped",
}

// Case snapshot for preserving test case state at run creation
export interface ICaseSnapshot {
  title: string;
  priority?: string;
  suiteId?: string;
  suiteName?: string;
  area?: string;
  expectedResult?: string;
  testDescription?: string;
  stepsContent?: string;
}

// Run Item (individual test case in a run)
export interface IRunItem {
  _id?: Types.ObjectId;
  caseId: Types.ObjectId;
  caseSnapshot: ICaseSnapshot;
  order: number;
  status: RunItemStatus;
  assignedTo?: Types.ObjectId;
  actualResult?: string;
  attachments?: string[];
  timeSpent?: number; // in seconds
  executedAt?: Date;
  executedBy?: Types.ObjectId;
}

// Results summary
export interface IResultsSummary {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
  passRate: number;
  totalTimeSpent: number;
}

// Test Run
export interface ITestRun {
  title: string;
  description?: string;
  projectId: Types.ObjectId;
  suiteId?: Types.ObjectId;
  groupId?: Types.ObjectId;
  status: TestRunStatus;
  environment?: string;
  tags?: string[];
  items: IRunItem[];
  createdBy: Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  resultsSummary: IResultsSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestRunDocument extends ITestRun, Document { }

// API Response types
export interface TesterResponse {
  id: string;
  name: string;
  avatar: string;
}

export interface CaseSnapshotResponse {
  title: string;
  priority?: string;
  suiteId?: string;
  suiteName?: string;
  area?: string;
  expectedResult?: string;
  testDescription?: string;
  stepsContent?: string;
}

export interface RunItemResponse {
  id: string;
  caseId: string;
  caseSnapshot: CaseSnapshotResponse;
  order: number;
  status: RunItemStatus;
  assignedTo?: TesterResponse;
  actualResult?: string;
  attachments?: string[];
  timeSpent?: number;
  executedAt?: string;
  executedBy?: TesterResponse;
}

export interface ResultsSummaryResponse {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
  passRate: number;
  totalTimeSpent: number;
}

export interface TestRunResponse {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  suiteId?: string;
  suiteName?: string;
  groupId?: string;
  status: TestRunStatus;
  environment?: string;
  tags?: string[];
  items: RunItemResponse[];
  createdBy: TesterResponse;
  startedAt?: string;
  completedAt?: string;
  resultsSummary: ResultsSummaryResponse;
  createdAt: string;
  updatedAt: string;
}

export interface TestRunListResponse {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  suiteId?: string;
  suiteName?: string;
  groupId?: string;
  status: TestRunStatus;
  environment?: string;
  tags?: string[];
  itemCount: number;
  createdBy: TesterResponse;
  startedAt?: string;
  completedAt?: string;
  resultsSummary: ResultsSummaryResponse;
  createdAt: string;
  updatedAt: string;
}

// Request body types
export interface CreateTestRunRequest {
  title: string;
  description?: string;
  suiteId?: string;
  groupId?: string;
  environment?: string;
  tags?: string[];
  testCaseIds: string[]; // IDs of test cases to include
}

export interface UpdateTestRunRequest {
  title?: string;
  description?: string;
  environment?: string;
  tags?: string[];
  status?: TestRunStatus;
  groupId?: string | null; // null to remove from group
  additionalTestCaseIds?: string[];
}

export interface UpdateRunItemRequest {
  status?: RunItemStatus;
  actualResult?: string;
  attachments?: string[];
  timeSpent?: number;
}

export interface ReorderRunItemsRequest {
  items: Array<{
    itemId: string;
    newOrder: number;
  }>;
}

export interface ReorderTestCasesRequest {
  items: Array<{
    caseId: string;
    newOrder: number;
  }>;
}

// =========================================================================
// TEST RUN GROUP TYPES
// =========================================================================

export interface ITestRunGroup {
  name: string;
  description?: string;
  projectId: Types.ObjectId;
  color?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestRunGroupDocument extends ITestRunGroup, Document { }

export interface TestRunGroupResponse {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  color?: string;
  createdBy: TesterResponse;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestRunGroupRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateTestRunGroupRequest {
  name?: string;
  description?: string;
  color?: string;
}

