import express, { Router } from "express";
import {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketsByRun,
} from "../controllers/ticket.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";
import { apiRateLimiter } from "../../../middleware/rateLimiter.js";

const router: Router = express.Router({ mergeParams: true });

// All routes are protected and rate-limited
router.use(verifyToken);
router.use(apiRateLimiter);

/**
 * GET    /api/projects/:projectId/tickets       - List tickets
 * POST   /api/projects/:projectId/tickets       - Create a ticket
 */
router.get("/", getTickets);
router.post("/", createTicket);

/**
 * GET    /api/projects/:projectId/tickets/by-run/:runId  - Tickets by run
 */
router.get("/by-run/:runId", getTicketsByRun);

/**
 * GET    /api/projects/:projectId/tickets/:id   - Get a ticket
 * PUT    /api/projects/:projectId/tickets/:id   - Update a ticket
 * DELETE /api/projects/:projectId/tickets/:id   - Delete a ticket
 */
router.get("/:id", getTicket);
router.put("/:id", updateTicket);
router.delete("/:id", deleteTicket);

export default router;
