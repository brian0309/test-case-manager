import { Request, Response } from "express";
import { User } from "../../models/user.model.js";
import { isPreferredProvider, AIProvider } from "../ai-shared/index.js";
import {
    encryptApiKey,
    decryptApiKey,
    generateTestCaseDetails,
    generateTestCaseDetailsStream,
    simplifyGeminiError,
    listGeminiModels,
    getGeminiFallbackModelValues,
    ProviderModelOption,
} from "./gemini.service.js";

const isPreferredProviderValue = (value: unknown): value is AIProvider => isPreferredProvider(value);

const sanitizeModelIds = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    const unique = new Set<string>();
    value.forEach((item) => {
        if (typeof item === 'string') {
            const trimmed = item.trim();
            if (trimmed.length > 0) {
                unique.add(trimmed);
            }
        }
    });

    return Array.from(unique);
};

const resolveVisibleModels = (savedVisibleModels: string[] | undefined, availableModels: ProviderModelOption[]): string[] => {
    const availableSet = new Set(availableModels.map((model) => model.value));
    const persisted = (savedVisibleModels || []).filter((modelId) => availableSet.has(modelId));

    if (persisted.length > 0) {
        return persisted;
    }

    const fallbackVisible = getGeminiFallbackModelValues().filter((modelId) => availableSet.has(modelId));
    if (fallbackVisible.length > 0) {
        return fallbackVisible;
    }

    return availableModels.slice(0, 8).map((model) => model.value);
};

export const saveGeminiKey = async (req: Request, res: Response) => {
    try {
        const { apiKey, model, visibleModels, preferredProvider } = req.body;
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

        if (visibleModels !== undefined) {
            updateData.geminiVisibleModels = sanitizeModelIds(visibleModels);
        }

        if (preferredProvider !== undefined) {
            if (!isPreferredProviderValue(preferredProvider)) {
                return res.status(400).json({ success: false, message: "Invalid preferred provider" });
            }

            updateData.preferredAiProvider = preferredProvider;
        }

        // If neither is provided, return error
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "At least one Gemini setting must be provided" });
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
        const forceRefresh = req.query.refresh === '1';

        // geminiApiKey is select:false, so we must explicitly include it to compute hasApiKey.
        // We still do NOT return the key to the client.
        const user = await User.findById(userId).select('+geminiApiKey geminiModel geminiVisibleModels preferredAiProvider');
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const hasApiKey = typeof user.geminiApiKey === 'string' && user.geminiApiKey.length > 0;

        let decryptedApiKey: string | undefined;
        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.geminiApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt Gemini API key for model listing:', error);
            }
        }

        const availableModels = await listGeminiModels(decryptedApiKey, forceRefresh);
        const visibleModels = resolveVisibleModels(user.geminiVisibleModels, availableModels);

        res.status(200).json({ 
            success: true, 
            data: {
                hasApiKey,
                model: user.geminiModel || 'gemini-2.5-flash',
                availableModels,
                visibleModels,
                preferredProvider: user.preferredAiProvider || 'gemini',
            }
        });
    } catch (error: any) {
        console.error("Error fetching Gemini settings:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getGeminiModels = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const forceRefresh = req.query.refresh === '1';
        const user = await User.findById(userId).select('+geminiApiKey geminiVisibleModels');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const hasApiKey = typeof user.geminiApiKey === 'string' && user.geminiApiKey.length > 0;
        let decryptedApiKey: string | undefined;

        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.geminiApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt Gemini API key for model listing:', error);
            }
        }

        const availableModels = await listGeminiModels(decryptedApiKey, forceRefresh);
        const visibleModels = resolveVisibleModels(user.geminiVisibleModels, availableModels);

        return res.status(200).json({
            success: true,
            data: {
                hasApiKey,
                availableModels,
                visibleModels,
            },
        });
    } catch (error: any) {
        console.error("Error fetching Gemini models:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const generateTestCases = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [] } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+geminiApiKey');
        if (!user || !user.geminiApiKey) {
            return res.status(403).json({ success: false, message: "Gemini API Key not found. Please configure it in Settings." });
        }

        const decryptedKey = decryptApiKey(user.geminiApiKey);
        const model = user.geminiModel || 'gemini-2.5-flash';

        const result = await generateTestCaseDetails(decryptedKey, context, selectedFields, existingTestCases, imageUrls, model);

        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error("Error generating test cases:", error);
        const simplifiedMessage = simplifyGeminiError(error);
        res.status(500).json({ success: false, message: simplifiedMessage });
    }
};

/**
 * Streaming endpoint for test case generation
 * Uses Server-Sent Events to stream AI output in real-time
 */
export const generateTestCasesStream = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [], model } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+geminiApiKey');
        if (!user || !user.geminiApiKey) {
            return res.status(403).json({ success: false, message: "Gemini API Key not found. Please configure it in Settings." });
        }

        const decryptedKey = decryptApiKey(user.geminiApiKey);
        // Use model from request, fallback to user's saved preference, then default
        const selectedModel = model || user.geminiModel || 'gemini-2.5-flash';

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
            selectedFields,
            existingTestCases,
            imageUrls,
            selectedModel,
            res
        );

    } catch (error: any) {
        console.error("Error in streaming test case generation:", error);
        const simplifiedMessage = simplifyGeminiError(error);
        // If headers haven't been sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: simplifiedMessage });
        } else {
            // Headers already sent, send error as SSE event
            res.write(`data: ${JSON.stringify({ type: 'error', message: simplifiedMessage })}\n\n`);
            res.end();
        }
    }
};
