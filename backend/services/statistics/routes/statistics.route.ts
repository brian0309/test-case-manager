import express, { Router } from "express";
import { getDashboardStats } from "../controllers/statistics.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router();

router.use(verifyToken);

router.get("/", getDashboardStats);

export default router;
