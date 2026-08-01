import { Response as ExpressResponse } from 'express';
import { ProviderModelOption } from '../../ai-shared/index.js';
import { buildGenerationPrompt, parseGeneratedCases } from '../../ai-shared/index.js';
import { GeneratedTestCase, SelectedFields } from '../../ai-shared/types.js';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_MODELS_TTL_MS = 10 * 60 * 1000;
const ANTHROPIC_MAX_MODELS = 100;
const ANTHROPIC_MAX_TOKENS = 8192;

const ANTHROPIC_FALLBACK_MODELS: ProviderModelOption[] = [
    {
        value: 'claude-opus-4',
        label: 'Claude Opus 4',
        description: 'Most powerful Claude model for complex reasoning and coding',
        source: 'fallback',
    },
    {
        value: 'claude-sonnet-4',
        label: 'Claude Sonnet 4',
        description: 'Balanced quality, speed, and cost for generation tasks',
        source: 'fallback',
    },
    {
        value: 'claude-haiku-4',
        label: 'Claude Haiku 4',
        description: 'Fastest and most cost-effective Claude model',
        source: 'fallback',
    },
];

interface AnthropicModelCache {
    expiresAt: number;
    models: ProviderModelOption[];
}

let anthropicModelCache: AnthropicModelCache | null = null;

const getAnthropicHeaders = (apiKey: string): Record<string, string> => {
    return {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
    };
};

const sortAnthropicModels = (models: ProviderModelOption[]): ProviderModelOption[] => {
    const starterOrder = new Map<string, number>();
    ANTHROPIC_FALLBACK_MODELS.forEach((model, index) => {
        starterOrder.set(model.value, index);
    });

    return [...models].sort((a, b) => {
        const aStarter = starterOrder.has(a.value);
        const bStarter = starterOrder.has(b.value);

        if (aStarter && bStarter) {
            return (starterOrder.get(a.value) || 0) - (starterOrder.get(b.value) || 0);
        }

        if (aStarter) {
            return -1;
        }

        if (bStarter) {
            return 1;
        }

        return a.label.localeCompare(b.label);
    });
};

type AnthropicContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'url'; url: string } };

const buildAnthropicContent = (prompt: string, imageUrls: string[] = []): AnthropicContentBlock[] => {
    const content: AnthropicContentBlock[] = [{ type: 'text', text: prompt }];

    imageUrls.forEach((imageUrl) => {
        if (typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
            content.push({
                type: 'image',
                source: { type: 'url', url: imageUrl.trim() },
            });
        }
    });

    return content;
};

