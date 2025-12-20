import { Types } from "mongoose";
import { TestCase } from "../../../models/testCase.model.js";
import { TestSuite } from "../../../models/testSuite.model.js";
import { User } from "../../../models/user.model.js";
import * as projectService from "./project.service.js";
import {
  ITestCaseDocument,
  CreateTestCaseRequest,
  UpdateTestCaseRequest,
  TestCaseResponse,
  TesterResponse,
  HistoryEntryResponse,
  Priority,
  Status,
} from "../types/testCase.types.js";

/**
 * Create a new test case
 */
export const createTestCase = async (
  suiteId: string,
  userId: string,
  data: CreateTestCaseRequest
): Promise<ITestCaseDocument | null> => {
  // Get suite and check project access
  const suite = await TestSuite.findById(suiteId);
  if (!suite) {
    return null;
  }

  const hasAccess = await projectService.hasProjectAccess(
    suite.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  const testCase = new TestCase({
    title: data.title,
    priority: data.priority || Priority.Medium,
    status: data.status || Status.Draft,
    projectId: suite.projectId,
    suiteId: new Types.ObjectId(suiteId),
    assignedTester: data.assignedTesterId
      ? new Types.ObjectId(data.assignedTesterId)
      : new Types.ObjectId(userId), // Default to creator
    area: data.area || "",
    expectedResult: data.expectedResult || "",
    testDescription: data.testDescription || "",
    stepsContent: data.stepsContent || "",
    comments: data.comments || "",
    customFields: data.customFields || {},
    history: [],
    createdBy: new Types.ObjectId(userId),
  });

  await testCase.save();
  return testCase;
};

/**
 * Get all test cases for a suite
 */
export const getTestCasesBySuite = async (
  suiteId: string,
  userId: string
): Promise<ITestCaseDocument[]> => {
  const suite = await TestSuite.findById(suiteId);
  if (!suite) {
    return [];
  }

  const hasAccess = await projectService.hasProjectAccess(
    suite.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return [];
  }

  // First, check if any test cases have null/undefined order and initialize them
  const unorderedCases = await TestCase.find({
    suiteId: new Types.ObjectId(suiteId),
    $or: [{ order: null }, { order: { $exists: false } }],
  }).sort({ lastModified: -1 });

  if (unorderedCases.length > 0) {
    // Get max order in suite
    const maxOrderCase = await TestCase.findOne({
      suiteId: new Types.ObjectId(suiteId),
      order: { $exists: true, $ne: null },
    }).sort({ order: -1 });

    let nextOrder = (maxOrderCase?.order ?? -1) + 1;

    // Assign order to unordered cases
    const bulkOps = unorderedCases.map((tc) => ({
      updateOne: {
        filter: { _id: tc._id },
        update: { $set: { order: nextOrder++ } },
      },
    }));

    await TestCase.bulkWrite(bulkOps);
  }

  const testCases = await TestCase.find({
    suiteId: new Types.ObjectId(suiteId),
  })
    .populate("assignedTester", "name email")
    .populate("suiteId", "name")
    .populate("history.userId", "name email")
    .sort({ order: 1, lastModified: -1 })
    .lean();

  return testCases as unknown as ITestCaseDocument[];
};

/**
 * Get all test cases for a project
 */
export const getTestCasesByProject = async (
  projectId: string,
  userId: string
): Promise<ITestCaseDocument[]> => {
  const hasAccess = await projectService.hasProjectAccess(projectId, userId);
  if (!hasAccess) {
    return [];
  }

  const testCases = await TestCase.find({
    projectId: new Types.ObjectId(projectId),
  })
    .populate("assignedTester", "name email")
    .populate("suiteId", "name")
    .populate("history.userId", "name email")
    .sort({ suiteId: 1, order: 1, lastModified: -1 })
    .lean();

  return testCases as unknown as ITestCaseDocument[];
};

/**
 * Get a single test case by ID
 */
export const getTestCaseById = async (
  testCaseId: string,
  userId: string
): Promise<ITestCaseDocument | null> => {
  const testCase = await TestCase.findById(testCaseId)
    .populate("assignedTester", "name email")
    .populate("suiteId", "name")
    .populate("history.userId", "name email")
    .lean();

  if (!testCase) {
    return null;
  }

  const hasAccess = await projectService.hasProjectAccess(
    testCase.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  return testCase as unknown as ITestCaseDocument;
};

/**
 * Update a test case (with history tracking)
 */
export const updateTestCase = async (
  testCaseId: string,
  userId: string,
  data: UpdateTestCaseRequest
): Promise<ITestCaseDocument | null> => {
  const testCase = await TestCase.findById(testCaseId);
  if (!testCase) {
    return null;
  }

  const hasAccess = await projectService.hasProjectAccess(
    testCase.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  // Track changed fields for history
  const changedFields: string[] = [];
  const snapshot: any = {};

  // Store current values before update for history
  if (data.title !== undefined && data.title !== testCase.title) {
    changedFields.push("title");
    snapshot.title = testCase.title;
  }
  if (data.priority !== undefined && data.priority !== testCase.priority) {
    changedFields.push("priority");
    snapshot.priority = testCase.priority;
  }
  if (data.status !== undefined && data.status !== testCase.status) {
    changedFields.push("status");
    snapshot.status = testCase.status;
  }
  if (data.area !== undefined && data.area !== testCase.area) {
    changedFields.push("area");
    snapshot.area = testCase.area;
  }
  if (data.expectedResult !== undefined && data.expectedResult !== testCase.expectedResult) {
    changedFields.push("expectedResult");
    snapshot.expectedResult = testCase.expectedResult;
  }
  if (data.testDescription !== undefined && data.testDescription !== testCase.testDescription) {
    changedFields.push("testDescription");
    snapshot.testDescription = testCase.testDescription;
  }
  if (data.stepsContent !== undefined && data.stepsContent !== testCase.stepsContent) {
    changedFields.push("stepsContent");
    snapshot.stepsContent = testCase.stepsContent;
  }
  if (data.comments !== undefined && data.comments !== testCase.comments) {
    changedFields.push("comments");
    snapshot.comments = testCase.comments;
  }
  if (data.customFields !== undefined) {
    const currentCustomFields = testCase.customFields || {};
    const hasCustomFieldChanges = JSON.stringify(currentCustomFields) !== JSON.stringify(data.customFields);
    if (hasCustomFieldChanges) {
      changedFields.push("customFields");
      snapshot.customFields = currentCustomFields;
    }
  }

  // Build update object
  const updateObj: any = {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.priority !== undefined && { priority: data.priority }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.assignedTesterId !== undefined && {
      assignedTester: new Types.ObjectId(data.assignedTesterId),
    }),
    ...(data.area !== undefined && { area: data.area }),
    ...(data.expectedResult !== undefined && { expectedResult: data.expectedResult }),
    ...(data.testDescription !== undefined && { testDescription: data.testDescription }),
    ...(data.stepsContent !== undefined && { stepsContent: data.stepsContent }),
    ...(data.comments !== undefined && { comments: data.comments }),
    ...(data.customFields !== undefined && { customFields: data.customFields }),
    lastModified: new Date(),
  };

  // Add history entry if there are changes
  if (changedFields.length > 0) {
    const historyEntry = {
      userId: new Types.ObjectId(userId),
      timestamp: new Date(),
      snapshot,
      changedFields,
    };

    updateObj.$push = { history: { $each: [historyEntry], $position: 0 } };
  }

  const updatedTestCase = await TestCase.findByIdAndUpdate(
    testCaseId,
    changedFields.length > 0 ? updateObj : { $set: updateObj },
    { new: true }
  )
    .populate("assignedTester", "name email")
    .populate("suiteId", "name")
    .populate("history.userId", "name email")
    .lean();

  return updatedTestCase as unknown as ITestCaseDocument;
};

/**
 * Clone a test case
 */
export const cloneTestCase = async (
  testCaseId: string,
  userId: string
): Promise<ITestCaseDocument | null> => {
  const originalTestCase = await TestCase.findById(testCaseId);
  if (!originalTestCase) {
    return null;
  }

  const hasAccess = await projectService.hasProjectAccess(
    originalTestCase.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  const clonedTestCase = new TestCase({
    title: `Copy of ${originalTestCase.title}`,
    priority: originalTestCase.priority,
    status: Status.Draft,
    projectId: originalTestCase.projectId,
    suiteId: originalTestCase.suiteId,
    assignedTester: originalTestCase.assignedTester,
    area: originalTestCase.area,
    expectedResult: originalTestCase.expectedResult,
    testDescription: originalTestCase.testDescription,
    stepsContent: originalTestCase.stepsContent,
    comments: originalTestCase.comments,
    customFields: originalTestCase.customFields,
    history: [],
    createdBy: new Types.ObjectId(userId),
    order: originalTestCase.order,
  });

  await clonedTestCase.save();
  return clonedTestCase;
};

/**
 * Delete a test case
 */
export const deleteTestCase = async (
  testCaseId: string,
  userId: string
): Promise<boolean> => {
  const testCase = await TestCase.findById(testCaseId);
  if (!testCase) {
    return false;
  }

  // Check if user has project access
  const hasAccess = await projectService.hasProjectAccess(
    testCase.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return false;
  }

  await TestCase.deleteOne({ _id: new Types.ObjectId(testCaseId) });
  return true;
};

/**
 * Bulk update status for multiple test cases
 */
export const bulkUpdateStatus = async (
  testCaseIds: string[],
  userId: string,
  status: Status
): Promise<number> => {
  let updatedCount = 0;

  for (const testCaseId of testCaseIds) {
    const result = await updateTestCase(testCaseId, userId, { status });
    if (result) {
      updatedCount++;
    }
  }

  return updatedCount;
};

/**
 * Bulk delete test cases
 */
export const deleteTestCasesBulk = async (
  testCaseIds: string[],
  userId: string
): Promise<number> => {
  let deletedCount = 0;

  // We could do a bulk delete, but we need to check permissions for each one or group them by project.
  // For simplicity and safety, we'll iterate and check permissions.
  // Optimization: Find all test cases, group by project, check project access once per project.

  const testCases = await TestCase.find({ _id: { $in: testCaseIds } });

  // Group by project
  const projectIds = [...new Set(testCases.map(tc => tc.projectId.toString()))];

  // Check access for all involved projects
  const accessMap = new Map<string, boolean>();
  for (const projectId of projectIds) {
    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    accessMap.set(projectId, hasAccess);
  }

  const idsToDelete: Types.ObjectId[] = [];

  for (const testCase of testCases) {
    if (accessMap.get(testCase.projectId.toString())) {
      idsToDelete.push(testCase._id as Types.ObjectId);
    }
  }

  if (idsToDelete.length > 0) {
    const result = await TestCase.deleteMany({ _id: { $in: idsToDelete } });
    deletedCount = result.deletedCount;
  }

  return deletedCount;
};

/**
 * Reorder test cases within a suite
 */
export const reorderTestCases = async (
  suiteId: string,
  userId: string,
  items: Array<{ caseId: string; newOrder: number }>
): Promise<boolean> => {
  const suite = await TestSuite.findById(suiteId);
  if (!suite) {
    return false;
  }

  const hasAccess = await projectService.hasProjectAccess(
    suite.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return false;
  }

  // Update each test case order
  const bulkOps = items.map(({ caseId, newOrder }) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(caseId), suiteId: new Types.ObjectId(suiteId) },
      update: { $set: { order: newOrder } },
    },
  }));

  if (bulkOps.length > 0) {
    await TestCase.bulkWrite(bulkOps);
  }

  return true;
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
 * Format history entry for API response
 */
