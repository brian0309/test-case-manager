import jwt from "jsonwebtoken";
import { Response } from "express";

export const generateTokenAndSetCookie = (res: Response, userId: string): string => {
	const token = jwt.sign({ userId }, process.env.JWT_SECRET as string, {
		expiresIn: "7d",
	});

	// Cookie options
	// - httpOnly: prevent JS access
	// - secure: must be true for SameSite='none' in modern browsers (only in production)
	// - sameSite: 'none' is required for cross-site cookies (e.g., frontend and backend on different Vercel deployments)
	// Optionally you can set COOKIE_DOMAIN in env to share cookie across subdomains of the same parent domain
	const cookieOptions: any = {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		// Use 'none' in production to allow cross-site cookie usage (preview/prod deployments)
		sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
		maxAge: 7 * 24 * 60 * 60 * 1000,
	};

	if (process.env.COOKIE_DOMAIN) {
		cookieOptions.domain = process.env.COOKIE_DOMAIN;
	}

	res.cookie("token", token, cookieOptions);

	return token;
};
