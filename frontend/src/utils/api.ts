/**
 * API Configuration Utility
 * Centralizes API URL logic for consistent usage across the application
 */

/**
 * Get the API URL based on the current environment
 * - Development: uses VITE_DEV_API_URL if set, otherwise defaults to /api (same-origin)
 * - Production with VITE_API_URL set: uses VITE_API_URL
 * - Production without VITE_API_URL: /api (same-origin)
 * 
 * Environment variables:
 * - VITE_DEV_API_URL: API URL for development (e.g., http://localhost:5000/api)
 * - VITE_API_URL: API URL for production (e.g., https://your-backend.vercel.app/api)
 */
export const getApiUrl = (): string => {
	if (import.meta.env.MODE === "development") {
		return import.meta.env.VITE_DEV_API_URL || "/api";
	}
	
	// In production, prefer VITE_API_URL if set, otherwise use relative path
	return import.meta.env.VITE_API_URL || "/api";
};

export const API_URL = getApiUrl();