const formatHistoryEntry = (entry: any): HistoryEntryResponse => {
  return {
    id: entry._id?.toString() || `h-${Date.now()}`,
    timestamp: entry.timestamp?.toISOString() || new Date().toISOString(),
    user: formatTesterResponse(entry.userId),
    snapshot: entry.snapshot || {},
    changedFields: (entry.changedFields as string[]) || [],
  };
};

/**
 * Format test case for API response
 */
export const formatTestCaseResponse = (testCase: any): TestCaseResponse => {
  const suiteName =
    typeof testCase.suiteId === "object" && testCase.suiteId?.name
      ? testCase.suiteId.name
      : "Unknown Suite";

  // Convert Map to plain object if necessary
  let customFieldsObj: Record<string, string> | undefined;
  if (testCase.customFields) {
    if (testCase.customFields instanceof Map) {
      customFieldsObj = Object.fromEntries(testCase.customFields);
    } else if (typeof testCase.customFields === 'object') {
      customFieldsObj = testCase.customFields;
    }
  }

  return {
    id: testCase._id.toString(),
    title: testCase.title,
    priority: testCase.priority,
    status: testCase.status,
    projectId: testCase.projectId.toString(),
    suiteId:
      typeof testCase.suiteId === "object"
        ? testCase.suiteId._id?.toString()
        : testCase.suiteId.toString(),
    suite: suiteName,
    assignedTester: formatTesterResponse(testCase.assignedTester),
    area: testCase.area,
    expectedResult: testCase.expectedResult,
    testDescription: testCase.testDescription,
    stepsContent: testCase.stepsContent,
    comments: testCase.comments,
    customFields: customFieldsObj,
    history: (testCase.history || []).map(formatHistoryEntry),
    order: testCase.order ?? 0,
    lastModified: testCase.lastModified?.toISOString() || new Date().toISOString(),
    createdAt: testCase.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: testCase.updatedAt?.toISOString() || new Date().toISOString(),
  };
};

