import express, { Router } from "express";
import {
  createTestSuite,
  getTestSuites,
  getTestSuite,
  updateTestSuite,
  deleteTestSuite,
} from "../controllers/testSuite.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router();

// All routes are protected
router.use(verifyToken);

// Suite CRUD (routes without projectId prefix are for direct suite access)
router.get("/:id", getTestSuite);
router.put("/:id", updateTestSuite);
router.delete("/:id", deleteTestSuite);

export default router;

// Export additional routes that need to be mounted under /api/projects/:projectId
export const projectSuiteRoutes = express.Router({ mergeParams: true });
projectSuiteRoutes.use(verifyToken);
projectSuiteRoutes.post("/", createTestSuite);
projectSuiteRoutes.get("/", getTestSuites);
