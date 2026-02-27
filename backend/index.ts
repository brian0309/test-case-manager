import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { setServers } from "node:dns/promises";
import { connectDB } from "./db/connectDB.js";
import { socketManager } from "./socket/socketManager.js";

// Get the directory name in ES module
const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DNS_OVERRIDE_SERVERS = (process.env.DNS_OVERRIDE_SERVERS || "1.1.1.1,8.8.8.8")
	.split(",")
	.map((server) => server.trim())
	.filter(Boolean);

const applyDevDnsOverride = async (): Promise<void> => {
	if (process.env.NODE_ENV !== "development" || DNS_OVERRIDE_SERVERS.length === 0) {
		return;
	}

	await setServers(DNS_OVERRIDE_SERVERS);
};

import authRoutes from "./routes/auth.route.js";
import exampleRoutes from "./services/example/routes/example.route.js";
import projectRoutes from "./services/testCase/routes/project.route.js";
import suiteRoutes, { projectSuiteRoutes } from "./services/testCase/routes/testSuite.route.js";
import caseRoutes, { suiteCaseRoutes, projectCaseRoutes } from "./services/testCase/routes/testCase.route.js";
import runRoutes, { projectRunRoutes, projectRunGroupRoutes, runGroupRoutes } from "./services/testRun/routes/testRun.route.js";
import uploadRoutes from "./services/upload/routes/upload.route.js";
import statisticsRoutes from "./services/statistics/routes/statistics.route.js";
import geminiRoutes from "./services/geminigen/gemini.route.js";
import reportingRoutes from "./services/reporting/routes/reporting.route.js";
import discussionRoutes from "./services/discussion/routes/discussion.route.js";
import { getCorsOptions } from "./config/dynamicCors.js";

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || "5000", 10);

// Use a dynamic CORS configuration that reflects incoming origins against
// an allow-list (supports multiple Vercel preview URLs). See
// backend/config/dynamicCors.ts for details.
app.use(cors(getCorsOptions()));

app.use(express.json({ limit: '10mb' })); // allows us to parse incoming requests:req.body
app.use(cookieParser()); // allows us to parse incoming cookies

app.use("/api/auth", authRoutes);
app.use("/api/example", exampleRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/gemini", geminiRoutes);
app.use("/api/reports", reportingRoutes);

// Test Case Management Routes
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/suites", projectSuiteRoutes);
app.use("/api/projects/:projectId/cases", projectCaseRoutes);
app.use("/api/projects/:projectId/runs", projectRunRoutes);
app.use("/api/projects/:projectId/run-groups", projectRunGroupRoutes);
app.use("/api/suites", suiteRoutes);
app.use("/api/suites/:suiteId/cases", suiteCaseRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/cases/:testCaseId/discussions", discussionRoutes);
app.use("/api/runs", runRoutes);
app.use("/api/run-groups", runGroupRoutes);

// Only serve frontend static files in production for traditional deployment
// (not when deployed separately to Vercel)
if (process.env.NODE_ENV === "production" && process.env.VERCEL !== '1') {
	// Serve static files from the actual frontend build directory (works from dist/backend)
	app.use(express.static(path.join(__dirname, "../../frontend/dist")));

	app.get("*", (req: Request, res: Response) => {
		res.sendFile(path.resolve(__dirname, "../../frontend/dist/index.html"));
	});
}

// Get allowed origins for Socket.io CORS
const getAllowedOrigins = (): string[] => {
	const envList = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "";
	return envList.split(",").map((s) => s.trim()).filter(Boolean);
};

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io (only when not in serverless environment)
if (process.env.VERCEL !== '1') {
	const allowedOrigins = getAllowedOrigins();
	socketManager.initialize(httpServer, allowedOrigins);
}

// For Vercel serverless deployment, export the app
export default app;

const startServer = async (): Promise<void> => {
	await applyDevDnsOverride();
	await connectDB();

	// Only listen when not in serverless environment (Vercel)
	if (process.env.VERCEL !== '1') {
		httpServer.listen(PORT, () => {
			console.log("Server is running on port: ", PORT);
		});
	}
};

startServer().catch((error: Error) => {
	console.error("Failed to start server:", error.message);
	process.exit(1);
});
