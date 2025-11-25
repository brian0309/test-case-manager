import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";

import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import {
	sendPasswordResetEmail,
	sendResetSuccessEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
} from "../mailtrap/emails.js";
import { User } from "../models/user.model.js";

// Email validation regex - requires proper domain with TLD
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const validateEmail = (email: string): boolean => {
	return emailRegex.test(email);
};

export const signup = async (req: Request, res: Response): Promise<Response | void> => {
	const { email, password, name } = req.body;

	try {
		if (!email || !password || !name) {
			throw new Error("All fields are required");
		}

		if (!validateEmail(email)) {
			throw new Error("Please enter a valid email address");
		}

		const userAlreadyExists = await User.findOne({ email });
		console.log("userAlreadyExists", userAlreadyExists);

		if (userAlreadyExists) {
			return res.status(400).json({ success: false, message: "User already exists" });
		}

		const hashedPassword = await bcryptjs.hash(password, 10);
		const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

		const user = new User({
			email,
			password: hashedPassword,
			name,
			verificationToken,
			verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
			verificationTokenSentAt: new Date(),
		});

		await user.save();

		// jwt
		generateTokenAndSetCookie(res, user._id);

		await sendVerificationEmail(user.email, verificationToken);

		res.status(201).json({
			success: true,
			message: "User created successfully",
			user: {
				...user.toObject(),
				password: undefined,
			},
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "An error occurred";
		res.status(400).json({ success: false, message: errorMessage });
	}
};

export const verifyEmail = async (req: Request, res: Response): Promise<Response | void> => {
	const { code } = req.body;
	try {
		// Only fetch necessary fields for email verification
		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: Date.now() },
		}).select('_id email name isVerified verificationToken verificationTokenExpiresAt verificationTokenSentAt');

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
		}

		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;
		user.verificationTokenSentAt = undefined;
		await user.save();

		await sendWelcomeEmail(user.email, user.name);

		res.status(200).json({
			success: true,
			message: "Email verified successfully",
			user: {
				...user.toObject(),
				password: undefined,
			},
		});
	} catch (error) {
		console.log("error in verifyEmail ", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};

export const resendVerificationCode = async (req: Request, res: Response): Promise<Response | void> => {
	try {
		const user = await User.findById(req.userId).select('_id email name isVerified verificationToken verificationTokenExpiresAt verificationTokenSentAt');

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		if (user.isVerified) {
			return res.status(400).json({ success: false, message: "Email is already verified" });
		}

		// Check if 5 minutes have passed since the last verification code was sent
		if (user.verificationTokenSentAt) {
			const timeSinceLastSent = Date.now() - new Date(user.verificationTokenSentAt).getTime();
			const fiveMinutesInMs = 5 * 60 * 1000;

			if (timeSinceLastSent < fiveMinutesInMs) {
				const remainingTime = Math.ceil((fiveMinutesInMs - timeSinceLastSent) / 1000 / 60);
				return res.status(400).json({ 
					success: false, 
					message: `Please wait ${remainingTime} minute(s) before requesting a new verification code` 
				});
			}
		}

		// Generate new verification token
		const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
		user.verificationToken = verificationToken;
		user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
		user.verificationTokenSentAt = new Date();

		await user.save();

		// Send verification email
		await sendVerificationEmail(user.email, verificationToken);

		res.status(200).json({
			success: true,
			message: "Verification code sent to your email",
		});
	} catch (error) {
		console.log("Error in resendVerificationCode ", error);
		const errorMessage = error instanceof Error ? error.message : "An error occurred";
		res.status(500).json({ success: false, message: errorMessage });
	}
};

export const login = async (req: Request, res: Response): Promise<Response | void> => {
	const { email, password } = req.body;
	try {
		if (!validateEmail(email)) {
			return res.status(400).json({ success: false, message: "Please enter a valid email address" });
		}
		
		// Fetch full user document - need password for bcrypt comparison and most fields for response
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}
		if (!user.password) {
			return res.status(400).json({ success: false, message: "Please use Google OAuth to login" });
		}
		const isPasswordValid = await bcryptjs.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}

		generateTokenAndSetCookie(res, user._id);

		// Update last login without triggering additional queries
		user.lastLogin = new Date();
		await user.save();

		res.status(200).json({
			success: true,
			message: "Logged in successfully",
			user: {
				...user.toObject(),
				password: undefined,
			},
		});
	} catch (error) {
		console.log("Error in login ", error);
		const errorMessage = error instanceof Error ? error.message : "An error occurred";
		res.status(400).json({ success: false, message: errorMessage });
	}
};

export const logout = async (req: Request, res: Response): Promise<Response> => {
	// Clear the cookie using the same attributes used when setting it.
	const clearOptions: any = {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
	};

	if (process.env.COOKIE_DOMAIN) {
		clearOptions.domain = process.env.COOKIE_DOMAIN;
	}

	res.clearCookie("token", clearOptions);
	return res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const forgotPassword = async (req: Request, res: Response): Promise<Response | void> => {
	const { email } = req.body;
	try {
		if (!validateEmail(email)) {
			return res.status(400).json({ success: false, message: "Please enter a valid email address" });
		}
		
		// Only select necessary fields for password reset
		const user = await User.findOne({ email }).select('_id email resetPasswordToken resetPasswordExpiresAt');

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(20).toString("hex");
		const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

		user.resetPasswordToken = resetToken;
		user.resetPasswordExpiresAt = resetTokenExpiresAt;

		await user.save();

		// send email
		await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

		res.status(200).json({ success: true, message: "Password reset link sent to your email" });
	} catch (error) {
		console.log("Error in forgotPassword ", error);
		const errorMessage = error instanceof Error ? error.message : "An error occurred";
		res.status(400).json({ success: false, message: errorMessage });
	}
};

export const resetPassword = async (req: Request, res: Response): Promise<Response | void> => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		// Only fetch necessary fields for password reset
		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpiresAt: { $gt: Date.now() },
		}).select('_id email password resetPasswordToken resetPasswordExpiresAt');

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
		}

		// update password
		const hashedPassword = await bcryptjs.hash(password, 10);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		await user.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		const errorMessage = error instanceof Error ? error.message : "An error occurred";
		res.status(400).json({ success: false, message: errorMessage });
	}
};

export const checkAuth = async (req: Request, res: Response): Promise<Response | void> => {
	try {
		const user = await User.findById(req.userId).select("-password");
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		res.status(200).json({ success: true, user });
	} catch (error) {
		console.log("Error in checkAuth ", error);
		const errorMessage = error instanceof Error ? error.message : "An error occurred";
		res.status(400).json({ success: false, message: errorMessage });
	}
};

export const changePassword = async (req: Request, res: Response): Promise<Response | void> => {
	const { currentPassword, newPassword } = req.body;
	try {
		// Only fetch necessary fields for password change
		const user = await User.findById(req.userId).select('_id password');
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}
		if (!user.password) {
			return res.status(400).json({ success: false, message: "Cannot change password for OAuth users" });
		}

		const isPasswordValid = await bcryptjs.compare(currentPassword, user.password);
		if (!isPasswordValid) {
			return res.status(400).json({ success: false, message: "Current password is incorrect" });
		}

		const hashedPassword = await bcryptjs.hash(newPassword, 10);
		user.password = hashedPassword;
		await user.save();

		res.status(200).json({ success: true, message: "Password changed successfully" });
	} catch (error) {
		console.log("Error in changePassword ", error);
		const errorMessage = error instanceof Error ? error.message : "An error occurred";
		res.status(400).json({ success: false, message: errorMessage });
	}
};
