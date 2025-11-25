import { CorsOptions } from "cors";

/**
 * Build CORS options that safely reflect the incoming Origin when it is
 * present in an allow-list. This supports multiple preview deployments on
 * Vercel while keeping CORS restrictive for unknown origins.
 *
 * Environment variables used:
 * - ALLOWED_ORIGINS: comma-separated list of allowed origins
 *                    (e.g. https://your-app.vercel.app,https://preview-123.vercel.app)
 *                    If not set, falls back to CLIENT_URL for backward compatibility
 * - CLIENT_URL: primary frontend URL (e.g. https://your-app.vercel.app)
 *               Used as fallback if ALLOWED_ORIGINS is not set
 */
export const getCorsOptions = (): CorsOptions => {
  const envList = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "";
  
  if (!envList) {
    throw new Error(
      "CORS configuration error: Either ALLOWED_ORIGINS or CLIENT_URL environment variable must be set. " +
      "Set ALLOWED_ORIGINS to a comma-separated list of allowed origins (e.g., http://localhost:5173,https://your-app.com)"
    );
  }
  
  const allowedOrigins = envList
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // track origins we've warned about to avoid log spam
  const warnedOrigins = new Set<string>();

  return {
    // origin can be a function to dynamically decide whether to allow the request
    origin: (incomingOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests (e.g., from Postman or same-origin) that don't send an Origin header
      if (!incomingOrigin) return callback(null, true);

      // Allow if the incoming origin is in the allow-list
      if (allowedOrigins.includes(incomingOrigin)) return callback(null, true);

      // Optionally allow subdomain matches if COOKIE_DOMAIN is provided
      if (process.env.COOKIE_DOMAIN) {
        try {
          const host = new URL(incomingOrigin).hostname;
          // If COOKIE_DOMAIN is .example.com and host is preview-123.vercel.app, this won't match
          // but if you use subdomains under the same parent (e.g., app.example.com), it can.
          if (host.endsWith(process.env.COOKIE_DOMAIN.replace(/^[*.]+/, ""))) return callback(null, true);
        } catch (e) {
          // ignore URL parse errors
        }
      }

      // Instead of throwing an Error into the CORS callback (which becomes an uncaught
      // error in some setups), log an actionable message once and deny the origin
      // gracefully by calling callback(null, false).
      if (!warnedOrigins.has(incomingOrigin)) {
        warnedOrigins.add(incomingOrigin);
        console.warn(
          `[CORS] Denied origin: ${incomingOrigin}. To allow it, set ALLOWED_ORIGINS (or CLIENT_URL) to include this origin.`
        );
        console.info(`[CORS] Current allowed origins: ${allowedOrigins.join(", ")}`);
        console.info(
          `[CORS] Example (dev): export ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"`
        );
      }

      return callback(null, false);
    },
    credentials: true,
  };
};
