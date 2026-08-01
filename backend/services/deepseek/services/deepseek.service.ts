import { Response as ExpressResponse } from 'express';
import { ProviderModelOption } from '../../ai-shared/index.js';
import { buildGenerationPrompt, parseGeneratedCases } from '../../ai-shared/index.js';
import { GeneratedTestCase, SelectedFields } from '../../ai-shared/types.js';

const DEEPSEEK_API_BASE = 'https://api.deepseek.com';
const DEEPSEEK_MODELS_TTL_MS = 10 * 60 * 1000;

const DEEPSEEK_FALLBACK_MODELS: ProviderModelOption[] = [
    {
        value: 'deepseek-v4-flash',
        label: 'DeepSeek V4 Flash',
        description: 'Fast and cost-efficient flagship model with 1M token context',
        source: 'fallback',
    },
    {
        value: 'deepseek-v4-pro',
        label: 'DeepSeek V4 Pro',
        description: 'Highest-capability DeepSeek model for complex reasoning tasks',
        source: 'fallback',
    },
];

const DEEPSEEK_KNOWN_MODELS: Record<string, { label: string; description: string }> = {
    'deepseek-v4-flash': {
        label: 'DeepSeek V4 Flash',
        description: 'Fast and cost-efficient flagship model with 1M token context',
    },
    'deepseek-v4-pro': {
        label: 'DeepSeek V4 Pro',
        description: 'Highest-capability DeepSeek model for complex reasoning tasks',
    },
    'deepseek-chat': {
        label: 'DeepSeek Chat (V3)',
        description: 'Legacy general-purpose conversational model',
    },
    'deepseek-reasoner': {
        label: 'DeepSeek Reasoner (R1)',
        description: 'Legacy reasoning-focused model',
    },
};

interface DeepSeekModelCache {
    expiresAt: number;
    models: ProviderModelOption[];
}

let deepSeekModelCache: DeepSeekModelCache | null = null;

const getDeepSeekHeaders = (apiKey: string): Record<string, string> => {
    return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };
};

const parseDeepSeekError = async (response: globalThis.Response): Promise<Error> => {
    let responseMessage = `DeepSeek request failed with status ${response.status}`;

    try {
        const payload = await response.json() as any;
        const errorMessage = payload?.error?.message || payload?.message;
        if (typeof errorMessage === 'string' && errorMessage.trim()) {
            responseMessage = errorMessage;
        }
    } catch {
        // Ignore parse errors for non-JSON payloads
    }

    const error = new Error(responseMessage);
    (error as any).status = response.status;
    return error;
};

export const simplifyDeepSeekError = (error: any): string => {
    const code = error?.status || error?.code;
    const message = error?.message || 'An error occurred';

    if (code === 429 || /rate limit|quota/i.test(message)) {
        return 'DeepSeek rate limit exceeded. Please try again in a few moments.';
    }

    if (code === 401 || code === 403 || /api key|unauthorized|forbidden/i.test(message)) {
        return 'Invalid DeepSeek API key. Please check your DeepSeek settings.';
    }

    if (code === 400) {
        return message.length > 160 ? `${message.slice(0, 157)}...` : message;
    }

    if ((typeof code === 'number' && code >= 500) || /service unavailable|upstream/i.test(message)) {
        return 'DeepSeek service is temporarily unavailable. Please try again later.';
    }

    if (/network|fetch|timeout/i.test(message)) {
        return 'Network error while contacting DeepSeek. Please try again.';
    }

    return message.length > 160 ? `${message.slice(0, 157)}...` : message;
};

export const getDeepSeekFallbackModels = (): ProviderModelOption[] => {
    return [...DEEPSEEK_FALLBACK_MODELS];
};

export const getDeepSeekFallbackModelValues = (): string[] => {
    return DEEPSEEK_FALLBACK_MODELS.map((model) => model.value);
};

const deepSeekModelOptionFromId = (modelId: string): ProviderModelOption => {
    const id = modelId.trim();
    const known = DEEPSEEK_KNOWN_MODELS[id];
    if (known) {
        return {
            value: id,
            label: known.label,
            description: known.description,
            source: 'api',
        };
    }

    return {
        value: id,
        label: id,
        description: 'DeepSeek model',
        source: 'api',
    };
};

