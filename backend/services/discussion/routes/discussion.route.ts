import { Router } from "express";
import * as discussionController from "../controllers/discussion.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router = Router();

// All routes are protected
router.use(verifyToken);

// Get all discussions for a test case
router.get("/:testCaseId/discussions", discussionController.getDiscussions);

// Create a new message in a test case discussion
router.post("/:testCaseId/discussions", discussionController.createMessage);

// Delete a message from a test case discussion
router.delete("/:testCaseId/discussions/:messageId", discussionController.deleteMessage);

export default router;
