import express, { Router } from "express";
import {
  getDiscussionMessages,
  createDiscussionMessage,
  deleteDiscussionMessage,
  updateDiscussionMessageFixState,
} from "../controllers/discussion.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router({ mergeParams: true });

// All routes are protected
router.use(verifyToken);

/**
 * GET  /api/cases/:testCaseId/discussions  - Get messages for a test case
 * POST /api/cases/:testCaseId/discussions  - Create a new message
 */
router.get("/", getDiscussionMessages);
router.post("/", createDiscussionMessage);
router.delete("/:messageId", deleteDiscussionMessage);
router.patch("/:messageId/fix-state", updateDiscussionMessageFixState);

export default router;
