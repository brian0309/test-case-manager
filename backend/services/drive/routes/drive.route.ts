import express, { Router } from "express";
import { verifyToken } from "../../../middleware/verifyToken.js";
import {
  disconnectDriveHandler,
  getDriveAuthUrlHandler,
  getDriveConnectionHandler,
  driveAuthCallback,
} from "../controllers/driveAuth.controller.js";

const router: Router = express.Router();

/**
 * GET /api/drive/auth/url
 * Authenticated: begins the Drive OAuth flow.
 */
router.get("/auth/url", verifyToken, getDriveAuthUrlHandler);

/**
 * GET /api/drive/auth/callback
 * Public: Google redirects here after user consent.
 */
router.get("/auth/callback", driveAuthCallback);

/**
 * GET /api/drive/connection
 * Authenticated: reports whether the user connected Google Drive.
 */
router.get("/connection", verifyToken, getDriveConnectionHandler);

/**
 * DELETE /api/drive/connection
 * Authenticated: revokes the Google authorization and clears stored tokens.
 */
router.delete("/connection", verifyToken, disconnectDriveHandler);

export default router;