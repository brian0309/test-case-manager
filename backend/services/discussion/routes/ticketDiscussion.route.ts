import express, { Router } from "express";
import {
  getTicketDiscussionMessages,
  createTicketDiscussionMessage,
  deleteTicketDiscussionMessage,
  updateTicketDiscussionMessageFixState,
} from "../controllers/discussion.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router({ mergeParams: true });

// All routes are protected
router.use(verifyToken);

/**
 * GET  /api/tickets/:ticketId/discussions  - Get messages for a ticket
 * POST /api/tickets/:ticketId/discussions  - Create a new message
 */
router.get("/", getTicketDiscussionMessages);
router.post("/", createTicketDiscussionMessage);
router.delete("/:messageId", deleteTicketDiscussionMessage);
router.patch("/:messageId/fix-state", updateTicketDiscussionMessageFixState);

export default router;
