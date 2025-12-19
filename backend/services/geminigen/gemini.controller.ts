import { Request, Response } from "express";
import { User } from "../../models/user.model.js";
import { encryptApiKey, decryptApiKey, generateTestCaseDetails, generateTestCaseDetailsStream } from "./gemini.service.js";

export const saveGeminiKey = async (req: Request, res: Response) => {
    try {
        const { apiKey, model } = req.body;
        const userId = req.userId;

        const updateData: any = {};

        // Only update API key if provided
        if (apiKey) {
            const encryptedKey = encryptApiKey(apiKey);
            updateData.geminiApiKey = encryptedKey;
        }

        // Always update model if provided
        if (model) {
            updateData.geminiModel = model;
        }

        // If neither is provided, return error
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "API Key or Model must be provided" });
        }

        await User.findByIdAndUpdate(userId, updateData);

        res.status(200).json({ success: true, message: "Settings saved successfully" });
    } catch (error: any) {
        console.error("Error saving Gemini settings:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getGeminiSettings = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        // geminiApiKey is select:false, so we must explicitly include it to compute hasApiKey.
        // We still do NOT return the key to the client.
        const user = await User.findById(userId).select('+geminiApiKey geminiModel');
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ 
            success: true, 
            data: {
                hasApiKey: typeof user.geminiApiKey === 'string' && user.geminiApiKey.length > 0,
                model: user.geminiModel || 'gemini-2.5-flash'
            }
        });
    } catch (error: any) {
        console.error("Error fetching Gemini settings:", error);
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
        const model = user.geminiModel || 'gemini-2.5-flash';

        const result = await generateTestCaseDetails(decryptedKey, context, type, selectedFields, existingTestCases, imageUrls, model);

        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error("Error generating test cases:", error);
        res.status(500).json({ success: false, message: error.message || "Generation failed" });
    }
};

/**
 * Streaming endpoint for test case generation
 * Uses Server-Sent Events to stream AI output in real-time
 */
export const generateTestCasesStream = async (req: Request, res: Response) => {
    try {
        const { context, type = 'new_case', selectedFields, existingTestCases = [], imageUrls = [] } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+geminiApiKey');
        if (!user || !user.geminiApiKey) {
            return res.status(403).json({ success: false, message: "Gemini API Key not found. Please configure it in Settings." });
        }

        const decryptedKey = decryptApiKey(user.geminiApiKey);
        const model = user.geminiModel || 'gemini-2.5-flash';

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        res.flushHeaders();

        // Handle client disconnect
        req.on('close', () => {
            console.log('Client disconnected from stream');
        });

        // Stream the response
        await generateTestCaseDetailsStream(
            decryptedKey,
            context,
            type,
            selectedFields,
            existingTestCases,
            imageUrls,
            model,
            res
        );

    } catch (error: any) {
        console.error("Error in streaming test case generation:", error);
        // If headers haven't been sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message || "Generation failed" });
        } else {
            // Headers already sent, send error as SSE event
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Generation failed' })}\n\n`);
            res.end();
        }
    }
};
