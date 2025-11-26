import express, { Router } from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} from "../controllers/project.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router();

// All routes are protected
router.use(verifyToken);

// Project CRUD
router.post("/", createProject);
router.get("/", getProjects);
router.get("/:id", getProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

// Member management
router.post("/:id/members", addMember);
router.delete("/:id/members/:memberId", removeMember);

export default router;
