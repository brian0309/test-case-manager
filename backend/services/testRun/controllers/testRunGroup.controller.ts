import { Request, Response } from "express";
import { Types } from "mongoose";
import * as testRunGroupService from "../services/testRunGroup.service.js";
import {
    CreateTestRunGroupRequest,
    UpdateTestRunGroupRequest,
} from "../types/testRun.types.js";

/**
 * POST /api/projects/:projectId/run-groups
 * Create a new test run group
 */
export const createTestRunGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { projectId } = req.params as Record<string, string>;
        const data: CreateTestRunGroupRequest = req.body;

        if (!data.name || data.name.trim().length === 0) {
            res.status(400).json({ success: false, message: "Group name is required" });
            return;
        }

        const group = await testRunGroupService.createTestRunGroup(projectId, userId, data);

        if (!group) {
            res.status(404).json({
                success: false,
                message: "Project not found or you don't have permission",
            });
            return;
        }

        const populated = await testRunGroupService.getTestRunGroupById((group._id as Types.ObjectId).toString(), userId);
        const response = testRunGroupService.formatTestRunGroupResponse(populated);

        res.status(201).json({ success: true, data: response });
    } catch (error) {
        console.error("Error in createTestRunGroup:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /api/projects/:projectId/run-groups
 * List all test run groups for a project
 */
export const getTestRunGroupsByProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { projectId } = req.params as Record<string, string>;

        const groups = await testRunGroupService.getTestRunGroupsByProject(projectId, userId);
        const responses = groups.map(testRunGroupService.formatTestRunGroupResponse);

        res.status(200).json({ success: true, data: responses });
    } catch (error) {
        console.error("Error in getTestRunGroupsByProject:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /api/run-groups/:id
 * Get a single test run group by ID
 */
export const getTestRunGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { id } = req.params as Record<string, string>;
        const group = await testRunGroupService.getTestRunGroupById(id, userId);

        if (!group) {
            res.status(404).json({ success: false, message: "Test run group not found" });
            return;
        }

        const response = testRunGroupService.formatTestRunGroupResponse(group);
        res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error("Error in getTestRunGroup:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * PUT /api/run-groups/:id
 * Update a test run group
 */
export const updateTestRunGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { id } = req.params as Record<string, string>;
        const data: UpdateTestRunGroupRequest = req.body;

        const group = await testRunGroupService.updateTestRunGroup(id, userId, data);

        if (!group) {
            res.status(404).json({
                success: false,
                message: "Test run group not found or you don't have permission",
            });
            return;
        }

        const response = testRunGroupService.formatTestRunGroupResponse(group);
        res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error("Error in updateTestRunGroup:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * DELETE /api/run-groups/:id
 * Delete a test run group
 */
export const deleteTestRunGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { id } = req.params as Record<string, string>;
        const deleted = await testRunGroupService.deleteTestRunGroup(id, userId);

        if (!deleted) {
            res.status(404).json({
                success: false,
                message: "Test run group not found or you don't have permission",
            });
            return;
        }

        res.status(200).json({ success: true, message: "Test run group deleted successfully" });
    } catch (error) {
        console.error("Error in deleteTestRunGroup:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
