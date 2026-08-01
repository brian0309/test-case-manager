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
    generateDeepSeekTestCaseDetails,
    generateDeepSeekTestCaseDetailsStream,
    getDeepSeekFallbackModelValues,
    listDeepSeekModels,
    simplifyDeepSeekError,
} from '../services/deepseek.service.js';

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

    const fallbackVisible = getDeepSeekFallbackModelValues().filter((modelId) => availableSet.has(modelId));
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

export const saveDeepSeekSettings = async (req: Request, res: Response) => {
    try {
        const { apiKey, model, visibleModels, customModels, preferredProvider } = req.body;
        const userId = req.userId;

        const updateData: any = {};

        if (apiKey) {
            updateData.deepseekApiKey = encryptApiKey(apiKey);
        }

        if (model) {
            updateData.deepseekModel = model;
        }

        if (customModels !== undefined) {
            updateData.deepseekCustomModels = sanitizeModelIds(customModels);
        }

        if (visibleModels !== undefined) {
            updateData.deepseekVisibleModels = sanitizeModelIds(visibleModels);
        }

        if (preferredProvider !== undefined) {
            if (!isPreferredProvider(preferredProvider)) {
                return res.status(400).json({ success: false, message: 'Invalid preferred provider' });
            }

            updateData.preferredAiProvider = preferredProvider;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'At least one DeepSeek setting must be provided' });
        }

        await User.findByIdAndUpdate(userId, updateData);

        return res.status(200).json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving DeepSeek settings:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getDeepSeekSettings = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const forceRefresh = req.query.refresh === '1';
        const user = await User.findById(userId).select('+deepseekApiKey deepseekModel deepseekVisibleModels deepseekCustomModels preferredAiProvider');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hasApiKey = typeof user.deepseekApiKey === 'string' && user.deepseekApiKey.length > 0;

        let decryptedApiKey: string | undefined;
        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.deepseekApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt DeepSeek API key for model listing:', error);
            }
        }

        const providerModels = await listDeepSeekModels(decryptedApiKey, forceRefresh);
        const availableModels = mergeAvailableWithCustomModels(providerModels, user.deepseekCustomModels);
        const visibleModels = resolveVisibleModels(user.deepseekVisibleModels, availableModels, user.deepseekCustomModels);

        return res.status(200).json({
            success: true,
            data: {
                hasApiKey,
                model: user.deepseekModel || 'deepseek-v4-flash',
                availableModels,
                visibleModels,
                customModels: user.deepseekCustomModels || [],
                preferredProvider: user.preferredAiProvider || 'gemini',
            },
        });
    } catch (error) {
        console.error('Error fetching DeepSeek settings:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getDeepSeekModels = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const forceRefresh = req.query.refresh === '1';
        const user = await User.findById(userId).select('+deepseekApiKey deepseekVisibleModels deepseekCustomModels');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const hasApiKey = typeof user.deepseekApiKey === 'string' && user.deepseekApiKey.length > 0;

        let decryptedApiKey: string | undefined;
        if (hasApiKey) {
            try {
                decryptedApiKey = decryptApiKey(user.deepseekApiKey as string);
            } catch (error) {
                console.error('Failed to decrypt DeepSeek API key for model listing:', error);
            }
        }

        const providerModels = await listDeepSeekModels(decryptedApiKey, forceRefresh);
        const availableModels = mergeAvailableWithCustomModels(providerModels, user.deepseekCustomModels);
        const visibleModels = resolveVisibleModels(user.deepseekVisibleModels, availableModels, user.deepseekCustomModels);

        return res.status(200).json({
            success: true,
            data: {
                hasApiKey,
                availableModels,
                visibleModels,
                customModels: user.deepseekCustomModels || [],
            },
        });
    } catch (error) {
        console.error('Error fetching DeepSeek models:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const generateDeepSeekTestCases = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [], model } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+deepseekApiKey deepseekModel');
        if (!user || !user.deepseekApiKey) {
            return res.status(403).json({
                success: false,
                message: 'DeepSeek API key not found. Please configure it in Settings.',
            });
        }

        const decryptedKey = decryptApiKey(user.deepseekApiKey);
        const selectedModel = resolveRequestedModel(model, user.deepseekModel || 'deepseek-v4-flash');

        const result = await generateDeepSeekTestCaseDetails(
            decryptedKey,
            context,
            selectedFields,
            existingTestCases,
            imageUrls,
            selectedModel
        );

        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('Error generating DeepSeek test cases:', error);
        const simplifiedMessage = simplifyDeepSeekError(error);
        return res.status(500).json({ success: false, message: simplifiedMessage });
    }
};

export const generateDeepSeekTestCasesStream = async (req: Request, res: Response) => {
    try {
        const { context, selectedFields, existingTestCases = [], imageUrls = [], model } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId).select('+deepseekApiKey deepseekModel');
        if (!user || !user.deepseekApiKey) {
            return res.status(403).json({
                success: false,
                message: 'DeepSeek API key not found. Please configure it in Settings.',
            });
        }

        const decryptedKey = decryptApiKey(user.deepseekApiKey);
        const selectedModel = resolveRequestedModel(model, user.deepseekModel || 'deepseek-v4-flash');

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        req.on('close', () => {
            console.log('Client disconnected from DeepSeek stream');
        });

        await generateDeepSeekTestCaseDetailsStream(
            decryptedKey,
            context,
            selectedFields,
            existingTestCases,
            imageUrls,
            selectedModel,
            res
        );
    } catch (error: any) {
        console.error('Error in DeepSeek streaming test case generation:', error);
        const simplifiedMessage = simplifyDeepSeekError(error);

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: simplifiedMessage });
        }

        res.write(`data: ${JSON.stringify({ type: 'error', message: simplifiedMessage })}\n\n`);
        res.end();
        return;
    }
};
