import { Response as ExpressResponse } from 'express';
import { ProviderModelOption } from '../../geminigen/gemini.service.js';
import {
    GeneratedStep,
    GeneratedTestCase,
    OpenRouterModelApiRecord,
    OpenRouterModelListResponse,
    SelectedFields,
} from '../types/openrouter.types.js';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODELS_TTL_MS = 10 * 60 * 1000;
const OPENROUTER_MAX_MODELS = 500;

const OPENROUTER_FALLBACK_MODELS: ProviderModelOption[] = [
    {
        value: 'openai/gpt-4o-mini',
        label: 'OpenAI: GPT-4o Mini',
        description: 'Balanced quality, speed, and cost for generation tasks',
        source: 'fallback',
    },
    {
        value: 'openai/gpt-4.1-mini',
        label: 'OpenAI: GPT-4.1 Mini',
        description: 'Strong coding and reasoning at lower cost than flagship models',
        source: 'fallback',
    },
    {
        value: 'anthropic/claude-3.5-sonnet',
        label: 'Anthropic: Claude 3.5 Sonnet',
        description: 'High-quality reasoning and writing with strong instruction following',
        source: 'fallback',
    },
    {
        value: 'google/gemini-2.5-flash',
        label: 'Google: Gemini 2.5 Flash',
        description: 'Fast multimodal model with strong quality for broad tasks',
        source: 'fallback',
    },
    {
        value: 'deepseek/deepseek-r1',
        label: 'DeepSeek: R1',
        description: 'Reasoning-focused model useful for deeper analytical generation',
        source: 'fallback',
    },
];

interface OpenRouterModelCache {
    expiresAt: number;
    models: ProviderModelOption[];
}

let openRouterModelCache: OpenRouterModelCache | null = null;

const getOpenRouterHeaders = (apiKey: string): Record<string, string> => {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };

    if (process.env.OPENROUTER_HTTP_REFERER) {
        headers['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER;
    }

    if (process.env.OPENROUTER_TITLE) {
        headers['X-OpenRouter-Title'] = process.env.OPENROUTER_TITLE;
    }

    return headers;
};

const trimToSingleLine = (value: string | undefined): string | undefined => {
    if (!value) {
        return undefined;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return undefined;
    }

    return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
};

const toModelOption = (model: OpenRouterModelApiRecord): ProviderModelOption | null => {
    if (!model.id || typeof model.id !== 'string') {
        return null;
    }

    const label = typeof model.name === 'string' && model.name.trim().length > 0
        ? model.name
        : model.id;

    return {
        value: model.id,
        label,
        description: trimToSingleLine(model.description),
        source: 'api',
    };
};

const isTextOutputModel = (model: OpenRouterModelApiRecord): boolean => {
    const outputModalities = model.architecture?.output_modalities;
    if (!Array.isArray(outputModalities) || outputModalities.length === 0) {
        return true;
    }

    return outputModalities.includes('text');
};

