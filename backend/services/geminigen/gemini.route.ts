import express from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { saveGeminiKey, generateTestCases, generateTestCasesStream, getGeminiSettings } from "./gemini.controller.js";

const router = express.Router();

router.post("/key", verifyToken, saveGeminiKey);
router.get("/settings", verifyToken, getGeminiSettings);
router.post("/generate", verifyToken, generateTestCases);
router.post("/generate-stream", verifyToken, generateTestCasesStream);

export default router;
