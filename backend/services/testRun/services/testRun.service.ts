import { Types } from "mongoose";
import { TestRun } from "../../../models/testRun.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import * as projectService from "../../testCase/services/project.service.js";
import {
  ITestRunDocument,
  IRunItem,
  TestRunStatus,
  RunItemStatus,
  CreateTestRunRequest,
  UpdateTestRunRequest,
  UpdateRunItemRequest,
  TestRunResponse,
  TestRunListResponse,
  RunItemResponse,
  TesterResponse,
  ReorderRunItemsRequest,
} from "../types/testRun.types.js";

/**
 * Create a new test run
 */
export const createTestRun = async (
  projectId: string,
  userId: string,
  data: CreateTestRunRequest
): Promise<ITestRunDocument | null> => {
  // Check project access
  const hasAccess = await projectService.hasProjectAccess(projectId, userId);
  if (!hasAccess) {
    return null;
  }

  // Fetch test cases to include
  const testCases = await TestCase.find({
    _id: { $in: data.testCaseIds.map((id) => new Types.ObjectId(id)) },
    projectId: new Types.ObjectId(projectId),
  })
    .sort({ order: 1 })
    .lean();

  if (testCases.length === 0) {
    return null;
  }

  // Create run items with snapshots
  const items: IRunItem[] = testCases.map((tc, index) => ({
    caseId: tc._id as Types.ObjectId,
    caseSnapshot: {
      title: tc.title,
      priority: tc.priority,
      area: tc.area,
      expectedResult: tc.expectedResult,
      testDescription: tc.testDescription,
      stepsContent: tc.stepsContent,
    },
    order: index,
    status: RunItemStatus.NotRun,
    assignedTo: tc.assignedTester,
  }));

  const testRun = new TestRun({
    title: data.title,
    description: data.description,
    projectId: new Types.ObjectId(projectId),
    suiteId: data.suiteId ? new Types.ObjectId(data.suiteId) : undefined,
    groupId: data.groupId ? new Types.ObjectId(data.groupId) : undefined,
    status: TestRunStatus.Draft,
    environment: data.environment,
    tags: data.tags || [],
    items,
    createdBy: new Types.ObjectId(userId),
    resultsSummary: {
      total: items.length,
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      notRun: items.length,
      passRate: 0,
      totalTimeSpent: 0,
    },
  });

  await testRun.save();
  return testRun;
};

/**
 * Get all test runs for a project
 */
