import { Request, Response } from "express";
import {
  exchangeDriveCode,
  getDriveAuthUrl,
} from "../services/driveOAuth.service.js";
import {
  disconnectDrive,
  getDriveConnection,
  saveDriveConnection,
} from "../services/driveConnection.service.js";

const STATE_COOKIE = "drive_oauth_state";

/**
 * GET /api/drive/auth/url
 * Returns a Google OAuth authorization URL for the Drive flow and stores
 * the CSRF state (plus the connecting user id) in an httpOnly cookie.
 */
export const getDriveAuthUrlHandler = (req: Request, res: Response): void => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { url, state } = getDriveAuthUrl();

    const cookieValue = Buffer.from(
      JSON.stringify({ state, userId: req.userId })
    ).toString("base64");

    res.cookie(STATE_COOKIE, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: "/",
    });

    res.status(200).json({ success: true, url });
  } catch (error) {
    console.error("Error generating Google Drive URL:", error);
    res.status(500).json({ success: false, message: "Error generating Google Drive URL" });
  }
};

/**
 * GET /api/drive/auth/callback
 * Public. Exchanges the code, encrypts and stores the refresh token, then
 * redirects back to the frontend.
 */
export const driveAuthCallback = async (req: Request, res: Response): Promise<void> => {
  const redirectToError = (message: string): void => {
    const target = `${process.env.CLIENT_URL}/drive-oauth-redirect?error=${encodeURIComponent(message)}`;
    res.redirect(target);
  };

  try {
    const { code, state } = req.query;
    const storedRaw = req.cookies[STATE_COOKIE];

    if (!state || typeof state !== "string" || !storedRaw) {
      redirectToError("invalid_state");
      return;
    }

    let stored: { state: string; userId: string };
    try {
      stored = JSON.parse(Buffer.from(storedRaw, "base64").toString("utf8"));
    } catch {
      redirectToError("invalid_state");
      return;
    }

    if (state !== stored.state || !stored.userId) {
      redirectToError("invalid_state");
      return;
    }

    res.clearCookie(STATE_COOKIE);

    if (!code || typeof code !== "string") {
      redirectToError("no_code");
      return;
    }

    const tokens = await exchangeDriveCode(code);

    await saveDriveConnection(stored.userId, {
      refreshToken: tokens.refreshToken,
      googleId: tokens.googleId,
      googleEmail: tokens.email,
    });

    res.redirect(`${process.env.CLIENT_URL}/drive-oauth-redirect?success=true`);
  } catch (error) {
    console.error("Error in Google Drive OAuth callback:", error);
    redirectToError("google_drive_auth_failed");
  }
};

/**
 * GET /api/drive/connection
 * Returns whether the current user has connected Google Drive.
 */
export const getDriveConnectionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const connection = await getDriveConnection(req.userId);
    res.status(200).json({ success: true, data: connection });
  } catch (error) {
    console.error("Error reading Google Drive connection:", error);
    res.status(500).json({ success: false, message: "Failed to read connection status" });
  }
};

/**
 * DELETE /api/drive/connection
 * Revokes the Google authorization and removes the stored connection.
 * Existing evidence files in Drive are left untouched.
 */
export const disconnectDriveHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    await disconnectDrive(req.userId);
    res.status(200).json({ success: true, message: "Google Drive disconnected" });
  } catch (error) {
    console.error("Error disconnecting Google Drive:", error);
    res.status(500).json({ success: false, message: "Failed to disconnect Google Drive" });
  }
};