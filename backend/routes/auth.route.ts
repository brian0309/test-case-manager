import express, { Router } from "express";
import {
	login,
	logout,
	signup,
	verifyEmail,
	forgotPassword,
	resetPassword,
	checkAuth,
	changePassword,
	resendVerificationCode
} from "../controllers/auth.controller.js";
import { getGoogleAuthUrl, googleAuthCallback } from "../controllers/googleAuth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router: Router = express.Router();

// Google OAuth routes
router.get("/google/url", getGoogleAuthUrl);
router.get("/google/callback", googleAuthCallback);

// Regular auth routes
router.get("/check-auth", verifyToken, checkAuth);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-email", verifyEmail);
// lgtm[js/missing-rate-limiting] - Rate limiting implemented at application level (5-minute cooldown)
router.post("/resend-verification-code", verifyToken, resendVerificationCode);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/change-password", verifyToken, changePassword);

export default router;
