import { Request, Response } from "express";
import * as testSuiteService from "../services/testSuite.service.js";
import * as projectService from "../services/project.service.js";
import {
  CreateTestSuiteRequest,
  UpdateTestSuiteRequest,
} from "../types/testCase.types.js";
import {
  emitTestSuiteCreated,
  emitTestSuiteUpdated,
  emitTestSuiteDeleted,
} from "../../../socket/socketManager.js";

/**
 * POST /api/projects/:projectId/suites
 * Create a new test suite in a project
 */
export const createTestSuite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { projectId } = req.params as Record<string, string>;
    const data: CreateTestSuiteRequest = req.body;

    if (!data.name || data.name.trim().length === 0) {
      res.status(400).json({ success: false, message: "Suite name is required" });
      return;
    }

    const suite = await testSuiteService.createTestSuite(projectId, userId, data);

    if (!suite) {
      res.status(404).json({
        success: false,
        message: "Project not found or you don't have access",
      });
      return;
    }

    const response = await testSuiteService.formatTestSuiteResponse(suite);
    
    // Emit socket event for real-time updates
    emitTestSuiteCreated(projectId, response);

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in createTestSuite:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/projects/:projectId/suites
 * List all test suites in a project
 */
export const getTestSuites = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { projectId } = req.params as Record<string, string>;

    // Check access
    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    const suites = await testSuiteService.getTestSuitesByProject(projectId, userId);
    const responses = await Promise.all(
      suites.map((s) => testSuiteService.formatTestSuiteResponse(s))
    );

    res.status(200).json({ success: true, data: responses });
  } catch (error) {
    console.error("Error in getTestSuites:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/suites/:id
 * Get a single test suite by ID
 */
export const getTestSuite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params as Record<string, string>;
    const suite = await testSuiteService.getTestSuiteById(id, userId);

    if (!suite) {
      res.status(404).json({ success: false, message: "Test suite not found" });
      return;
    }

    const response = await testSuiteService.formatTestSuiteResponse(suite);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in getTestSuite:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/suites/:id
 * Update a test suite
 */
export const updateTestSuite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params as Record<string, string>;
    const data: UpdateTestSuiteRequest = req.body;

    const suite = await testSuiteService.updateTestSuite(id, userId, data);

    if (!suite) {
      res.status(404).json({
        success: false,
        message: "Test suite not found or you don't have permission",
      });
      return;
    }

    const response = await testSuiteService.formatTestSuiteResponse(suite);
    
    // Emit socket event for real-time updates
    const projectId = suite.projectId?.toString();
    if (projectId) {
      emitTestSuiteUpdated(projectId, response);
    }

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in updateTestSuite:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/suites/:id
 * Delete a test suite
 */
export const deleteTestSuite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params as Record<string, string>;
    
    // Get suite info before deletion for socket event
    const suiteBeforeDelete = await testSuiteService.getTestSuiteById(id, userId);
    const projectId = suiteBeforeDelete?.projectId?.toString();

    const deleted = await testSuiteService.deleteTestSuite(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Test suite not found or you don't have permission to delete it",
      });
      return;
    }

    // Emit socket event for real-time updates
    if (projectId) {
      emitTestSuiteDeleted(projectId, id);
    }

    res.status(200).json({ success: true, message: "Test suite deleted successfully" });
  } catch (error) {
    console.error("Error in deleteTestSuite:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
