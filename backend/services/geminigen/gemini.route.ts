import express from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { saveGeminiKey, generateTestCases } from "./gemini.controller.js";

const router = express.Router();

router.post("/key", verifyToken, saveGeminiKey);
router.post("/generate", verifyToken, generateTestCases);

export default router;
