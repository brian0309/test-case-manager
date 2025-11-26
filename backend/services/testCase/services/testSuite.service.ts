import { Types } from "mongoose";
import { TestSuite } from "../../../models/testSuite.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import * as projectService from "./project.service.js";
import {
  ITestSuiteDocument,
  CreateTestSuiteRequest,
  UpdateTestSuiteRequest,
  TestSuiteResponse,
} from "../types/testCase.types.js";

/**
 * Create a new test suite
 */
export const createTestSuite = async (
  projectId: string,
  userId: string,
  data: CreateTestSuiteRequest
): Promise<ITestSuiteDocument | null> => {
  // Check project access
  const hasAccess = await projectService.hasProjectAccess(projectId, userId);
  if (!hasAccess) {
    return null;
  }

  const suite = new TestSuite({
    name: data.name,
    description: data.description || "",
    projectId: new Types.ObjectId(projectId),
    createdBy: new Types.ObjectId(userId),
  });

  await suite.save();
  return suite;
};

/**
 * Get all test suites for a project
 */
export const getTestSuitesByProject = async (
  projectId: string,
  userId: string
): Promise<ITestSuiteDocument[]> => {
  // Check project access
  const hasAccess = await projectService.hasProjectAccess(projectId, userId);
  if (!hasAccess) {
    return [];
  }

  const suites = await TestSuite.find({
    projectId: new Types.ObjectId(projectId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return suites as unknown as ITestSuiteDocument[];
};

/**
 * Get a single test suite by ID
 */
export const getTestSuiteById = async (
  suiteId: string,
  userId: string
): Promise<ITestSuiteDocument | null> => {
  const suite = await TestSuite.findById(suiteId).lean();

  if (!suite) {
    return null;
  }

  // Check project access
  const hasAccess = await projectService.hasProjectAccess(
    suite.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  return suite as unknown as ITestSuiteDocument;
};

/**
 * Update a test suite
 */
export const updateTestSuite = async (
  suiteId: string,
  userId: string,
  data: UpdateTestSuiteRequest
): Promise<ITestSuiteDocument | null> => {
  const suite = await TestSuite.findById(suiteId);

  if (!suite) {
    return null;
  }

  // Check project access
  const hasAccess = await projectService.hasProjectAccess(
    suite.projectId.toString(),
    userId
  );
  if (!hasAccess) {
    return null;
  }

  const updatedSuite = await TestSuite.findByIdAndUpdate(
    suiteId,
    {
      $set: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    },
    { new: true }
  ).lean();

  return updatedSuite as unknown as ITestSuiteDocument;
};

/**
 * Delete a test suite (cascades to test cases)
 */
export const deleteTestSuite = async (
  suiteId: string,
  userId: string
): Promise<boolean> => {
  const suite = await TestSuite.findById(suiteId);

  if (!suite) {
    return false;
  }

  // Check project access (only owner can delete)
  const isOwner = await projectService.isProjectOwner(
    suite.projectId.toString(),
    userId
  );
  
  // Or the creator of the suite can delete it
  const isCreator = suite.createdBy.toString() === userId;

  if (!isOwner && !isCreator) {
    return false;
  }

  // Cascade delete test cases
  await TestCase.deleteMany({ suiteId: new Types.ObjectId(suiteId) });
  await TestSuite.deleteOne({ _id: new Types.ObjectId(suiteId) });

  return true;
};

/**
 * Get case count for a suite
 */
export const getSuiteCaseCount = async (suiteId: string): Promise<number> => {
  return await TestCase.countDocuments({ suiteId: new Types.ObjectId(suiteId) });
};

/**
 * Format test suite for API response
 */
export const formatTestSuiteResponse = async (
  suite: any
): Promise<TestSuiteResponse> => {
  const caseCount = await getSuiteCaseCount(suite._id.toString());

  return {
    id: suite._id.toString(),
    name: suite.name,
    description: suite.description,
    projectId: suite.projectId.toString(),
    createdBy: suite.createdBy.toString(),
    caseCount,
    createdAt: suite.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: suite.updatedAt?.toISOString() || new Date().toISOString(),
  };
};