const parseAnthropicError = async (response: globalThis.Response): Promise<Error> => {
    let responseMessage = `Anthropic request failed with status ${response.status}`;

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

export const simplifyAnthropicError = (error: any): string => {
    const code = error?.status || error?.code;
    const message = error?.message || 'An error occurred';

    if (code === 429 || /rate limit|quota/i.test(message)) {
        return 'Anthropic rate limit exceeded. Please try again in a few moments.';
    }

    if (code === 401 || code === 403 || /api key|unauthorized|forbidden/i.test(message)) {
        return 'Invalid Anthropic API key. Please check your Anthropic settings.';
    }

    if (code === 400) {
        return message.length > 160 ? `${message.slice(0, 157)}...` : message;
    }

    if ((typeof code === 'number' && code >= 500) || /service unavailable|upstream/i.test(message)) {
        return 'Anthropic service is temporarily unavailable. Please try again later.';
    }

    if (/network|fetch|timeout/i.test(message)) {
        return 'Network error while contacting Anthropic. Please try again.';
    }

    return message.length > 160 ? `${message.slice(0, 157)}...` : message;
};

export const getAnthropicFallbackModels = (): ProviderModelOption[] => {
    return [...ANTHROPIC_FALLBACK_MODELS];
};

export const getAnthropicFallbackModelValues = (): string[] => {
    return ANTHROPIC_FALLBACK_MODELS.map((model) => model.value);
};

export const listAnthropicModels = async (apiKey?: string, forceRefresh: boolean = false): Promise<ProviderModelOption[]> => {
    const now = Date.now();
    if (!forceRefresh && anthropicModelCache && anthropicModelCache.expiresAt > now) {
        return anthropicModelCache.models;
    }

    if (!apiKey) {
        return getAnthropicFallbackModels();
    }

    try {
        const response = await fetch(`${ANTHROPIC_API_BASE}/models`, {
            headers: getAnthropicHeaders(apiKey),
        });

        if (!response.ok) {
            throw new Error(`Anthropic model list request failed with status ${response.status}`);
        }

        const payload = await response.json() as any;
        const modelRecords = Array.isArray(payload.data) ? payload.data : [];

        const normalized = modelRecords
            .filter((record: any) => typeof record.id === 'string')
            .map((record: any): ProviderModelOption => ({
                value: record.id,
                label: typeof record.display_name === 'string' && record.display_name.trim().length > 0
                    ? record.display_name
                    : record.id,
                source: 'api',
            }));

        const merged = sortAnthropicModels(normalized).slice(0, ANTHROPIC_MAX_MODELS);

        if (merged.length === 0) {
            return getAnthropicFallbackModels();
        }

        anthropicModelCache = {
            expiresAt: now + ANTHROPIC_MODELS_TTL_MS,
            models: merged,
        };

        return merged;
    } catch (error) {
        console.error('Failed to fetch Anthropic model list:', error);
        return getAnthropicFallbackModels();
    }
};

const extractAnthropicText = (payload: any): string => {
    const content = payload?.content;

    if (Array.isArray(content)) {
        return content
            .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
            .map((part: any) => part.text)
            .join('');
    }

    return '';
};

export const generateAnthropicTestCaseDetails = async (
    apiKey: string,
    context: string,
    selectedFields: SelectedFields = { area: true, steps: true, expected: true },
    existingTestCases: string[] = [],
    imageUrls: string[] = [],
    model: string = 'claude-sonnet-4'
): Promise<GeneratedTestCase[]> => {
    const prompt = buildGenerationPrompt(context, selectedFields, existingTestCases, imageUrls);
    const content = buildAnthropicContent(prompt, imageUrls);

    const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
        method: 'POST',
        headers: getAnthropicHeaders(apiKey),
        body: JSON.stringify({
            model,
            max_tokens: ANTHROPIC_MAX_TOKENS,
            messages: [{ role: 'user', content }],
        }),
    });

    if (!response.ok) {
        throw await parseAnthropicError(response);
    }

    const payload = await response.json() as any;
    return parseGeneratedCases(extractAnthropicText(payload));
};

export const generateAnthropicTestCaseDetailsStream = async (
    apiKey: string,
    context: string,
    selectedFields: SelectedFields,
    existingTestCases: string[],
    imageUrls: string[],
    model: string,
    res: ExpressResponse
): Promise<void> => {
    const prompt = buildGenerationPrompt(context, selectedFields, existingTestCases, imageUrls);
    const content = buildAnthropicContent(prompt, imageUrls);

    const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
        method: 'POST',
        headers: getAnthropicHeaders(apiKey),
        body: JSON.stringify({
            model,
            max_tokens: ANTHROPIC_MAX_TOKENS,
            messages: [{ role: 'user', content }],
            stream: true,
        }),
    });

    if (!response.ok) {
        throw await parseAnthropicError(response);
    }

    if (!response.body) {
        throw new Error('No response body from Anthropic streaming API');
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

            const chunk = JSON.parse(payload) as any;
            const eventType = chunk?.type;

            if (eventType === 'error') {
                throw new Error(chunk?.error?.message || 'Anthropic streaming error');
            }

            if (eventType === 'content_block_delta' && chunk?.delta?.type === 'text_delta') {
                const text = chunk.delta.text;
                if (typeof text === 'string' && text.length > 0) {
                    res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
                }
            }

            if (eventType === 'message_stop') {
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                res.end();
                return;
            }
        }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
};
