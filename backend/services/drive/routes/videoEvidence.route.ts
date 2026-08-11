import express, { Router } from "express";
import { verifyToken } from "../../../middleware/verifyToken.js";
import { apiRateLimiter } from "../../../middleware/rateLimiter.js";
import {
  createUploadSessionHandler,
  deleteVideoEvidenceHandler,
  listVideoEvidenceHandler,
  registerVideoEvidenceHandler,
  resolveUploadedFileHandler,
  streamVideoEvidenceHandler,
} from "../controllers/videoEvidence.controller.js";

const router: Router = express.Router({ mergeParams: true });

// All evidence routes require authentication
router.use(verifyToken);

/**
 * POST /api/projects/:projectId/video-evidence/upload-session
 * Backend-authorized resumable upload session; bytes go browser -> Drive directly.
 * Stricter rate limit since each request starts a large upload.
 */
router.post(
  "/upload-session",
  apiRateLimiter,
  createUploadSessionHandler
);

/**
 * POST /api/projects/:projectId/video-evidence
 * Registers metadata after the direct upload completed.
 */
router.post("/", registerVideoEvidenceHandler);

/**
 * POST /api/projects/:projectId/video-evidence/resolve-upload
 * Locates a just-uploaded Drive file when the browser lost Google's final
 * response. Rate-limited since each call hits the Drive API.
 */
router.post("/resolve-upload", apiRateLimiter, resolveUploadedFileHandler);

/**
 * GET /api/projects/:projectId/video-evidence
 */
router.get("/", listVideoEvidenceHandler);

/**
 * DELETE /api/projects/:projectId/video-evidence/:evidenceId
 */
router.delete("/:evidenceId", deleteVideoEvidenceHandler);

/**
 * GET /api/projects/:projectId/video-evidence/:evidenceId/stream
 * Authenticated proxy stream of the Drive video (Range-enabled).
 */
router.get("/:evidenceId/stream", streamVideoEvidenceHandler);

export default router;