import { Request, Response } from "express";
import { User } from "../../models/user.model.js";
import { encryptApiKey, decryptApiKey, generateTestCaseDetails } from "./gemini.service.js";

export const saveGeminiKey = async (req: Request, res: Response) => {
    try {
        const { apiKey } = req.body;
        const userId = req.userId;

        if (!apiKey) {
            return res.status(400).json({ success: false, message: "API Key is required" });
        }

        const encryptedKey = encryptApiKey(apiKey);

        await User.findByIdAndUpdate(userId, { geminiApiKey: encryptedKey });

        res.status(200).json({ success: true, message: "API Key saved successfully" });
    } catch (error: any) {
        console.error("Error saving Gemini key:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const generateTestCases = async (req: Request, res: Response) => {
    try {
        const { context, type = 'new_case', selectedFields, existingTestCases = [], imageUrls = [] } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+geminiApiKey');
        if (!user || !user.geminiApiKey) {
            return res.status(403).json({ success: false, message: "Gemini API Key not found. Please configure it in Settings." });
        }

        const decryptedKey = decryptApiKey(user.geminiApiKey);

        const result = await generateTestCaseDetails(decryptedKey, context, type, selectedFields, existingTestCases, imageUrls);

        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error("Error generating test cases:", error);
        res.status(500).json({ success: false, message: error.message || "Generation failed" });
    }
};
