import { Types } from "mongoose";
import { TestRun } from "../../../models/testRun.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import * as projectService from "../../testCase/services/project.service.js";
import {
  ITestRunDocument,
  ICaseSnapshot,
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

const toOptionalString = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && "toString" in value) {
    return value.toString();
  }

  return undefined;
};

const getSuiteReference = (
  suiteRef: unknown
): { suiteId?: string; suiteName?: string } => {
  if (!suiteRef) {
    return {};
  }

  if (typeof suiteRef === "object" && suiteRef !== null && "name" in suiteRef) {
    const populatedSuite = suiteRef as { _id?: unknown; name?: unknown };

    return {
      suiteId: toOptionalString(populatedSuite._id),
      suiteName:
        typeof populatedSuite.name === "string"
          ? populatedSuite.name
          : undefined,
    };
  }

  return { suiteId: toOptionalString(suiteRef) };
};

const buildCaseSnapshot = (testCase: any): ICaseSnapshot => {
  const { suiteId, suiteName } = getSuiteReference(testCase.suiteId);

  return {
    title: testCase.title,
    priority: testCase.priority,
    suiteId,
    suiteName,
    area: testCase.area,
    expectedResult: testCase.expectedResult,
    testDescription: testCase.testDescription,
    stepsContent: testCase.stepsContent,
  };
};

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
    .populate("suiteId", "name")
    .sort({ order: 1 })
    .lean();

  if (testCases.length === 0) {
    return null;
  }

  // Create run items with snapshots
  const items: IRunItem[] = testCases.map((tc, index) => ({
    caseId: tc._id as Types.ObjectId,
    caseSnapshot: buildCaseSnapshot(tc),
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

export const getTestRunsByProjectPaginated = async (
  projectId: string,
  userId: string,
  options: { limit: number; offset: number }
): Promise<{ items: ITestRunDocument[]; total: number }> => {
  const hasAccess = await projectService.hasProjectAccess(projectId, userId);
  if (!hasAccess) {
    return { items: [], total: 0 };
  }

  const query = {
    projectId: new Types.ObjectId(projectId),
  };

  const [items, total] = await Promise.all([
    TestRun.find(query)
      .populate("createdBy", "name email")
      .populate("suiteId", "name")
      .sort({ createdAt: -1 })
      .skip(options.offset)
      .limit(options.limit)
      .lean(),
    TestRun.countDocuments(query),
  ]);

  return {
    items: items as unknown as ITestRunDocument[],
    total,
  };
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

  if (data.additionalTestCaseIds && data.additionalTestCaseIds.length > 0) {
    const existingCaseIds = new Set(testRun.items.map((item) => item.caseId.toString()));
    const idsToAdd = Array.from(new Set(data.additionalTestCaseIds)).filter(
      (caseId) => !existingCaseIds.has(caseId)
    );

    if (idsToAdd.length > 0) {
      const testCases = await TestCase.find({
        _id: { $in: idsToAdd.map((caseId) => new Types.ObjectId(caseId)) },
        projectId: testRun.projectId,
      })
        .populate("suiteId", "name")
        .sort({ order: 1 })
        .lean();

      let nextOrder = testRun.items.reduce((maxOrder, item) => Math.max(maxOrder, item.order), -1) + 1;

      for (const testCase of testCases) {
        testRun.items.push({
          caseId: testCase._id as Types.ObjectId,
          caseSnapshot: buildCaseSnapshot(testCase),
          order: nextOrder++,
          status: RunItemStatus.NotRun,
          assignedTo: testCase.assignedTester,
        });
      }

      updateResultsSummary(testRun);
    }
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
): Promise<{ projectId: string } | null> => {
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

  await TestRun.deleteOne({ _id: new Types.ObjectId(testRunId) });
  return { projectId: testRun.projectId.toString() };
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
 * Get all unique tags for a project
 */
export const getTagsByProject = async (
  projectId: string,
  userId: string
): Promise<string[]> => {
  const hasAccess = await projectService.hasProjectAccess(projectId, userId);
  if (!hasAccess) {
    return [];
  }

  const tags = await TestRun.distinct("tags", {
    projectId: new Types.ObjectId(projectId),
    tags: { $exists: true, $ne: [] },
  });

  return (tags as string[]).sort();
};

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
  const caseSnapshot = item.caseSnapshot || {};

  return {
    id: item._id?.toString() || "",
    caseId: item.caseId?.toString() || "",
    caseSnapshot: {
      ...caseSnapshot,
      suiteId: toOptionalString(caseSnapshot.suiteId),
      suiteName:
        typeof caseSnapshot.suiteName === "string"
          ? caseSnapshot.suiteName
          : undefined,
    },
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
  const { suiteId, suiteName } = getSuiteReference(testRun.suiteId);

  return {
    id: testRun._id.toString(),
    title: testRun.title,
    description: testRun.description,
    projectId: testRun.projectId.toString(),
    suiteId,
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
  const { suiteId, suiteName } = getSuiteReference(testRun.suiteId);

  return {
    id: testRun._id.toString(),
    title: testRun.title,
    description: testRun.description,
    projectId: testRun.projectId.toString(),
    suiteId,
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
