import express, { Router } from "express";
import { getExample } from "../controllers/example.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router();

// Protected route - requires authentication
router.get("/example", verifyToken, getExample);

export default router;
