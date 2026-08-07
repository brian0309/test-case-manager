import { Response as ExpressResponse } from 'express';
import { ProviderModelOption } from '../../ai-shared/index.js';
import { buildGenerationPrompt, parseGeneratedCases } from '../../ai-shared/index.js';
import { GeneratedTestCase, SelectedFields } from '../../ai-shared/types.js';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const OPENAI_MODELS_TTL_MS = 10 * 60 * 1000;
const OPENAI_MAX_MODELS = 100;
const OPENAI_MAX_TOKENS = 8192;

const OPENAI_FALLBACK_MODELS: ProviderModelOption[] = [
    {
        value: 'gpt-5',
        label: 'GPT-5',
        description: 'OpenAI flagship model with advanced reasoning and coding ability',
        source: 'fallback',
    },
    {
        value: 'gpt-5-mini',
        label: 'GPT-5 Mini',
        description: 'Fast and cost-efficient model for everyday generation tasks',
        source: 'fallback',
    },
    {
        value: 'gpt-4.1',
        label: 'GPT-4.1',
        description: 'Strong coding and long-context model at reduced cost',
        source: 'fallback',
    },
    {
        value: 'gpt-4o-mini',
        label: 'GPT-4o Mini',
        description: 'Balanced quality, speed, and cost for generation tasks',
        source: 'fallback',
    },
];

interface OpenAIModelCache {
    expiresAt: number;
    models: ProviderModelOption[];
}

let openAIModelCache: OpenAIModelCache | null = null;

const getOpenAIHeaders = (apiKey: string): Record<string, string> => {
    return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };
};

const isTextCapableModel = (modelId: string): boolean => {
    const normalized = modelId.trim().toLowerCase();
    return (
        normalized.startsWith('gpt-')
        || normalized.startsWith('o1')
        || normalized.startsWith('o3')
        || normalized.startsWith('o4')
        || normalized.startsWith('chatgpt-')
    );
};

const supportsOpenAITemperature = (modelId: string): boolean => {
    const normalized = modelId.trim().toLowerCase();
    return (
        !normalized.startsWith('o1')
        && !normalized.startsWith('o3')
        && !normalized.startsWith('o4')
        && !normalized.startsWith('gpt-5')
    );
};

