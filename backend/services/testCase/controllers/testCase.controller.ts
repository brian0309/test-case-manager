import { Request, Response } from "express";
import * as testCaseService from "../services/testCase.service.js";
import * as projectService from "../services/project.service.js";
import {
  CreateTestCaseRequest,
  UpdateTestCaseRequest,
  BulkUpdateStatusRequest,
  ReorderTestCasesRequest,
} from "../types/testCase.types.js";

/**
 * POST /api/suites/:suiteId/cases
 * Create a new test case in a suite
 */
export const createTestCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { suiteId } = req.params;
    const data: CreateTestCaseRequest = req.body;

    if (!data.title || data.title.trim().length === 0) {
      res.status(400).json({ success: false, message: "Test case title is required" });
      return;
    }

    const testCase = await testCaseService.createTestCase(suiteId, userId, data);

    if (!testCase) {
      res.status(404).json({
        success: false,
        message: "Test suite not found or you don't have access",
      });
      return;
    }

    // Fetch the populated test case for response
    const testCaseId = (testCase as any)._id.toString();
    const populatedTestCase = await testCaseService.getTestCaseById(
      testCaseId,
      userId
    );
    const response = testCaseService.formatTestCaseResponse(populatedTestCase);

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in createTestCase:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/suites/:suiteId/cases
 * List all test cases in a suite
 */
export const getTestCasesBySuite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { suiteId } = req.params;

    const testCases = await testCaseService.getTestCasesBySuite(suiteId, userId);
    const responses = testCases.map(testCaseService.formatTestCaseResponse);

    res.status(200).json({ success: true, data: responses });
  } catch (error) {
    console.error("Error in getTestCasesBySuite:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/projects/:projectId/cases
 * List all test cases in a project
 */
export const getTestCasesByProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { projectId } = req.params;

    // Check access
    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    const testCases = await testCaseService.getTestCasesByProject(projectId, userId);
    const responses = testCases.map(testCaseService.formatTestCaseResponse);

    res.status(200).json({ success: true, data: responses });
  } catch (error) {
    console.error("Error in getTestCasesByProject:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/cases/:id
 * Get a single test case by ID
 */
export const getTestCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const testCase = await testCaseService.getTestCaseById(id, userId);

    if (!testCase) {
      res.status(404).json({ success: false, message: "Test case not found" });
      return;
    }

    const response = testCaseService.formatTestCaseResponse(testCase);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in getTestCase:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/cases/:id
 * Update a test case
 */
export const updateTestCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const data: UpdateTestCaseRequest = req.body;

    const testCase = await testCaseService.updateTestCase(id, userId, data);

    if (!testCase) {
      res.status(404).json({
        success: false,
        message: "Test case not found or you don't have permission",
      });
      return;
    }

    const response = testCaseService.formatTestCaseResponse(testCase);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in updateTestCase:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/cases/:id/clone
 * Clone a test case
 */
export const cloneTestCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const clonedTestCase = await testCaseService.cloneTestCase(id, userId);

    if (!clonedTestCase) {
      res.status(404).json({
        success: false,
        message: "Test case not found or you don't have permission",
      });
      return;
    }

    // Fetch the populated test case for response
    const populatedTestCase = await testCaseService.getTestCaseById(
      String(clonedTestCase._id),
      userId
    );
    const response = testCaseService.formatTestCaseResponse(populatedTestCase);

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in cloneTestCase:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/cases/:id
 * Delete a test case
 */
export const deleteTestCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const deleted = await testCaseService.deleteTestCase(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Test case not found or you don't have permission to delete it",
      });
      return;
    }

    res.status(200).json({ success: true, message: "Test case deleted successfully" });
  } catch (error) {
    console.error("Error in deleteTestCase:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PATCH /api/cases/bulk-status
 * Bulk update status for multiple test cases
 */
export const bulkUpdateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { testCaseIds, status }: BulkUpdateStatusRequest = req.body;

    if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
      res.status(400).json({ success: false, message: "Test case IDs are required" });
      return;
    }

    if (!status) {
      res.status(400).json({ success: false, message: "Status is required" });
      return;
    }

    const updatedCount = await testCaseService.bulkUpdateStatus(
      testCaseIds,
      userId,
      status
    );

    res.status(200).json({
      success: true,
      message: `Updated ${updatedCount} of ${testCaseIds.length} test cases`,
      data: { updatedCount },
    });
  } catch (error) {
    console.error("Error in bulkUpdateStatus:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/cases/bulk
 * Bulk delete test cases
 */
export const deleteTestCasesBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: "Test case IDs are required" });
      return;
    }

    const deletedCount = await testCaseService.deleteTestCasesBulk(ids, userId);

    res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} test cases`,
      data: { deletedCount },
    });
  } catch (error) {
    console.error("Error in deleteTestCasesBulk:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PATCH /api/suites/:suiteId/cases/reorder
 * Reorder test cases within a suite
 */
export const reorderTestCases = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { suiteId } = req.params;
    const { items }: ReorderTestCasesRequest = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "Items array is required" });
      return;
    }

    const success = await testCaseService.reorderTestCases(suiteId, userId, items);

    if (!success) {
      res.status(404).json({
        success: false,
        message: "Suite not found or you don't have permission",
      });
      return;
    }

    // Return updated test cases
    const testCases = await testCaseService.getTestCasesBySuite(suiteId, userId);
    const responses = testCases.map(testCaseService.formatTestCaseResponse);

    res.status(200).json({
      success: true,
      message: "Test cases reordered successfully",
      data: responses,
    });
  } catch (error) {
    console.error("Error in reorderTestCases:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
