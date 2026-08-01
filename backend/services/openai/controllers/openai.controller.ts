import { Request, Response } from 'express';
import { User } from '../../../models/user.model.js';
import {
    decryptApiKey,
    encryptApiKey,
    isPreferredProvider,
    sanitizeModelIds,
    toCustomModelOption,
    ProviderModelOption,
} from '../../ai-shared/index.js';
import {
    generateOpenAITestCaseDetails,
    generateOpenAITestCaseDetailsStream,
    getOpenAIFallbackModelValues,
    listOpenAIModels,
    simplifyOpenAIError,
} from '../services/openai.service.js';

const mergeAvailableWithCustomModels = (
    availableModels: ProviderModelOption[],
    customModels: string[] | undefined
): ProviderModelOption[] => {
    const merged = new Map<string, ProviderModelOption>();

    availableModels.forEach((model) => {
        merged.set(model.value, model);
    });

    (customModels || []).forEach((modelId) => {
        if (!merged.has(modelId)) {
            merged.set(modelId, toCustomModelOption(modelId));
        }
    });

    return Array.from(merged.values());
};

const resolveVisibleModels = (
    savedVisibleModels: string[] | undefined,
    availableModels: ProviderModelOption[],
    customModels: string[] | undefined
): string[] => {
    const availableSet = new Set(availableModels.map((model) => model.value));
    const persisted = (savedVisibleModels || []).filter((modelId) => availableSet.has(modelId));

    if (persisted.length > 0) {
        return persisted;
    }

    const customVisible = (customModels || []).filter((modelId) => availableSet.has(modelId));
    if (customVisible.length > 0) {
        return customVisible;
    }

    const fallbackVisible = getOpenAIFallbackModelValues().filter((modelId) => availableSet.has(modelId));
    if (fallbackVisible.length > 0) {
        return fallbackVisible;
    }

    return availableModels.slice(0, 8).map((model) => model.value);
};

const resolveRequestedModel = (value: unknown, fallback: string): string => {
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
    }

    return fallback;
};

export const saveOpenAISettings = async (req: Request, res: Response) => {
    try {
        const { apiKey, model, visibleModels, customModels, preferredProvider } = req.body;
        const userId = req.userId;

        const updateData: any = {};

        if (apiKey) {
            updateData.openaiApiKey = encryptApiKey(apiKey);
        }

        if (model) {
            updateData.openaiModel = model;
        }

        if (customModels !== undefined) {
            updateData.openaiCustomModels = sanitizeModelIds(customModels);
        }

        if (visibleModels !== undefined) {
            updateData.openaiVisibleModels = sanitizeModelIds(visibleModels);
        }

        if (preferredProvider !== undefined) {
            if (!isPreferredProvider(preferredProvider)) {
                return res.status(400).json({ success: false, message: 'Invalid preferred provider' });
            }

            updateData.preferredAiProvider = preferredProvider;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'At least one OpenAI setting must be provided' });
        }

        await User.findByIdAndUpdate(userId, updateData);

        return res.status(200).json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving OpenAI settings:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getOpenAISettings = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const forceRefresh = req.query.refresh === '1';
        const user = await User.findById(userId).select('+openaiApiKey openaiModel openaiVisibleModels openaiCustomModels preferredAiProvider');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hasApiKey = typeof user.openaiApiKey === 'string' && user.openaiApiKey.length > 0;

        let decryptedApiKey: string | undefined;
        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.openaiApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt OpenAI API key for model listing:', error);
            }
        }

        const providerModels = await listOpenAIModels(decryptedApiKey, forceRefresh);
        const availableModels = mergeAvailableWithCustomModels(providerModels, user.openaiCustomModels);
        const visibleModels = resolveVisibleModels(user.openaiVisibleModels, availableModels, user.openaiCustomModels);

        return res.status(200).json({
            success: true,
            data: {
                hasApiKey,
                model: user.openaiModel || 'gpt-5',
                availableModels,
                visibleModels,
                customModels: user.openaiCustomModels || [],
                preferredProvider: user.preferredAiProvider || 'gemini',
            },
        });
    } catch (error) {
        console.error('Error fetching OpenAI settings:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getOpenAIModels = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const forceRefresh = req.query.refresh === '1';
        const user = await User.findById(userId).select('+openaiApiKey openaiVisibleModels openaiCustomModels');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hasApiKey = typeof user.openaiApiKey === 'string' && user.openaiApiKey.length > 0;

        let decryptedApiKey: string | undefined;
        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.openaiApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt OpenAI API key for model listing:', error);
            }
        }

        const providerModels = await listOpenAIModels(decryptedApiKey, forceRefresh);
        const availableModels = mergeAvailableWithCustomModels(providerModels, user.openaiCustomModels);
        const visibleModels = resolveVisibleModels(user.openaiVisibleModels, availableModels, user.openaiCustomModels);

        return res.status(200).json({
            success: true,
            data: {
                hasApiKey,
                availableModels,
                visibleModels,
                customModels: user.openaiCustomModels || [],
            },
        });
    } catch (error) {
        console.error('Error fetching OpenAI models:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const generateOpenAITestCases = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [], model } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+openaiApiKey openaiModel');
        if (!user || !user.openaiApiKey) {
            return res.status(403).json({
                success: false,
                message: 'OpenAI API key not found. Please configure it in Settings.',
            });
        }

        const decryptedKey = decryptApiKey(user.openaiApiKey);
        const selectedModel = resolveRequestedModel(model, user.openaiModel || 'gpt-5');

        const result = await generateOpenAITestCaseDetails(
            decryptedKey,
            context,
            selectedFields,
            existingTestCases,
            imageUrls,
            selectedModel
        );

        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('Error generating OpenAI test cases:', error);
        const simplifiedMessage = simplifyOpenAIError(error);
        return res.status(500).json({ success: false, message: simplifiedMessage });
    }
};

export const generateOpenAITestCasesStream = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [], model } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+openaiApiKey openaiModel');
        if (!user || !user.openaiApiKey) {
            return res.status(403).json({
                success: false,
                message: 'OpenAI API key not found. Please configure it in Settings.',
            });
        }

        const decryptedKey = decryptApiKey(user.openaiApiKey);
        const selectedModel = resolveRequestedModel(model, user.openaiModel || 'gpt-5');

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        req.on('close', () => {
            console.log('Client disconnected from OpenAI stream');
        });

        await generateOpenAITestCaseDetailsStream(
            decryptedKey,
            context,
            selectedFields,
            existingTestCases,
            imageUrls,
            selectedModel,
            res
        );
    } catch (error: any) {
        console.error('Error in OpenAI streaming test case generation:', error);
        const simplifiedMessage = simplifyOpenAIError(error);

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: simplifiedMessage });
        }

        res.write(`data: ${JSON.stringify({ type: 'error', message: simplifiedMessage })}\n\n`);
        res.end();
        return;
    }
};
