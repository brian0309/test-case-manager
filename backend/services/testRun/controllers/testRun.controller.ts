import { Request, Response } from "express";
import { Types } from "mongoose";
import * as testRunService from "../services/testRun.service.js";
import {
  CreateTestRunRequest,
  UpdateTestRunRequest,
  UpdateRunItemRequest,
  ReorderRunItemsRequest,
} from "../types/testRun.types.js";
import {
  emitTestRunCreated,
  emitTestRunUpdated,
  emitTestRunDeleted,
  emitTestRunItemUpdated,
  socketManager,
} from "../../../socket/socketManager.js";
import { TestCase } from "../../../models/testCase.model.js";
import * as discussionService from "../../discussion/services/discussion.service.js";
import {
  IAttachment,
  MessageBodyFormat,
} from "../../discussion/types/discussion.types.js";

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

    const { projectId } = req.params as Record<string, string>;
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

    emitTestRunCreated(projectId, response);

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

    const { projectId } = req.params as Record<string, string>;
    const rawLimit = req.query.limit;
    const rawOffset = req.query.offset;
    const limit = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : undefined;
    const offset = typeof rawOffset === "string" ? Number.parseInt(rawOffset, 10) : undefined;

    const isPaginatedRequest =
      Number.isInteger(limit) &&
      Number.isInteger(offset) &&
      (limit as number) > 0 &&
      (offset as number) >= 0;

    if (isPaginatedRequest) {
      const safeLimit = Math.min(limit as number, 200);
      const safeOffset = offset as number;
      const result = await testRunService.getTestRunsByProjectPaginated(projectId, userId, {
        limit: safeLimit,
        offset: safeOffset,
      });
      const responses = result.items.map(testRunService.formatTestRunListResponse);

      res.status(200).json({
        success: true,
        data: responses,
        meta: {
          total: result.total,
          limit: safeLimit,
          offset: safeOffset,
          hasMore: safeOffset + responses.length < result.total,
        },
      });
      return;
    }

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

    const { id } = req.params as Record<string, string>;
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

    const { id } = req.params as Record<string, string>;
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

    const { id } = req.params as Record<string, string>;
    const deleted = await testRunService.deleteTestRun(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Test run not found or you don't have permission",
      });
      return;
    }

    // Emit deleted event
    emitTestRunDeleted(deleted.projectId, id);

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

    const { id, itemId } = req.params as Record<string, string>;
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

    // Emit item update event
    const updatedItem = testRun.items.find(i => (i as any)._id.toString() === itemId);
    if (updatedItem) {
      emitTestRunItemUpdated(
        testRun.projectId.toString(),
        (testRun as any)._id.toString(),
        itemId,
        updatedItem.status,
        response.resultsSummary,
        updatedItem.actualResult
      );
    }
    
    // Also emit full update for list views that might need stats update
    emitTestRunUpdated(testRun.projectId.toString(), response);

    // Log run result to test case discussion chat
    if (updatedItem) {
      try {
        const caseId = updatedItem.caseId.toString();
        const sourceCase = await TestCase.findById(caseId).select("suiteId projectId").lean();

        if (sourceCase) {
          const projectId = testRun.projectId.toString();
          const runId = (testRun as any)._id.toString();
          const statusLabel = updatedItem.status;

          const messageBody = buildRunDiscussionBody(
            testRun.title,
            runId,
            itemId,
            caseId,
            statusLabel,
            updatedItem.actualResult
          );
          const message = await discussionService.createSystemMessage(
            caseId,
            projectId,
            userId,
            messageBody,
            mapRunAttachmentsToDiscussionAttachments(updatedItem.attachments),
            {
              bodyFormat: MessageBodyFormat.Html,
              relatedRunId: runId,
              relatedRunItemId: itemId,
            }
          );
          socketManager.emitToProject(projectId, "discussion:created", {
            message,
            testCaseId: caseId,
            projectId,
          });
        }
      } catch (err) {
        console.error("Error logging test run result to discussion:", err);
      }
    }

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in updateRunItem:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

function buildRunDiscussionBody(
  runTitle: string,
  runId: string,
  itemId: string,
  caseId: string,
  statusLabel: string,
  actualResult: string | undefined
): string {
  const runUrl = `/test-manager/runs?runId=${encodeURIComponent(runId)}&itemId=${encodeURIComponent(itemId)}&caseId=${encodeURIComponent(caseId)}`;
  const summary = `<p><strong>${escapeHtml(statusLabel)} in test run:</strong> <a href="${runUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(runTitle)}</a></p>`;
  return actualResult?.trim()
    ? `${summary}${actualResult}`
    : `${summary}<p>No execution comments were provided.</p>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mapRunAttachmentsToDiscussionAttachments(
  attachments: string[] | undefined
): IAttachment[] {
  if (!attachments?.length) {
    return [];
  }

  return attachments.map((url, index) => ({
    url,
    filename: extractFilenameFromUrl(url, index),
    fileSize: 0,
    contentType: inferContentTypeFromUrl(url),
  }));
}

function extractFilenameFromUrl(url: string, index: number): string {
  const pathname = url.split("?")[0] ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const fallbackExtension = inferFileExtensionFromUrl(url);
  return segments[segments.length - 1] || `attachment-${index + 1}.${fallbackExtension}`;
}

function inferFileExtensionFromUrl(url: string): string {
  const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return match?.[1]?.toLowerCase() ?? "png";
}

function inferContentTypeFromUrl(url: string): string {
  const extension = inferFileExtensionFromUrl(url);
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "png":
    default:
      return "image/png";
  }
}

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

    const { id } = req.params as Record<string, string>;
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
    
    // Emit updated event (for reordering)
    emitTestRunUpdated(testRun.projectId.toString(), response);
    
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in reorderRunItems:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/projects/:projectId/runs/tags
 * Get all unique tags for a project
 */
export const getTagsByProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { projectId } = req.params as Record<string, string>;
    const tags = await testRunService.getTagsByProject(projectId, userId);

    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    console.error("Error in getTagsByProject:", error);
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

    const { id } = req.params as Record<string, string>;
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
    
    // Emit created event
    emitTestRunCreated(testRun.projectId.toString(), response);
    
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

    const { id } = req.params as Record<string, string>;

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
    
    // Emit updated event
    emitTestRunUpdated(testRun.projectId.toString(), response);
    
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in completeTestRun:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
