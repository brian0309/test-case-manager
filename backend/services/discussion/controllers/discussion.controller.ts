import { Request, Response } from "express";
import * as discussionService from "../services/discussion.service.js";
import * as projectService from "../../testCase/services/project.service.js";
import { socketManager } from "../../../socket/socketManager.js";

/**
 * GET /api/cases/:testCaseId/discussions
 * Get all discussion messages for a test case
 */
export const getDiscussionMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const testCaseId = req.params.testCaseId as string;
    const userId = req.userId;

    if (!testCaseId) {
      res.status(400).json({ success: false, message: "Test case ID is required" });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Verify the user has access to the project this test case belongs to
    const projectId = await discussionService.getProjectIdForTestCase(testCaseId);
    if (!projectId) {
      res.status(404).json({ success: false, message: "Test case not found" });
      return;
    }

    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const messages = await discussionService.getMessages(testCaseId);
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching discussion messages:", error);
    res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
};

/**
 * POST /api/cases/:testCaseId/discussions
 * Create a new discussion message
 */
export const createDiscussionMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const testCaseId = req.params.testCaseId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!testCaseId) {
      res.status(400).json({ success: false, message: "Test case ID is required" });
      return;
    }

    const { body, attachments, projectId } = req.body;

    if (!body || !body.trim()) {
      res.status(400).json({ success: false, message: "Message body is required" });
      return;
    }

    if (!projectId) {
      res.status(400).json({ success: false, message: "Project ID is required" });
      return;
    }

    // Verify the user has access to this project
    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const message = await discussionService.createMessage(
      testCaseId,
      projectId,
      userId,
      body.trim(),
      attachments ?? []
    );

    // Emit real-time event to all users viewing this test case's project
    socketManager.emitToProject(projectId, "discussion:created", {
      message,
      testCaseId,
      projectId,
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error("Error creating discussion message:", error);
    res.status(500).json({ success: false, message: "Failed to create message" });
  }
};
