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
  ReadyForTesting = "Ready for Testing",
  InProgress = "In Progress",
  Passed = "Passed",
  Failed = "Failed",
  Blocked = "Blocked",
  Retest = "Retest",
  PassFixed = "Pass - Fixed",
  Skipped = "Skipped",
  OutOfScope = "Out of Scope",
}

// Base API Response
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
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
  tags?: string[];
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
    testDescription?: string;
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
  testDescription?: string;
  stepsContent?: string;
  comments?: string;
  customFields?: Record<string, string>;
  history: HistoryEntryResponse[];
  order: number;
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
  tags?: string[];
}

export interface UpdateTestSuiteRequest {
  name?: string;
  description?: string;
  tags?: string[];
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
  customFields?: Record<string, string>;
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
  customFields?: Record<string, string>;
}

export interface BulkImportTestCasesRequest {
  testCases: CreateTestCaseRequest[];
  skipDuplicates?: boolean;
}

// Extended request for test case with suite name
export interface CreateTestCaseWithSuiteRequest extends CreateTestCaseRequest {
  suiteName?: string; // Optional suite name from CSV
}

// Project-level bulk import with suite support
export interface BulkImportWithSuiteRequest {
  testCases: CreateTestCaseWithSuiteRequest[];
  skipDuplicates?: boolean;
  createMissingSuites?: boolean; // If true, create suites that don't exist
  defaultSuiteId?: string; // Fallback suite for test cases without a suite name
}

export interface BulkImportError {
  index: number;
  title?: string;
  message: string;
}

export interface BulkImportResult {
  created: number;
  skipped: number;
  failed: number;
  errors: BulkImportError[];
  duplicates?: string[];
}

// Extended result for project-level import with suite support
export interface BulkImportWithSuiteResult extends BulkImportResult {
  suitesCreated?: string[]; // Names of suites that were created
  suiteStats?: Record<string, { created: number; skipped: number; failed: number }>;
}

export interface BulkUpdateStatusRequest {
  testCaseIds: string[];
  status: Status;
}

export interface ReorderTestCasesRequest {
  items: Array<{
    caseId: string;
    newOrder: number;
  }>;
}

// Test Run Enums
export enum TestRunStatus {
  Draft = "Draft",
  InProgress = "In Progress",
  Completed = "Completed",
  Abandoned = "Abandoned",
}

export enum RunItemStatus {
  NotRun = "Not Run",
  ReadyForTesting = "Ready for Testing",
  InProgress = "In Progress",
  Passed = "Passed",
  Failed = "Failed",
  Blocked = "Blocked",
  Skipped = "Skipped",
  OutOfScope = "Out of Scope",
}

// Test Run Types
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

export interface CreateTestRunRequest {
  title: string;
  description?: string;
  suiteId?: string;
  groupId?: string;
  environment?: string;
  tags?: string[];
  testCaseIds: string[];
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

// ============================================================================
// TEST RUN GROUP TYPES
// ============================================================================

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

// API Error Response
export interface ApiErrorResponse {
  message: string;
  success: false;
}

// ============================================================================
// TICKET TYPES
// ============================================================================

export enum TicketStatus {
  Open = "Open",
  InProgress = "In Progress",
  Resolved = "Resolved",
  Closed = "Closed",
  Reopened = "Reopened",
}

export enum TicketPriority {
  Low = "Low",
  Medium = "Medium",
  High = "High",
  Critical = "Critical",
}

export enum TicketSeverity {
  Trivial = "Trivial",
  Minor = "Minor",
  Major = "Major",
  Critical = "Critical",
  Blocker = "Blocker",
}

export interface TicketResponse {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  assignedTo?: TesterResponse;
  createdBy: TesterResponse;
  relatedRunId?: string;
  relatedRunItemId?: string;
  attachments: AttachmentResponse[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketListResponse {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  assignedTo?: TesterResponse;
  createdBy: TesterResponse;
  relatedRunId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentResponse {
  url: string;
  filename: string;
  fileSize: number;
  contentType: string;
}

export interface CreateTicketRequest {
  title: string;
  description?: string;
  priority: TicketPriority;
  severity: TicketSeverity;
  assignedToId?: string;
  relatedRunId?: string;
  relatedRunItemId?: string;
  tags?: string[];
  attachments?: AttachmentResponse[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  severity?: TicketSeverity;
  assignedToId?: string | null;
  relatedRunId?: string;
  relatedRunItemId?: string;
  tags?: string[];
  attachments?: AttachmentResponse[];
}

