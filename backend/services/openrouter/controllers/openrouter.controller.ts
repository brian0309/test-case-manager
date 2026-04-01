import { Request, Response } from 'express';
import { User } from '../../../models/user.model.js';
import { ProviderModelOption, decryptApiKey, encryptApiKey } from '../../geminigen/gemini.service.js';
import {
    generateOpenRouterTestCaseDetails,
    generateOpenRouterTestCaseDetailsStream,
    getOpenRouterFallbackModelValues,
    listOpenRouterModels,
    simplifyOpenRouterError,
} from '../services/openrouter.service.js';

type PreferredProvider = 'gemini' | 'openrouter';

const isPreferredProvider = (value: unknown): value is PreferredProvider => {
    return value === 'gemini' || value === 'openrouter';
};

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

const toCustomModelOption = (modelId: string): ProviderModelOption => {
    return {
        value: modelId,
        label: `${modelId} (Custom)`,
        source: 'custom',
    };
};

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

    const fallbackVisible = getOpenRouterFallbackModelValues().filter((modelId) => availableSet.has(modelId));
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

export const saveOpenRouterSettings = async (req: Request, res: Response) => {
    try {
        const { apiKey, model, visibleModels, customModels, preferredProvider } = req.body;
        const userId = req.userId;

        const updateData: any = {};

        if (apiKey) {
            updateData.openrouterApiKey = encryptApiKey(apiKey);
        }

        if (model) {
            updateData.openrouterModel = model;
        }

        if (customModels !== undefined) {
            updateData.openrouterCustomModels = sanitizeModelIds(customModels);
        }

        if (visibleModels !== undefined) {
            updateData.openrouterVisibleModels = sanitizeModelIds(visibleModels);
        }

        if (preferredProvider !== undefined) {
            if (!isPreferredProvider(preferredProvider)) {
                return res.status(400).json({ success: false, message: 'Invalid preferred provider' });
            }

            updateData.preferredAiProvider = preferredProvider;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'At least one OpenRouter setting must be provided' });
        }

        await User.findByIdAndUpdate(userId, updateData);

        return res.status(200).json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving OpenRouter settings:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getOpenRouterSettings = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId).select('+openrouterApiKey openrouterModel openrouterVisibleModels openrouterCustomModels preferredAiProvider');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hasApiKey = typeof user.openrouterApiKey === 'string' && user.openrouterApiKey.length > 0;

        let decryptedApiKey: string | undefined;
        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.openrouterApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt OpenRouter API key for model listing:', error);
            }
        }

        const providerModels = await listOpenRouterModels(decryptedApiKey);
        const availableModels = mergeAvailableWithCustomModels(providerModels, user.openrouterCustomModels);
        const visibleModels = resolveVisibleModels(user.openrouterVisibleModels, availableModels, user.openrouterCustomModels);

        return res.status(200).json({
            success: true,
            data: {
                hasApiKey,
                model: user.openrouterModel || 'openai/gpt-4o-mini',
                availableModels,
                visibleModels,
                customModels: user.openrouterCustomModels || [],
                preferredProvider: user.preferredAiProvider || 'gemini',
            },
        });
    } catch (error) {
        console.error('Error fetching OpenRouter settings:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getOpenRouterModels = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId).select('+openrouterApiKey openrouterVisibleModels openrouterCustomModels');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hasApiKey = typeof user.openrouterApiKey === 'string' && user.openrouterApiKey.length > 0;

        let decryptedApiKey: string | undefined;
        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.openrouterApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt OpenRouter API key for model listing:', error);
            }
        }

        const providerModels = await listOpenRouterModels(decryptedApiKey);
        const availableModels = mergeAvailableWithCustomModels(providerModels, user.openrouterCustomModels);
        const visibleModels = resolveVisibleModels(user.openrouterVisibleModels, availableModels, user.openrouterCustomModels);

        return res.status(200).json({
            success: true,
            data: {
                hasApiKey,
                availableModels,
                visibleModels,
                customModels: user.openrouterCustomModels || [],
            },
        });
    } catch (error) {
        console.error('Error fetching OpenRouter models:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const generateOpenRouterTestCases = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [], model } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+openrouterApiKey openrouterModel');
        if (!user || !user.openrouterApiKey) {
            return res.status(403).json({
                success: false,
                message: 'OpenRouter API key not found. Please configure it in Settings.',
            });
        }

        const decryptedKey = decryptApiKey(user.openrouterApiKey);
        const selectedModel = resolveRequestedModel(model, user.openrouterModel || 'openai/gpt-4o-mini');

        const result = await generateOpenRouterTestCaseDetails(
            decryptedKey,
            context,
            selectedFields,
            existingTestCases,
            imageUrls,
            selectedModel
        );

        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('Error generating OpenRouter test cases:', error);
        const simplifiedMessage = simplifyOpenRouterError(error);
        return res.status(500).json({ success: false, message: simplifiedMessage });
    }
};

export const generateOpenRouterTestCasesStream = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [], model } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+openrouterApiKey openrouterModel');
        if (!user || !user.openrouterApiKey) {
            return res.status(403).json({
                success: false,
                message: 'OpenRouter API key not found. Please configure it in Settings.',
            });
        }

        const decryptedKey = decryptApiKey(user.openrouterApiKey);
        const selectedModel = resolveRequestedModel(model, user.openrouterModel || 'openai/gpt-4o-mini');

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        req.on('close', () => {
            console.log('Client disconnected from OpenRouter stream');
        });

        await generateOpenRouterTestCaseDetailsStream(
            decryptedKey,
            context,
            selectedFields,
            existingTestCases,
            imageUrls,
            selectedModel,
            res
        );
    } catch (error: any) {
        console.error('Error in OpenRouter streaming test case generation:', error);
        const simplifiedMessage = simplifyOpenRouterError(error);

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: simplifiedMessage });
        }

        res.write(`data: ${JSON.stringify({ type: 'error', message: simplifiedMessage })}\n\n`);
        res.end();
        return;
    }
};