const sortOpenRouterModels = (models: ProviderModelOption[]): ProviderModelOption[] => {
    const starterOrder = new Map<string, number>();
    OPENROUTER_FALLBACK_MODELS.forEach((model, index) => {
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

const dedupeModelOptions = (models: ProviderModelOption[]): ProviderModelOption[] => {
    const byId = new Map<string, ProviderModelOption>();
    models.forEach((model) => {
        byId.set(model.value, model);
    });

    return Array.from(byId.values());
};

const buildGenerationPrompt = (
    context: string,
    selectedFields: SelectedFields,
    existingTestCases: string[] = [],
    imageUrls: string[] = []
): string => {
    const requestedFields: string[] = ['title', 'description', 'preconditions'];
    if (selectedFields.area) {
        requestedFields.push('area');
    }
    if (selectedFields.expected) {
        requestedFields.push('expectedResult');
    }
    if (selectedFields.steps) {
        requestedFields.push('steps');
    }

    const existingCasesContext = existingTestCases.length > 0
        ? `\n\nExisting test case titles to avoid duplicating:\n${existingTestCases.map((title, i) => `${i + 1}. ${title}`).join('\n')}`
        : '';

    const imageContext = imageUrls.length > 0
        ? `\n\nYou are also provided with ${imageUrls.length} image(s) as additional context. Use visual context when relevant.`
        : '';

    return `You are generating software QA test cases.
Return ONLY valid JSON with no markdown.
Use this exact shape:
{
  "testCases": [
    {
      "title": "...",
      "description": "...",
      "preconditions": "...",
      "area": "...",
      "expectedResult": "...",
      "steps": [
        { "action": "...", "expectedResult": "..." }
      ]
    }
  ]
}

Rules:
- Generate at least 10 test cases unless context is trivial.
- Include a broad mix of positive, negative, edge, validation, and error-handling scenarios.
- Keep each test case unique and non-duplicative.
- Required fields in each test case: ${requestedFields.join(', ')}.
- Omit optional fields not requested by the user.
${selectedFields.steps ? '- For steps, provide concise ordered action/expectedResult pairs.' : ''}

Context:\n${context}${imageContext}${existingCasesContext}`;
};

type MessagePart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } };

type OpenRouterMessage = {
    role: 'system' | 'user';
    content: string | MessagePart[];
};

const buildMessages = (prompt: string, imageUrls: string[] = []): OpenRouterMessage[] => {
    const contentParts: MessagePart[] = [
        {
            type: 'text',
            text: prompt,
        },
    ];

    imageUrls.forEach((imageUrl) => {
        if (typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
            contentParts.push({
                type: 'image_url',
                image_url: { url: imageUrl.trim() },
            });
        }
    });

    return [
        {
            role: 'system',
            content: 'You are a QA engineer assistant that always returns strict JSON.',
        },
        {
            role: 'user',
            content: contentParts,
        },
    ];
};

const cleanJsonText = (value: string): string => {
    return value
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '');
};

const toStep = (input: any): GeneratedStep | null => {
    if (!input || typeof input !== 'object') {
        return null;
    }

    const action = typeof input.action === 'string' ? input.action.trim() : '';
    const expectedResult = typeof input.expectedResult === 'string' ? input.expectedResult.trim() : '';

    if (!action && !expectedResult) {
        return null;
    }

    return {
        action,
        expectedResult,
    };
};

const toGeneratedCase = (input: any): GeneratedTestCase | null => {
    if (!input || typeof input !== 'object') {
        return null;
    }

    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    const preconditions = typeof input.preconditions === 'string' ? input.preconditions.trim() : '';

    if (!title || !description) {
        return null;
    }

    const generatedCase: GeneratedTestCase = {
        title,
        description,
        preconditions,
    };

    if (typeof input.area === 'string') {
        generatedCase.area = input.area.trim();
    }

    if (typeof input.expectedResult === 'string') {
        generatedCase.expectedResult = input.expectedResult.trim();
    }

    if (Array.isArray(input.steps)) {
        const steps = input.steps
            .map(toStep)
            .filter((step: GeneratedStep | null): step is GeneratedStep => step !== null);

        if (steps.length > 0) {
            generatedCase.steps = steps;
        }
    }

    return generatedCase;
};

const parseGeneratedCases = (rawContent: string): GeneratedTestCase[] => {
    const cleanText = cleanJsonText(rawContent);

    const parseJson = (text: string): any => {
        return JSON.parse(text);
    };

    const extractCases = (parsed: any): GeneratedTestCase[] => {
        if (Array.isArray(parsed)) {
            return parsed
                .map(toGeneratedCase)
                .filter((testCase): testCase is GeneratedTestCase => testCase !== null);
        }

        if (parsed && typeof parsed === 'object') {
            const nestedArray = parsed.testCases || parsed.cases || parsed.data;
            if (Array.isArray(nestedArray)) {
                return nestedArray
                    .map(toGeneratedCase)
                    .filter((testCase): testCase is GeneratedTestCase => testCase !== null);
            }
        }

        return [];
    };

    try {
        return extractCases(parseJson(cleanText));
    } catch {
        if (cleanText.startsWith('[')) {
            const lastObjectEnd = cleanText.lastIndexOf('}');
            if (lastObjectEnd > 0) {
                try {
                    return extractCases(parseJson(`${cleanText.substring(0, lastObjectEnd + 1)}]`));
                } catch {
                    // Ignore and fall through
                }
            }
        }

        return [];
    }
};

