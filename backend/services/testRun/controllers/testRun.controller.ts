import { Request, Response } from "express";
import { Types } from "mongoose";
import * as testRunService from "../services/testRun.service.js";
import {
  CreateTestRunRequest,
  UpdateTestRunRequest,
  UpdateRunItemRequest,
  ReorderRunItemsRequest,
} from "../types/testRun.types.js";

/**
 * POST /api/projects/:projectId/runs
 * Create a new test run
 */
export const createTestRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { projectId } = req.params;
    const data: CreateTestRunRequest = req.body;

    if (!data.title || data.title.trim().length === 0) {
      res.status(400).json({ success: false, message: "Test run title is required" });
      return;
    }

    if (!data.testCaseIds || data.testCaseIds.length === 0) {
      res.status(400).json({ success: false, message: "At least one test case is required" });
      return;
    }

    const testRun = await testRunService.createTestRun(projectId, userId, data);

    if (!testRun) {
      res.status(404).json({
        success: false,
        message: "Project not found or no valid test cases",
      });
      return;
    }

    const populated = await testRunService.getTestRunById((testRun._id as Types.ObjectId).toString(), userId);
    const response = testRunService.formatTestRunResponse(populated);

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in createTestRun:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/projects/:projectId/runs
 * List all test runs for a project
 */
export const getTestRunsByProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { projectId } = req.params;

    const testRuns = await testRunService.getTestRunsByProject(projectId, userId);
    const responses = testRuns.map(testRunService.formatTestRunListResponse);

    res.status(200).json({ success: true, data: responses });
  } catch (error) {
    console.error("Error in getTestRunsByProject:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/runs/:id
 * Get a single test run by ID
 */
export const getTestRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const testRun = await testRunService.getTestRunById(id, userId);

    if (!testRun) {
      res.status(404).json({ success: false, message: "Test run not found" });
      return;
    }

    const response = testRunService.formatTestRunResponse(testRun);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in getTestRun:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/runs/:id
 * Update a test run
 */
export const updateTestRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const data: UpdateTestRunRequest = req.body;

    const testRun = await testRunService.updateTestRun(id, userId, data);

    if (!testRun) {
      res.status(404).json({
        success: false,
        message: "Test run not found or you don't have permission",
      });
      return;
    }

    const response = testRunService.formatTestRunResponse(testRun);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in updateTestRun:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/runs/:id
 * Delete a test run
 */
export const deleteTestRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const deleted = await testRunService.deleteTestRun(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Test run not found or you don't have permission",
      });
      return;
    }

    res.status(200).json({ success: true, message: "Test run deleted successfully" });
  } catch (error) {
    console.error("Error in deleteTestRun:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PATCH /api/runs/:id/items/:itemId
 * Update a run item (execute a test case)
 */
export const updateRunItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id, itemId } = req.params;
    const data: UpdateRunItemRequest = req.body;

    const testRun = await testRunService.updateRunItem(id, itemId, userId, data);

    if (!testRun) {
      res.status(404).json({
        success: false,
        message: "Test run or item not found",
      });
      return;
    }

    const response = testRunService.formatTestRunResponse(testRun);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in updateRunItem:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PATCH /api/runs/:id/reorder
 * Reorder items in a test run
 */
export const reorderRunItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const data: ReorderRunItemsRequest = req.body;

    if (!data.items || !Array.isArray(data.items)) {
      res.status(400).json({ success: false, message: "Items array is required" });
      return;
    }

    const testRun = await testRunService.reorderRunItems(id, userId, data);

    if (!testRun) {
      res.status(404).json({
        success: false,
        message: "Test run not found",
      });
      return;
    }

    const response = testRunService.formatTestRunResponse(testRun);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in reorderRunItems:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/runs/:id/clone
 * Clone a test run
 */
export const cloneTestRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { title } = req.body;

    const testRun = await testRunService.cloneTestRun(id, userId, title);

    if (!testRun) {
      res.status(404).json({
        success: false,
        message: "Test run not found",
      });
      return;
    }

    const response = testRunService.formatTestRunResponse(testRun);
    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in cloneTestRun:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/runs/:id/complete
 * Complete a test run
 */
export const completeTestRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const testRun = await testRunService.updateTestRun(id, userId, {
      status: "Completed" as any,
    });

    if (!testRun) {
      res.status(404).json({
        success: false,
        message: "Test run not found",
      });
      return;
    }

    const response = testRunService.formatTestRunResponse(testRun);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in completeTestRun:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