export const listDeepSeekModels = async (apiKey?: string, forceRefresh: boolean = false): Promise<ProviderModelOption[]> => {
    const now = Date.now();
    if (!forceRefresh && deepSeekModelCache && deepSeekModelCache.expiresAt > now) {
        return deepSeekModelCache.models;
    }

    if (!apiKey) {
        return getDeepSeekFallbackModels();
    }

    try {
        const response = await fetch(`${DEEPSEEK_API_BASE}/models`, {
            headers: getDeepSeekHeaders(apiKey),
        });

        if (!response.ok) {
            throw new Error(`DeepSeek model list request failed with status ${response.status}`);
        }

        const payload = await response.json() as any;
        const modelRecords = Array.isArray(payload.data) ? payload.data : [];

        const normalized = modelRecords
            .filter((record: any) => typeof record.id === 'string' && record.id.trim().length > 0)
            .map((record: any) => deepSeekModelOptionFromId(record.id));

        if (normalized.length === 0) {
            return getDeepSeekFallbackModels();
        }

        deepSeekModelCache = {
            expiresAt: now + DEEPSEEK_MODELS_TTL_MS,
            models: normalized,
        };

        return normalized;
    } catch (error) {
        console.error('Failed to fetch DeepSeek model list:', error);
        return getDeepSeekFallbackModels();
    }
};

interface DeepSeekMessage {
    role: 'system' | 'user';
    content: string;
}

const buildMessages = (prompt: string): DeepSeekMessage[] => {
    return [
        {
            role: 'system',
            content: 'You are a QA engineer assistant that always returns strict JSON.',
        },
        {
            role: 'user',
            content: prompt,
        },
    ];
};

export const generateDeepSeekTestCaseDetails = async (
    apiKey: string,
    context: string,
    selectedFields: SelectedFields = { area: true, steps: true, expected: true },
    existingTestCases: string[] = [],
    _imageUrls: string[] = [],
    model: string = 'deepseek-v4-flash'
): Promise<GeneratedTestCase[]> => {
    const prompt = buildGenerationPrompt(context, selectedFields, existingTestCases);
    const messages = buildMessages(prompt);

    const body: Record<string, unknown> = {
        model,
        messages,
        stream: false,
        temperature: 0.2,
    };

    // Legacy deepseek-reasoner does not support JSON output mode; fall back to prompt instructions
    if (!model.includes('reasoner')) {
        body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: getDeepSeekHeaders(apiKey),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw await parseDeepSeekError(response);
    }

    const payload = await response.json() as any;
    const content = payload?.choices?.[0]?.message?.content;

    const normalizedContent = Array.isArray(content)
        ? content.map((part: any) => part?.text || '').join('')
        : typeof content === 'string'
            ? content
            : '';

    return parseGeneratedCases(normalizedContent);
};

export const generateDeepSeekTestCaseDetailsStream = async (
    apiKey: string,
    context: string,
    selectedFields: SelectedFields,
    existingTestCases: string[],
    _imageUrls: string[],
    model: string,
    res: ExpressResponse
): Promise<void> => {
    const prompt = buildGenerationPrompt(context, selectedFields, existingTestCases);
    const messages = buildMessages(prompt);

    const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
        temperature: 0.2,
    };

    if (!model.includes('reasoner')) {
        body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: getDeepSeekHeaders(apiKey),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw await parseDeepSeekError(response);
    }

    if (!response.body) {
        throw new Error('No response body from DeepSeek streaming API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let doneReading = false;

    while (!doneReading) {
        const { done, value } = await reader.read();
        if (done) {
            doneReading = true;
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith(':') || !line.startsWith('data:')) {
                continue;
            }

            const payload = line.slice(5).trim();
            if (!payload) {
                continue;
            }

            if (payload === '[DONE]') {
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                res.end();
                return;
            }

            const chunk = JSON.parse(payload) as any;
            if (chunk?.error?.message) {
                throw new Error(chunk.error.message);
            }

            const text = chunk?.choices?.[0]?.delta?.content;
            if (typeof text === 'string' && text.length > 0) {
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
            }
        }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
};