const parseOpenRouterError = async (response: globalThis.Response): Promise<Error> => {
    let responseMessage = `OpenRouter request failed with status ${response.status}`;

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

export const simplifyOpenRouterError = (error: any): string => {
    const code = error?.status || error?.code;
    const message = error?.message || 'An error occurred';

    if (code === 429 || /rate limit|quota/i.test(message)) {
        return 'OpenRouter rate limit exceeded. Please try again in a few moments.';
    }

    if (code === 401 || code === 403 || /api key|unauthorized|forbidden/i.test(message)) {
        return 'Invalid OpenRouter API key. Please check your OpenRouter settings.';
    }

    if (code === 400) {
        return message.length > 160 ? `${message.slice(0, 157)}...` : message;
    }

    if (typeof code === 'number' && code >= 500 || /service unavailable|upstream/i.test(message)) {
        return 'OpenRouter service is temporarily unavailable. Please try again later.';
    }

    if (/network|fetch|timeout/i.test(message)) {
        return 'Network error while contacting OpenRouter. Please try again.';
    }

    return message.length > 160 ? `${message.slice(0, 157)}...` : message;
};

export const getOpenRouterFallbackModels = (): ProviderModelOption[] => {
    return [...OPENROUTER_FALLBACK_MODELS];
};

export const getOpenRouterFallbackModelValues = (): string[] => {
    return OPENROUTER_FALLBACK_MODELS.map((model) => model.value);
};

export const listOpenRouterModels = async (apiKey?: string, forceRefresh: boolean = false): Promise<ProviderModelOption[]> => {
    const now = Date.now();
    if (!forceRefresh && openRouterModelCache && openRouterModelCache.expiresAt > now) {
        return openRouterModelCache.models;
    }

    try {
        const headers: Record<string, string> = {};
        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
        }

        const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
            headers,
        });

        if (!response.ok) {
            throw new Error(`OpenRouter model list request failed with status ${response.status}`);
        }

        const payload = await response.json() as OpenRouterModelListResponse | OpenRouterModelApiRecord[];
        const modelRecords = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.data)
                ? payload.data
                : [];

        const normalized = modelRecords
            .filter(isTextOutputModel)
            .map(toModelOption)
            .filter((model): model is ProviderModelOption => model !== null);

        const merged = dedupeModelOptions([...OPENROUTER_FALLBACK_MODELS, ...normalized]);
        const sorted = sortOpenRouterModels(merged).slice(0, OPENROUTER_MAX_MODELS);

        if (sorted.length === 0) {
            return getOpenRouterFallbackModels();
        }

        openRouterModelCache = {
            expiresAt: now + OPENROUTER_MODELS_TTL_MS,
            models: sorted,
        };

        return sorted;
    } catch (error) {
        console.error('Failed to fetch OpenRouter model list:', error);
        return getOpenRouterFallbackModels();
    }
};

export const generateOpenRouterTestCaseDetails = async (
    apiKey: string,
    context: string,
    selectedFields: SelectedFields = { area: true, steps: true, expected: true },
    existingTestCases: string[] = [],
    imageUrls: string[] = [],
    model: string = 'openai/gpt-4o-mini'
): Promise<GeneratedTestCase[]> => {
    const prompt = buildGenerationPrompt(context, selectedFields, existingTestCases, imageUrls);
    const messages = buildMessages(prompt, imageUrls);

    const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
            model,
            messages,
            stream: false,
            response_format: { type: 'json_object' },
            temperature: 0.2,
        }),
    });

    if (!response.ok) {
        throw await parseOpenRouterError(response);
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

export const generateOpenRouterTestCaseDetailsStream = async (
    apiKey: string,
    context: string,
    selectedFields: SelectedFields,
    existingTestCases: string[],
    imageUrls: string[],
    model: string,
    res: ExpressResponse
): Promise<void> => {
    const prompt = buildGenerationPrompt(context, selectedFields, existingTestCases, imageUrls);
    const messages = buildMessages(prompt, imageUrls);

    const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
            model,
            messages,
            stream: true,
            response_format: { type: 'json_object' },
            temperature: 0.2,
        }),
    });

    if (!response.ok) {
        throw await parseOpenRouterError(response);
    }

    if (!response.body) {
        throw new Error('No response body from OpenRouter streaming API');
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
