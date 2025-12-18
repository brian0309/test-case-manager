import express, { Router } from "express";
import {
  createTestCase,
  getTestCasesBySuite,
  getTestCasesByProject,
  getTestCase,
  updateTestCase,
  deleteTestCase,
  bulkUpdateStatus,
  deleteTestCasesBulk,
  reorderTestCases,
  cloneTestCase,
} from "../controllers/testCase.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router();

// All routes are protected
router.use(verifyToken);

// Bulk operations (must be before /:id routes)
router.patch("/bulk-status", bulkUpdateStatus);
router.delete("/bulk", deleteTestCasesBulk);

// Test case CRUD
router.get("/:id", getTestCase);
router.put("/:id", updateTestCase);
router.delete("/:id", deleteTestCase);
router.post("/:id/clone", cloneTestCase);

export default router;

// Export routes that need to be mounted under /api/suites/:suiteId
export const suiteCaseRoutes = express.Router({ mergeParams: true });
suiteCaseRoutes.use(verifyToken);
suiteCaseRoutes.post("/", createTestCase);
suiteCaseRoutes.get("/", getTestCasesBySuite);
suiteCaseRoutes.patch("/reorder", reorderTestCases);

// Export routes that need to be mounted under /api/projects/:projectId
export const projectCaseRoutes = express.Router({ mergeParams: true });
projectCaseRoutes.use(verifyToken);
projectCaseRoutes.get("/", getTestCasesByProject);
