import express, { Router } from "express";
import { generatePresignedUrl } from "../controllers/upload.controller.js";
import { verifyToken } from "../../../middleware/verifyToken.js";

const router: Router = express.Router();

// All routes are protected - require authentication
router.use(verifyToken);

/**
 * POST /api/upload/presigned-url
 * Generate a presigned URL for uploading an image
 */
router.post("/presigned-url", generatePresignedUrl);

export default router;
