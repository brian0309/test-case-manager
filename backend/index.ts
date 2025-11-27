import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from "./db/connectDB.js";

// Get the directory name in ES module
const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import authRoutes from "./routes/auth.route.js";
import exampleRoutes from "./services/example/routes/example.route.js";
import projectRoutes from "./services/testCase/routes/project.route.js";
import suiteRoutes, { projectSuiteRoutes } from "./services/testCase/routes/testSuite.route.js";
import caseRoutes, { suiteCaseRoutes, projectCaseRoutes } from "./services/testCase/routes/testCase.route.js";
import uploadRoutes from "./services/upload/routes/upload.route.js";
import { getCorsOptions } from "./config/dynamicCors.js";

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || "5000", 10);

// Use a dynamic CORS configuration that reflects incoming origins against
// an allow-list (supports multiple Vercel preview URLs). See
// backend/config/dynamicCors.ts for details.
app.use(cors(getCorsOptions()));

app.use(express.json()); // allows us to parse incoming requests:req.body
app.use(cookieParser()); // allows us to parse incoming cookies

app.use("/api/auth", authRoutes);
app.use("/api/example", exampleRoutes);
app.use("/api/upload", uploadRoutes);

// Test Case Management Routes
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/suites", projectSuiteRoutes);
app.use("/api/projects/:projectId/cases", projectCaseRoutes);
app.use("/api/suites", suiteRoutes);
app.use("/api/suites/:suiteId/cases", suiteCaseRoutes);
app.use("/api/cases", caseRoutes);

// Only serve frontend static files in production for traditional deployment
// (not when deployed separately to Vercel)
if (process.env.NODE_ENV === "production" && process.env.VERCEL !== '1') {
	// Serve static files from the actual frontend build directory (works from dist/backend)
	app.use(express.static(path.join(__dirname, "../../frontend/dist")));

	app.get("*", (req: Request, res: Response) => {
		res.sendFile(path.resolve(__dirname, "../../frontend/dist/index.html"));
	});
}

// For Vercel serverless deployment, export the app
export default app;

// Only listen when not in serverless environment (Vercel)
if (process.env.VERCEL !== '1') {
	app.listen(PORT, () => {
		connectDB();
		console.log("Server is running on port: ", PORT);
	});
} else {
	// Connect to DB in serverless environment
	connectDB();
}
