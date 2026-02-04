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
    customFields?: Record<string, string>;
  };
  changedFields: string[];
}

export interface ITestStep {
  action: string;
  expectedResult: string;
}

// Custom field definition interfaces
export interface ICustomFieldOption {
  id: string;
  label: string;
}

export interface ICustomFieldDefinition {
  id: string;
  key?: string;
  label: string;
  type: "text" | "long_text" | "dropdown" | "wysiwyg";
  required?: boolean;
  options?: ICustomFieldOption[];
  defaultValue?: string;
  showOnTableByDefault?: boolean;
  order?: number;
  deleted?: boolean;
  deletedAt?: Date;
}

export interface IHiddenDefaultFields {
  area?: boolean;
  testDescription?: boolean;
  stepsContent?: boolean;
  expectedResult?: boolean;
  comments?: boolean;
  priority?: boolean;
  status?: boolean;
  assignedTester?: boolean;
}

export interface IHiddenDefaultColumns {
  id?: boolean;
  title?: boolean;
  priority?: boolean;
  status?: boolean;
  lastModified?: boolean;
  assignedTester?: boolean;
}

export interface IProjectSettings {
  testCases?: {
    hiddenDefaultFields?: IHiddenDefaultFields;
    table?: {
      hiddenDefaultColumns?: IHiddenDefaultColumns;
      visibleCustomFieldIds?: string[];
    };
    customFields?: ICustomFieldDefinition[];
  };
}

// Project interfaces
export interface IProject {
  name: string;
  description?: string;
  color: string;
  ownerId: Types.ObjectId;
  members: Types.ObjectId[];
  settings?: IProjectSettings;
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
  customFields?: Record<string, string>;
  history: IHistoryEntry[];
  createdBy: Types.ObjectId;
  lastModified: Date;
  order: number;
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
  customFields?: Record<string, string>;
  history: HistoryEntryResponse[];
  order: number;
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

export interface BulkImportTestCasesRequest {
  testCases: CreateTestCaseRequest[];
  skipDuplicates?: boolean;
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
  createdTestCases?: any[]; // For socket event emission
}

// Project-level bulk import with suite support
export interface CreateTestCaseWithSuiteRequest extends CreateTestCaseRequest {
  suiteName?: string; // Optional suite name from CSV
}

export interface BulkImportWithSuiteRequest {
  testCases: CreateTestCaseWithSuiteRequest[];
  skipDuplicates?: boolean;
  createMissingSuites?: boolean; // If true, create suites that don't exist
  defaultSuiteId?: string; // Fallback suite for test cases without a suite name
}

export interface BulkImportWithSuiteResult extends BulkImportResult {
  suitesCreated?: string[]; // Names of suites that were created
  suiteStats?: Record<string, { created: number; skipped: number; failed: number }>;
}
