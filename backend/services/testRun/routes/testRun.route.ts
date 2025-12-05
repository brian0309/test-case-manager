import express, { Router } from "express";
import {
  createTestRun,
  getTestRunsByProject,
  getTestRun,
  updateTestRun,
  deleteTestRun,
  updateRunItem,
  reorderRunItems,
  cloneTestRun,
  completeTestRun,
} from "../controllers/testRun.controller.js";
import {
  createTestRunGroup,
  getTestRunGroupsByProject,
  getTestRunGroup,
  updateTestRunGroup,
  deleteTestRunGroup,
} from "../controllers/testRunGroup.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router();

// All routes are protected
router.use(verifyToken);

// Test run CRUD
router.get("/:id", getTestRun);
router.put("/:id", updateTestRun);
router.delete("/:id", deleteTestRun);

// Run item operations
router.patch("/:id/items/:itemId", updateRunItem);
router.patch("/:id/reorder", reorderRunItems);

// Run actions
router.post("/:id/clone", cloneTestRun);
router.post("/:id/complete", completeTestRun);

export default router;

// Export routes that need to be mounted under /api/projects/:projectId
export const projectRunRoutes = express.Router({ mergeParams: true });
projectRunRoutes.use(verifyToken);
projectRunRoutes.post("/", createTestRun);
projectRunRoutes.get("/", getTestRunsByProject);

// Test run group routes - mounted under /api/projects/:projectId/run-groups
export const projectRunGroupRoutes = express.Router({ mergeParams: true });
projectRunGroupRoutes.use(verifyToken);
projectRunGroupRoutes.post("/", createTestRunGroup);
projectRunGroupRoutes.get("/", getTestRunGroupsByProject);

// Standalone run group routes - mounted under /api/run-groups
export const runGroupRoutes = express.Router();
runGroupRoutes.use(verifyToken);
runGroupRoutes.get("/:id", getTestRunGroup);
runGroupRoutes.put("/:id", updateTestRunGroup);
runGroupRoutes.delete("/:id", deleteTestRunGroup);