/**
 * Bulk import test cases with duplicate detection and continue-on-error
 */
export const bulkImportTestCases = async (
  suiteId: string,
  userId: string,
  testCases: any[],
  skipDuplicates = false
): Promise<{
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{ index: number; title?: string; message: string }>;
  duplicates?: string[];
}> => {
  // Get suite and check project access
  const suite = await TestSuite.findById(suiteId);
  if (!suite) {
    throw new Error("Test suite not found");
  }

  const hasAccess = await projectService.hasProjectAccess(
    suite.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    throw new Error("You don't have access to this project");
  }

  const result = {
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [] as Array<{ index: number; title?: string; message: string }>,
    duplicates: [] as string[],
  };

  // Get existing test case titles in this suite for duplicate detection
  const existingTitles = new Set<string>();
  if (skipDuplicates) {
    const existingCases = await TestCase.find({
      suiteId: new Types.ObjectId(suiteId),
    }).select("title");
    existingCases.forEach((tc) => existingTitles.add(tc.title.toLowerCase().trim()));
  }

  // Get max order in suite for sequential ordering
  const maxOrderCase = await TestCase.findOne({
    suiteId: new Types.ObjectId(suiteId),
  }).sort({ order: -1 });
  let nextOrder = (maxOrderCase?.order ?? -1) + 1;

  // Process each test case
  for (let i = 0; i < testCases.length; i++) {
    const data = testCases[i];
    const trimmedTitle = data.title?.trim();

    try {
      // Validate required fields
      if (!trimmedTitle || trimmedTitle.length === 0) {
        result.failed++;
        result.errors.push({
          index: i + 1,
          title: trimmedTitle,
          message: "Title is required",
        });
        continue;
      }

      // Check for duplicates if option is enabled
      if (skipDuplicates && existingTitles.has(trimmedTitle.toLowerCase())) {
        result.skipped++;
        result.duplicates!.push(trimmedTitle);
        continue;
      }

      // Validate priority if provided
      if (data.priority && !Object.values(Priority).includes(data.priority)) {
        result.failed++;
        result.errors.push({
          index: i + 1,
          title: trimmedTitle,
          message: `Invalid priority: ${data.priority}. Must be one of: ${Object.values(Priority).join(", ")}`,
        });
        continue;
      }

      // Validate status if provided
      if (data.status && !Object.values(Status).includes(data.status)) {
        result.failed++;
        result.errors.push({
          index: i + 1,
          title: trimmedTitle,
          message: `Invalid status: ${data.status}. Must be one of: ${Object.values(Status).join(", ")}`,
        });
        continue;
      }

      // Validate assigned tester if provided
      let assignedTesterId = data.assignedTesterId;
      if (assignedTesterId) {
        if (!Types.ObjectId.isValid(assignedTesterId)) {
          // If not a valid ObjectId, try to find user by name or default to creator
          assignedTesterId = userId;
        } else {
          // Verify user exists
          const userExists = await User.findById(assignedTesterId);
          if (!userExists) {
            assignedTesterId = userId;
          }
        }
      }

      // Create test case
      const testCase = new TestCase({
        title: trimmedTitle,
        priority: data.priority || Priority.Medium,
        status: data.status || Status.Draft,
        projectId: suite.projectId,
        suiteId: new Types.ObjectId(suiteId),
        assignedTester: assignedTesterId
          ? new Types.ObjectId(assignedTesterId)
          : new Types.ObjectId(userId),
        area: data.area || "",
        expectedResult: data.expectedResult || "",
        testDescription: data.testDescription || "",
        stepsContent: data.stepsContent || "",
        comments: data.comments || "",
        customFields: data.customFields || {},
        history: [],
        createdBy: new Types.ObjectId(userId),
        order: nextOrder++,
      });

      await testCase.save();
      result.created++;

      // Add to duplicate check set
      if (skipDuplicates) {
        existingTitles.add(trimmedTitle.toLowerCase());
      }
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        index: i + 1,
        title: trimmedTitle,
        message: error.message || "Failed to create test case",
      });
    }
  }

  return result;
};

