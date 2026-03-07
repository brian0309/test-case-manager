import { Request, Response } from "express";
import * as discussionService from "../services/discussion.service.js";
import * as projectService from "../../testCase/services/project.service.js";
import { socketManager } from "../../../socket/socketManager.js";
import { MessageFixState } from "../types/discussion.types.js";

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

/**
 * PATCH /api/cases/:testCaseId/discussions/:messageId/fix-state
 * Update the tracked fix state for a discussion message.
 */
export const updateDiscussionMessageFixState = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const testCaseId = req.params.testCaseId as string;
    const messageId = req.params.messageId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!testCaseId || !messageId) {
      res.status(400).json({ success: false, message: "Test case ID and message ID are required" });
      return;
    }

    const { projectId, fixState } = req.body as {
      projectId?: string;
      fixState?: MessageFixState;
    };

    if (!projectId) {
      res.status(400).json({ success: false, message: "Project ID is required" });
      return;
    }

    if (!fixState || !Object.values(MessageFixState).includes(fixState)) {
      res.status(400).json({ success: false, message: "A valid fix state is required" });
      return;
    }

    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const message = await discussionService.updateMessageFixState(
      testCaseId,
      projectId,
      messageId,
      fixState
    );

    if (!message) {
      res.status(404).json({ success: false, message: "Discussion message not found" });
      return;
    }

    socketManager.emitToProject(projectId, "discussion:updated", {
      message,
      testCaseId,
      projectId,
    });

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    console.error("Error updating discussion message fix state:", error);
    res.status(500).json({ success: false, message: "Failed to update message" });
  }
};

/**
 * DELETE /api/cases/:testCaseId/discussions/:messageId
 * Delete a discussion message authored by the current user.
 */
export const deleteDiscussionMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const testCaseId = req.params.testCaseId as string;
    const messageId = req.params.messageId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!testCaseId || !messageId) {
      res.status(400).json({ success: false, message: "Test case ID and message ID are required" });
      return;
    }

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

    const message = await discussionService.getMessageById(testCaseId, projectId, messageId);
    if (!message) {
      res.status(404).json({ success: false, message: "Discussion message not found" });
      return;
    }

    if (message.user.id !== userId) {
      res.status(403).json({ success: false, message: "You can only delete your own messages" });
      return;
    }

    const deleted = await discussionService.deleteMessage(testCaseId, projectId, messageId);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Discussion message not found" });
      return;
    }

    socketManager.emitToProject(projectId, "discussion:deleted", {
      messageId,
      testCaseId,
      projectId,
    });

    res.status(200).json({ success: true, data: { id: messageId } });
  } catch (error) {
    console.error("Error deleting discussion message:", error);
    res.status(500).json({ success: false, message: "Failed to delete message" });
  }
};
