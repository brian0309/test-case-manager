import { rateLimit } from "express-rate-limit";

/**
 * General API rate limiter applied to data-mutating routes.
 * Allows up to 100 requests per minute per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
