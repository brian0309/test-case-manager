import express, { Router } from "express";
import { getDashboardStats, getProjectDashboardStats } from "../controllers/statistics.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router();

router.use(verifyToken);

router.get("/", getDashboardStats);
router.get("/project/:projectId", getProjectDashboardStats);

export default router;