export const getTestRunsByProject = async (
  projectId: string,
  userId: string
): Promise<ITestRunDocument[]> => {
  const hasAccess = await projectService.hasProjectAccess(projectId, userId);
  if (!hasAccess) {
    return [];
  }

  const testRuns = await TestRun.find({
    projectId: new Types.ObjectId(projectId),
  })
    .populate("createdBy", "name email")
    .populate("suiteId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return testRuns as unknown as ITestRunDocument[];
};

/**
 * Get a single test run by ID
 */
export const getTestRunById = async (
  testRunId: string,
  userId: string
): Promise<ITestRunDocument | null> => {
  const testRun = await TestRun.findById(testRunId)
    .populate("createdBy", "name email")
    .populate("suiteId", "name")
    .populate("items.assignedTo", "name email")
    .populate("items.executedBy", "name email")
    .lean();

  if (!testRun) {
    return null;
  }

  const hasAccess = await projectService.hasProjectAccess(
    testRun.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  return testRun as unknown as ITestRunDocument;
};

/**
 * Update a test run
 */
export const updateTestRun = async (
  testRunId: string,
  userId: string,
  data: UpdateTestRunRequest
): Promise<ITestRunDocument | null> => {
  const testRun = await TestRun.findById(testRunId);
  if (!testRun) {
    return null;
  }

  const hasAccess = await projectService.hasProjectAccess(
    testRun.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  // Handle status transitions
  if (data.status) {
    if (
      data.status === TestRunStatus.InProgress &&
      testRun.status === TestRunStatus.Draft
    ) {
      testRun.startedAt = new Date();
    }
    if (
      (data.status === TestRunStatus.Completed ||
        data.status === TestRunStatus.Abandoned) &&
      !testRun.completedAt
    ) {
      testRun.completedAt = new Date();
      // Recalculate summary
      updateResultsSummary(testRun);
    }
    testRun.status = data.status;
  }

  if (data.title) testRun.title = data.title;
  if (data.description !== undefined) testRun.description = data.description;
  if (data.environment !== undefined) testRun.environment = data.environment;
  if (data.tags !== undefined) testRun.tags = data.tags;
  if (data.groupId !== undefined) {
    testRun.groupId = data.groupId ? new Types.ObjectId(data.groupId) : undefined;
  }

  await testRun.save();

  return getTestRunById(testRunId, userId);
};

/**
 * Delete a test run
 */
export const deleteTestRun = async (
  testRunId: string,
  userId: string
): Promise<boolean> => {
  const testRun = await TestRun.findById(testRunId);
  if (!testRun) {
    return false;
  }

  const hasAccess = await projectService.hasProjectAccess(
    testRun.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return false;
  }

  await TestRun.deleteOne({ _id: new Types.ObjectId(testRunId) });
  return true;
};

/**
 * Update a run item (execute a test case in a run)
 */
export const updateRunItem = async (
  testRunId: string,
  itemId: string,
  userId: string,
  data: UpdateRunItemRequest
): Promise<ITestRunDocument | null> => {
  const testRun = await TestRun.findById(testRunId);
  if (!testRun) {
    return null;
  }

  const hasAccess = await projectService.hasProjectAccess(
    testRun.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  const item = testRun.items.find(
    (i) => (i._id as Types.ObjectId).toString() === itemId
  );
  if (!item) {
    return null;
  }

  // Update item
  if (data.status !== undefined) {
    item.status = data.status;
    if (data.status !== RunItemStatus.NotRun) {
      item.executedAt = new Date();
      item.executedBy = new Types.ObjectId(userId);
    }
  }
  if (data.actualResult !== undefined) item.actualResult = data.actualResult;
  if (data.attachments !== undefined) item.attachments = data.attachments;
  if (data.timeSpent !== undefined) item.timeSpent = data.timeSpent;

  // If run is in Draft, move to InProgress when first item is executed
  if (
    testRun.status === TestRunStatus.Draft &&
    data.status &&
    data.status !== RunItemStatus.NotRun
  ) {
    testRun.status = TestRunStatus.InProgress;
    testRun.startedAt = new Date();
  }

  // Recalculate summary
  updateResultsSummary(testRun);

  await testRun.save();

  return getTestRunById(testRunId, userId);
};

/**
 * Reorder run items
 */
export const reorderRunItems = async (
  testRunId: string,
  userId: string,
  data: ReorderRunItemsRequest
): Promise<ITestRunDocument | null> => {
  const testRun = await TestRun.findById(testRunId);
  if (!testRun) {
    return null;
  }

  const hasAccess = await projectService.hasProjectAccess(
    testRun.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  // Update orders
  for (const { itemId, newOrder } of data.items) {
    const item = testRun.items.find(
      (i) => (i._id as Types.ObjectId).toString() === itemId
    );
    if (item) {
      item.order = newOrder;
    }
  }

  // Sort items by order
  testRun.items.sort((a, b) => a.order - b.order);

  await testRun.save();

  return getTestRunById(testRunId, userId);
};

/**
 * Clone a test run
 */
export const cloneTestRun = async (
  testRunId: string,
  userId: string,
  newTitle?: string
): Promise<ITestRunDocument | null> => {
  const originalRun = await TestRun.findById(testRunId).lean();
  if (!originalRun) {
    return null;
  }

  const hasAccess = await projectService.hasProjectAccess(
    originalRun.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  // Reset items to NotRun status
  const clonedItems: IRunItem[] = originalRun.items.map((item) => ({
    caseId: item.caseId,
    caseSnapshot: item.caseSnapshot,
    order: item.order,
    status: RunItemStatus.NotRun,
    assignedTo: item.assignedTo,
  }));

  const clonedRun = new TestRun({
    title: newTitle || `${originalRun.title} (Copy)`,
    description: originalRun.description,
    projectId: originalRun.projectId,
    suiteId: originalRun.suiteId,
    status: TestRunStatus.Draft,
    environment: originalRun.environment,
    tags: originalRun.tags,
    items: clonedItems,
    createdBy: new Types.ObjectId(userId),
    resultsSummary: {
      total: clonedItems.length,
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      notRun: clonedItems.length,
      passRate: 0,
      totalTimeSpent: 0,
    },
  });

  await clonedRun.save();
  return getTestRunById((clonedRun._id as Types.ObjectId).toString(), userId);
};

/**
 * Helper to update results summary
 */
function updateResultsSummary(testRun: ITestRunDocument): void {
  const summary = {
    total: testRun.items.length,
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    notRun: 0,
    passRate: 0,
    totalTimeSpent: 0,
  };

  for (const item of testRun.items) {
    summary.totalTimeSpent += item.timeSpent || 0;
    switch (item.status) {
      case RunItemStatus.Passed:
        summary.passed++;
        break;
      case RunItemStatus.Failed:
        summary.failed++;
        break;
      case RunItemStatus.Blocked:
        summary.blocked++;
        break;
      case RunItemStatus.Skipped:
        summary.skipped++;
        break;
      case RunItemStatus.NotRun:
      default:
        summary.notRun++;
        break;
    }
  }

  const executed = summary.total - summary.notRun;
  summary.passRate = executed > 0 ? Math.round((summary.passed / executed) * 100) : 0;

  testRun.resultsSummary = summary;
}

/**
 * Format tester for API response
 */
const formatTesterResponse = (user: any): TesterResponse => {
  if (!user) {
    return {
      id: "",
      name: "Unassigned",
      avatar: "https://ui-avatars.com/api/?name=U&background=gray&color=fff",
    };
  }

  const name = user.name || user.email || "Unknown";
  return {
    id: user._id?.toString() || user.toString(),
    name,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
  };
};

/**
 * Format run item for API response
 */
const formatRunItemResponse = (item: any): RunItemResponse => {
  return {
    id: item._id?.toString() || "",
    caseId: item.caseId?.toString() || "",
    caseSnapshot: item.caseSnapshot,
    order: item.order,
    status: item.status,
    assignedTo: item.assignedTo ? formatTesterResponse(item.assignedTo) : undefined,
    actualResult: item.actualResult,
    attachments: item.attachments,
    timeSpent: item.timeSpent,
    executedAt: item.executedAt?.toISOString(),
    executedBy: item.executedBy ? formatTesterResponse(item.executedBy) : undefined,
  };
};

/**
 * Format test run for API response (full)
 */
export const formatTestRunResponse = (testRun: any): TestRunResponse => {
  const suiteName =
    typeof testRun.suiteId === "object" && testRun.suiteId?.name
      ? testRun.suiteId.name
      : undefined;

  return {
    id: testRun._id.toString(),
    title: testRun.title,
    description: testRun.description,
    projectId: testRun.projectId.toString(),
    suiteId: testRun.suiteId
      ? typeof testRun.suiteId === "object"
        ? testRun.suiteId._id?.toString()
        : testRun.suiteId.toString()
      : undefined,
    suiteName,
    groupId: testRun.groupId?.toString(),
    status: testRun.status,
    environment: testRun.environment,
    tags: testRun.tags,
    items: (testRun.items || []).map(formatRunItemResponse),
    createdBy: formatTesterResponse(testRun.createdBy),
    startedAt: testRun.startedAt?.toISOString?.() || testRun.startedAt,
    completedAt: testRun.completedAt?.toISOString?.() || testRun.completedAt,
    resultsSummary: testRun.resultsSummary,
    createdAt: testRun.createdAt?.toISOString?.() || testRun.createdAt,
    updatedAt: testRun.updatedAt?.toISOString?.() || testRun.updatedAt,
  };
};

/**
 * Format test run for API response (list)
 */
export const formatTestRunListResponse = (testRun: any): TestRunListResponse => {
  const suiteName =
    typeof testRun.suiteId === "object" && testRun.suiteId?.name
      ? testRun.suiteId.name
      : undefined;

  return {
    id: testRun._id.toString(),
    title: testRun.title,
    description: testRun.description,
    projectId: testRun.projectId.toString(),
    suiteId: testRun.suiteId
      ? typeof testRun.suiteId === "object"
        ? testRun.suiteId._id?.toString()
        : testRun.suiteId.toString()
      : undefined,
    suiteName,
    groupId: testRun.groupId?.toString(),
    status: testRun.status,
    environment: testRun.environment,
    tags: testRun.tags,
    itemCount: testRun.items?.length || 0,
    createdBy: formatTesterResponse(testRun.createdBy),
    startedAt: testRun.startedAt?.toISOString?.() || testRun.startedAt,
    completedAt: testRun.completedAt?.toISOString?.() || testRun.completedAt,
    resultsSummary: testRun.resultsSummary,
    createdAt: testRun.createdAt?.toISOString?.() || testRun.createdAt,
    updatedAt: testRun.updatedAt?.toISOString?.() || testRun.updatedAt,
  };
};
