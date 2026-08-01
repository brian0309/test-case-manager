import { Request, Response } from "express";
import * as ticketService from "../services/ticket.service.js";
import * as projectService from "../../testCase/services/project.service.js";
import { TicketPriority, TicketSeverity } from "../types/ticket.types.js";
import * as discussionService from "../../discussion/services/discussion.service.js";
import { socketManager, emitTicketCreated, emitTicketUpdated, emitTicketDeleted } from "../../../socket/socketManager.js";
import { User } from "../../../models/user.model.js";

/**
 * GET  /api/projects/:projectId/tickets
 * Get all tickets for a project
 */
export const getTickets = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.userId;

    if (!projectId) {
      res.status(400).json({ success: false, message: "Project ID is required" });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

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
      const result = await ticketService.getTicketsPaginated(projectId, {
        limit: safeLimit,
        offset: safeOffset,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          limit: safeLimit,
          offset: safeOffset,
          hasMore: safeOffset + result.items.length < result.total,
        },
      });
      return;
    }

    const tickets = await ticketService.getTickets(projectId);
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tickets" });
  }
};

/**
 * GET  /api/projects/:projectId/tickets/:id
 * Get a single ticket by ID
 */
export const getTicket = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!id) {
      res.status(400).json({ success: false, message: "Ticket ID is required" });
      return;
    }

    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const ticket = await ticketService.getTicket(id);
    if (!ticket) {
      res.status(404).json({ success: false, message: "Ticket not found" });
      return;
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({ success: false, message: "Failed to fetch ticket" });
  }
};

/**
 * GET  /api/tickets/:id
 * Get a single ticket by ID (without projectId in path).
 * Derives projectId from the ticket document for access control.
 */
export const getTicketById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!id) {
      res.status(400).json({ success: false, message: "Ticket ID is required" });
      return;
    }

    const ticket = await ticketService.getTicket(id);
    if (!ticket) {
      res.status(404).json({ success: false, message: "Ticket not found" });
      return;
    }

    const hasAccess = await projectService.hasProjectAccess(ticket.projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error fetching ticket by ID:", error);
    res.status(500).json({ success: false, message: "Failed to fetch ticket" });
  }
};

/**
 * POST  /api/projects/:projectId/tickets
 * Create a new ticket
 */
export const createTicket = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!projectId) {
      res.status(400).json({ success: false, message: "Project ID is required" });
      return;
    }

    const { title, description, priority, severity, assignedToId, relatedRunId, relatedRunItemId, tags, attachments } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, message: "Title is required" });
      return;
    }

    if (!priority || !Object.values(TicketPriority).includes(priority)) {
      res.status(400).json({ success: false, message: "A valid priority is required" });
      return;
    }

    if (!severity || !Object.values(TicketSeverity).includes(severity)) {
      res.status(400).json({ success: false, message: "A valid severity is required" });
      return;
    }

    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const ticket = await ticketService.createTicket(projectId, userId, {
      title: title.trim(),
      description: description?.trim(),
      priority,
      severity,
      assignedToId,
      relatedRunId,
      relatedRunItemId,
      tags,
      attachments,
    });

    emitTicketCreated(projectId, ticket);

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ success: false, message: "Failed to create ticket" });
  }
};

/**
 * PUT  /api/projects/:projectId/tickets/:id
 * Update a ticket
 */
export const updateTicket = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!id) {
      res.status(400).json({ success: false, message: "Ticket ID is required" });
      return;
    }

    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    // Verify ticket exists
    const existing = await ticketService.getTicket(id);
    if (!existing) {
      res.status(404).json({ success: false, message: "Ticket not found" });
      return;
    }

    const ticket = await ticketService.updateTicket(id, req.body);
    if (!ticket) {
      res.status(404).json({ success: false, message: "Ticket not found" });
      return;
    }

    emitTicketUpdated(projectId, ticket);

    // If status changed, post a system message to the ticket discussion panel
    if (req.body.status && req.body.status !== existing.status) {
      try {
        const userDoc = await User.findById(userId).select("name").lean();
        const userName = userDoc?.name ?? "Unknown";
        const message = await discussionService.createSystemMessageForTicket(
          id,
          projectId,
          userId,
          `Status changed to ${req.body.status} by ${userName}`
        );
        socketManager.emitToProject(projectId, "discussion:created", {
          message,
          ticketId: id,
          projectId,
        });
      } catch (err) {
        // Non-blocking: log but don't fail the update
        console.error("Error posting status change system message:", err);
      }
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ success: false, message: "Failed to update ticket" });
  }
};

/**
 * DELETE  /api/projects/:projectId/tickets/:id
 * Delete a ticket
 */
export const deleteTicket = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!id) {
      res.status(400).json({ success: false, message: "Ticket ID is required" });
      return;
    }

    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const deleted = await ticketService.deleteTicket(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Ticket not found" });
      return;
    }

    emitTicketDeleted(projectId, id);

    res.status(200).json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ success: false, message: "Failed to delete ticket" });
  }
};

/**
 * GET  /api/projects/:projectId/tickets/by-run/:runId
 * Get tickets linked to a specific test run
 */
export const getTicketsByRun = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const runId = req.params.runId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!runId) {
      res.status(400).json({ success: false, message: "Run ID is required" });
      return;
    }

    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

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
      const result = await ticketService.getTicketsByRunPaginated(runId, {
        limit: safeLimit,
        offset: safeOffset,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          limit: safeLimit,
          offset: safeOffset,
          hasMore: safeOffset + result.items.length < result.total,
        },
      });
      return;
    }

    const tickets = await ticketService.getTicketsByRun(runId);
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    console.error("Error fetching tickets by run:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tickets" });
  }
};
