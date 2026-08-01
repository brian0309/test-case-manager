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
    generateAnthropicTestCaseDetails,
    generateAnthropicTestCaseDetailsStream,
    getAnthropicFallbackModelValues,
    listAnthropicModels,
    simplifyAnthropicError,
} from '../services/anthropic.service.js';

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

    const fallbackVisible = getAnthropicFallbackModelValues().filter((modelId) => availableSet.has(modelId));
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

export const saveAnthropicSettings = async (req: Request, res: Response) => {
    try {
        const { apiKey, model, visibleModels, customModels, preferredProvider } = req.body;
        const userId = req.userId;

        const updateData: any = {};

        if (apiKey) {
            updateData.anthropicApiKey = encryptApiKey(apiKey);
        }

        if (model) {
            updateData.anthropicModel = model;
        }

        if (customModels !== undefined) {
            updateData.anthropicCustomModels = sanitizeModelIds(customModels);
        }

        if (visibleModels !== undefined) {
            updateData.anthropicVisibleModels = sanitizeModelIds(visibleModels);
        }

        if (preferredProvider !== undefined) {
            if (!isPreferredProvider(preferredProvider)) {
                return res.status(400).json({ success: false, message: 'Invalid preferred provider' });
            }

            updateData.preferredAiProvider = preferredProvider;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'At least one Anthropic setting must be provided' });
        }

        await User.findByIdAndUpdate(userId, updateData);

        return res.status(200).json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving Anthropic settings:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getAnthropicSettings = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const forceRefresh = req.query.refresh === '1';
        const user = await User.findById(userId).select('+anthropicApiKey anthropicModel anthropicVisibleModels anthropicCustomModels preferredAiProvider');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hasApiKey = typeof user.anthropicApiKey === 'string' && user.anthropicApiKey.length > 0;

        let decryptedApiKey: string | undefined;
        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.anthropicApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt Anthropic API key for model listing:', error);
            }
        }

        const providerModels = await listAnthropicModels(decryptedApiKey, forceRefresh);
        const availableModels = mergeAvailableWithCustomModels(providerModels, user.anthropicCustomModels);
        const visibleModels = resolveVisibleModels(user.anthropicVisibleModels, availableModels, user.anthropicCustomModels);

        return res.status(200).json({
            success: true,
            data: {
                hasApiKey,
                model: user.anthropicModel || 'claude-sonnet-4',
                availableModels,
                visibleModels,
                customModels: user.anthropicCustomModels || [],
                preferredProvider: user.preferredAiProvider || 'gemini',
            },
        });
    } catch (error) {
        console.error('Error fetching Anthropic settings:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getAnthropicModels = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const forceRefresh = req.query.refresh === '1';
        const user = await User.findById(userId).select('+anthropicApiKey anthropicVisibleModels anthropicCustomModels');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hasApiKey = typeof user.anthropicApiKey === 'string' && user.anthropicApiKey.length > 0;

        let decryptedApiKey: string | undefined;
        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.anthropicApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt Anthropic API key for model listing:', error);
            }
        }

        const providerModels = await listAnthropicModels(decryptedApiKey, forceRefresh);
        const availableModels = mergeAvailableWithCustomModels(providerModels, user.anthropicCustomModels);
        const visibleModels = resolveVisibleModels(user.anthropicVisibleModels, availableModels, user.anthropicCustomModels);

        return res.status(200).json({
            success: true,
            data: {
                hasApiKey,
                availableModels,
                visibleModels,
                customModels: user.anthropicCustomModels || [],
            },
        });
    } catch (error) {
        console.error('Error fetching Anthropic models:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const generateAnthropicTestCases = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [], model } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+anthropicApiKey anthropicModel');
        if (!user || !user.anthropicApiKey) {
            return res.status(403).json({
                success: false,
                message: 'Anthropic API key not found. Please configure it in Settings.',
            });
        }

        const decryptedKey = decryptApiKey(user.anthropicApiKey);
        const selectedModel = resolveRequestedModel(model, user.anthropicModel || 'claude-sonnet-4');

        const result = await generateAnthropicTestCaseDetails(
            decryptedKey,
            context,
            selectedFields,
            existingTestCases,
            imageUrls,
            selectedModel
        );

        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('Error generating Anthropic test cases:', error);
        const simplifiedMessage = simplifyAnthropicError(error);
        return res.status(500).json({ success: false, message: simplifiedMessage });
    }
};

export const generateAnthropicTestCasesStream = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [], model } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+anthropicApiKey anthropicModel');
        if (!user || !user.anthropicApiKey) {
            return res.status(403).json({
                success: false,
                message: 'Anthropic API key not found. Please configure it in Settings.',
            });
        }

        const decryptedKey = decryptApiKey(user.anthropicApiKey);
        const selectedModel = resolveRequestedModel(model, user.anthropicModel || 'claude-sonnet-4');

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        req.on('close', () => {
            console.log('Client disconnected from Anthropic stream');
        });

        await generateAnthropicTestCaseDetailsStream(
            decryptedKey,
            context,
            selectedFields,
            existingTestCases,
            imageUrls,
            selectedModel,
            res
        );
    } catch (error: any) {
        console.error('Error in Anthropic streaming test case generation:', error);
        const simplifiedMessage = simplifyAnthropicError(error);

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: simplifiedMessage });
        }

        res.write(`data: ${JSON.stringify({ type: 'error', message: simplifiedMessage })}\n\n`);
        res.end();
        return;
    }
};