const sortOpenAIModels = (models: ProviderModelOption[]): ProviderModelOption[] => {
    const starterOrder = new Map<string, number>();
    OPENAI_FALLBACK_MODELS.forEach((model, index) => {
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

type OpenAIInputPart =
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string };

interface OpenAIUserMessage {
    role: 'user';
    content: OpenAIInputPart[];
}

type OpenAIInput = string | OpenAIUserMessage[];

const buildOpenAIInput = (prompt: string, imageUrls: string[] = []): OpenAIInput => {
    if (imageUrls.length === 0) {
        return prompt;
    }

    const content: OpenAIInputPart[] = [{ type: 'input_text', text: prompt }];
    imageUrls.forEach((imageUrl) => {
        if (typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
            content.push({ type: 'input_image', image_url: imageUrl.trim() });
        }
    });

    return [{ role: 'user', content }];
};

const parseOpenAIError = async (response: globalThis.Response): Promise<Error> => {
    let responseMessage = `OpenAI request failed with status ${response.status}`;

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

export const simplifyOpenAIError = (error: any): string => {
    const code = error?.status || error?.code;
    const message = error?.message || 'An error occurred';

    if (code === 429 || /rate limit|quota/i.test(message)) {
        return 'OpenAI rate limit exceeded. Please try again in a few moments.';
    }

    if (code === 401 || code === 403 || /api key|unauthorized|forbidden/i.test(message)) {
        return 'Invalid OpenAI API key. Please check your OpenAI settings.';
    }

    if (code === 400) {
        return message.length > 160 ? `${message.slice(0, 157)}...` : message;
    }

    if ((typeof code === 'number' && code >= 500) || /service unavailable|upstream/i.test(message)) {
        return 'OpenAI service is temporarily unavailable. Please try again later.';
    }

    if (/network|fetch|timeout/i.test(message)) {
        return 'Network error while contacting OpenAI. Please try again.';
    }

    return message.length > 160 ? `${message.slice(0, 157)}...` : message;
};

export const getOpenAIFallbackModels = (): ProviderModelOption[] => {
    return [...OPENAI_FALLBACK_MODELS];
};

export const getOpenAIFallbackModelValues = (): string[] => {
    return OPENAI_FALLBACK_MODELS.map((model) => model.value);
};

export const listOpenAIModels = async (apiKey?: string, forceRefresh: boolean = false): Promise<ProviderModelOption[]> => {
    const now = Date.now();
    if (!forceRefresh && openAIModelCache && openAIModelCache.expiresAt > now) {
        return openAIModelCache.models;
    }

    if (!apiKey) {
        return getOpenAIFallbackModels();
    }

    try {
        const response = await fetch(`${OPENAI_API_BASE}/models`, {
            headers: getOpenAIHeaders(apiKey),
        });

        if (!response.ok) {
            throw new Error(`OpenAI model list request failed with status ${response.status}`);
        }

        const payload = await response.json() as any;
        const modelRecords = Array.isArray(payload.data) ? payload.data : [];

        const normalized = modelRecords
            .filter((record: any) => typeof record.id === 'string' && isTextCapableModel(record.id))
            .map((record: any): ProviderModelOption => ({
                value: record.id,
                label: record.id,
                source: 'api',
            }));

        const merged = sortOpenAIModels(normalized).slice(0, OPENAI_MAX_MODELS);

        if (merged.length === 0) {
            return getOpenAIFallbackModels();
        }

        openAIModelCache = {
            expiresAt: now + OPENAI_MODELS_TTL_MS,
            models: merged,
        };

        return merged;
    } catch (error) {
        console.error('Failed to fetch OpenAI model list:', error);
        return getOpenAIFallbackModels();
    }
};

const extractOpenAIText = (payload: any): string => {
    const text = payload?.output
        ?.flatMap((item: any) => item?.content ?? [])
        ?.find((part: any) => part?.type === 'output_text')
        ?.text;

    return typeof text === 'string' ? text : '';
};

export const generateOpenAITestCaseDetails = async (
    apiKey: string,
    context: string,
    selectedFields: SelectedFields = { area: true, steps: true, expected: true },
    existingTestCases: string[] = [],
    imageUrls: string[] = [],
    model: string = 'gpt-5'
): Promise<GeneratedTestCase[]> => {
    const prompt = buildGenerationPrompt(context, selectedFields, existingTestCases, imageUrls);
    const input = buildOpenAIInput(prompt, imageUrls);

    const requestBody: Record<string, any> = {
        model,
        input,
        stream: false,
        text: { format: { type: 'json_object' } },
        max_output_tokens: OPENAI_MAX_TOKENS,
    };

    if (supportsOpenAITemperature(model)) {
        requestBody.temperature = 0.2;
    }

    const response = await fetch(`${OPENAI_API_BASE}/responses`, {
        method: 'POST',
        headers: getOpenAIHeaders(apiKey),
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw await parseOpenAIError(response);
    }

    const payload = await response.json() as any;
    return parseGeneratedCases(extractOpenAIText(payload));
};

export const generateOpenAITestCaseDetailsStream = async (
    apiKey: string,
    context: string,
    selectedFields: SelectedFields,
    existingTestCases: string[],
    imageUrls: string[],
    model: string,
    res: ExpressResponse
): Promise<void> => {
    const prompt = buildGenerationPrompt(context, selectedFields, existingTestCases, imageUrls);
    const input = buildOpenAIInput(prompt, imageUrls);

    const requestBody: Record<string, any> = {
        model,
        input,
        stream: true,
        text: { format: { type: 'json_object' } },
        max_output_tokens: OPENAI_MAX_TOKENS,
    };

    if (supportsOpenAITemperature(model)) {
        requestBody.temperature = 0.2;
    }

    const response = await fetch(`${OPENAI_API_BASE}/responses`, {
        method: 'POST',
        headers: getOpenAIHeaders(apiKey),
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw await parseOpenAIError(response);
    }

    if (!response.body) {
        throw new Error('No response body from OpenAI streaming API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
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
                throw new Error(chunk?.error?.message || 'OpenAI streaming error');
            }

            if (eventType === 'response.failed') {
                throw new Error(chunk?.error?.message || 'OpenAI generation failed');
            }

            if (eventType === 'response.output_text.delta') {
                const text = chunk?.delta;
                if (typeof text === 'string' && text.length > 0) {
                    res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
                }
            }

            if (eventType === 'response.completed') {
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                res.end();
                return;
            }
        }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
};
