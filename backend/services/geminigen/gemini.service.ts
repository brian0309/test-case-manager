import { GoogleGenAI, Type } from "@google/genai";
import { Response } from 'express';
import { encryptApiKey, decryptApiKey } from '../ai-shared/encryption.js';
import { ProviderModelOption } from '../ai-shared/types.js';

const GEMINI_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

const GEMINI_FALLBACK_MODELS = [
    {
        value: 'gemini-2.0-flash-lite',
        label: 'Gemini 2.0 Flash-Lite',
        description: 'Smallest and most cost effective, built for at scale usage'
    },
    {
        value: 'gemini-2.0-flash',
        label: 'Gemini 2.0 Flash',
        description: 'Most balanced multimodal model, great for Agents'
    },
    {
        value: 'gemini-2.5-flash-lite',
        label: 'Gemini 2.5 Flash-Lite',
        description: 'Smallest and most cost effective, built for at scale usage'
    },
    {
        value: 'gemini-2.5-flash-preview-09-2025',
        label: 'Gemini 2.5 Flash Preview',
        description: 'Best for large scale processing, low-latency, and agentic use cases'
    },
    {
        value: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        description: 'First hybrid reasoning model with 1M token context and thinking budgets'
    },
    {
        value: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
        description: 'State-of-the-art model, excels at coding and complex reasoning tasks'
    },
    {
        value: 'gemini-3-flash-preview',
        label: 'Gemini 3 Flash Preview',
        description: 'Fastest and most efficient model for high-volume tasks'
    },
    {
        value: 'gemini-3-pro-preview',
        label: 'Gemini 3 Pro Preview',
        description: 'Best model for multimodal understanding, most powerful agentic model'
    }
] as const;

interface GeminiModelListItem {
    name?: string;
    baseModelId?: string;
    displayName?: string;
    description?: string;
    supportedGenerationMethods?: string[];
}

interface GeminiModelListResponse {
    models?: GeminiModelListItem[];
}

interface GeminiModelCache {
    expiresAt: number;
    models: ProviderModelOption[];
}

let geminiModelCache: GeminiModelCache | null = null;

export type { ProviderModelOption };
export { encryptApiKey, decryptApiKey };

const normalizeGeminiModelName = (name?: string): string | null => {
    if (!name || typeof name !== 'string') {
        return null;
    }

    return name.startsWith('models/') ? name.replace('models/', '') : name;
};

const supportsGenerateContent = (model: GeminiModelListItem): boolean => {
    if (!Array.isArray(model.supportedGenerationMethods) || model.supportedGenerationMethods.length === 0) {
        return true;
    }

    return model.supportedGenerationMethods.includes('generateContent');
};

const fallbackGeminiModels = (): ProviderModelOption[] => {
    return GEMINI_FALLBACK_MODELS.map((model) => ({
        value: model.value,
        label: model.label,
        description: model.description,
        source: 'fallback' as const,
    }));
};

export const getGeminiFallbackModelValues = (): string[] => {
    return GEMINI_FALLBACK_MODELS.map((model) => model.value);
};

export const listGeminiModels = async (apiKey?: string, forceRefresh: boolean = false): Promise<ProviderModelOption[]> => {
    const now = Date.now();
    if (!forceRefresh && geminiModelCache && geminiModelCache.expiresAt > now) {
        return geminiModelCache.models;
    }

    if (!apiKey) {
        return fallbackGeminiModels();
    }

    try {
        const response = await fetch(`${GEMINI_MODELS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`);

        if (!response.ok) {
            throw new Error(`Gemini model list request failed with status ${response.status}`);
        }

        const data = await response.json() as GeminiModelListResponse;
        const apiModels = Array.isArray(data.models) ? data.models : [];

        const normalizedModels = apiModels
            .filter(supportsGenerateContent)
            .map((model): ProviderModelOption | null => {
                const value = normalizeGeminiModelName(model.name || model.baseModelId);
                if (!value) {
                    return null;
                }

                return {
                    value,
                    label: model.displayName || value,
                    ...(model.description ? { description: model.description } : {}),
                    source: 'api' as const,
                };
            })
            .filter((model): model is ProviderModelOption => model !== null);

        if (normalizedModels.length === 0) {
            return fallbackGeminiModels();
        }

        const deduped = new Map<string, ProviderModelOption>();
        normalizedModels.forEach((model) => {
            deduped.set(model.value, model);
        });

        const result = Array.from(deduped.values()).sort((a, b) => a.label.localeCompare(b.label));
        geminiModelCache = {
            expiresAt: now + GEMINI_MODEL_CACHE_TTL_MS,
            models: result,
        };

        return result;
    } catch (error) {
        console.error('Failed to fetch Gemini model list:', error);
        return fallbackGeminiModels();
    }
};

/**
 * Simplifies Gemini API error messages for user-friendly display
 */
export const simplifyGeminiError = (error: any): string => {
    // Handle nested error objects from Gemini API
    const errorObj = error?.error || error;
    const code = errorObj?.code || error?.status;
    const message = errorObj?.message || error?.message || 'An error occurred';
    
    // Rate limiting / quota errors
    if (code === 429 || message.includes('quota') || message.includes('rate limit')) {
        if (message.includes('free tier') || message.includes('free_tier')) {
            return 'Free tier quota exceeded. Please upgrade your Gemini API plan or try again later.';
        }
        return 'Rate limit exceeded. Please try again in a few moments.';
    }
    
    // Authentication errors
    if (code === 401 || code === 403) {
        return 'Invalid API key. Please check your Gemini API settings.';
    }
    
    // Invalid request errors
    if (code === 400) {
        return message.length > 160 ? `${message.slice(0, 157)}...` : message;
    }
    
    // Server errors
    if (code >= 500) {
        return 'Gemini service is temporarily unavailable. Please try again later.';
    }
    
    // Network/timeout errors
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
        return 'Network error. Please check your connection and try again.';
    }
    
    // Generic fallback - extract first sentence if message is too long
    if (message.length > 100) {
        const firstSentence = message.split(/[.!?]\s/)[0];
        return firstSentence.substring(0, 100) + '...';
    }
    
    return message;
};

export const generateTestSteps = async (apiKey: string, testCaseTitle: string, context?: string, model: string = 'gemini-2.5-flash') => {
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Generate a list of sequential test steps for a software test case titled: "${testCaseTitle}".
        ${context ? `Context: ${context}` : ''}
        Each step should have an Action and an Expected Result. Keep it concise.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            action: { type: Type.STRING },
                            expectedResult: { type: Type.STRING }
                        },
                        required: ["action", "expectedResult"]
                    }
                }
            }
        });

        let text = response.text;
        if (!text) return [];

        // Remove markdown code blocks if present
        if (typeof text === 'string') {
            text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            console.warn(`JSON parse failed for steps (length: ${text.length}), attempting recovery. Error:`, error);

            // Attempt to recover truncated JSON array
            if (typeof text === 'string' && text.trim().startsWith('[')) {
                // Try to close at the last few '}' characters
                const closingBraces = [];
                let pos = text.indexOf('}');
                while (pos !== -1) {
                    closingBraces.push(pos);
                    pos = text.indexOf('}', pos + 1);
                }

                // Try the last 5 closing braces
                for (let i = closingBraces.length - 1; i >= Math.max(0, closingBraces.length - 5); i--) {
                    const cutPos = closingBraces[i];
                    const recovered = text.substring(0, cutPos + 1) + ']';
                    try {
                        const parsed = JSON.parse(recovered);
                        console.log("JSON recovery successful for steps at position:", cutPos);
                        return parsed;
                    } catch {
                        // Continue trying
                    }
                }
                console.error("JSON recovery for steps failed after multiple attempts.");
            }
            throw error;
        }

    } catch (error) {
        console.error("Gemini generation failed:", error);
        throw error;
    }
};

/**
 * Build prompt and schema for test case generation (shared between streaming and non-streaming)
 */
function buildPromptAndSchema(
    context: string,
    selectedFields: { area: boolean; steps: boolean; expected: boolean; testDescription?: boolean },
    existingTestCases: string[] = [],
    imageUrls: string[] = []
): { prompt: string; schema: any } {
    const fieldsRequest = [];
    if (selectedFields.area) fieldsRequest.push("Page/Area");
    if (selectedFields.steps) fieldsRequest.push("list of Steps (Action + Expected Result)");
    if (selectedFields.expected) fieldsRequest.push("Expected Result Summary");

    const existingCasesContext = existingTestCases.length > 0
        ? `\n\nExisting test cases to avoid duplicating:\n${existingTestCases.map((title, i) => `${i + 1}. ${title}`).join('\n')}\n\nIMPORTANT: Generate NEW test cases that are different from the existing ones listed above. Do not create similar or duplicate test cases.`
        : '';

    const imageContext = imageUrls.length > 0
        ? `\n\nI have also provided ${imageUrls.length} image(s) as additional context. Please analyze the images carefully and use the visual information to generate comprehensive test cases that cover UI elements, interactions, and functionality visible in the images.`
        : '';

    const prompt = `Based on this context: "${context}"${imageContext}, generate a comprehensive set of test case scenarios covering all possible scenarios and edge cases.
    Generate at least 10 test cases (or more if the context is highly complex), ensuring broad coverage across different categories:

    - Positive Test Cases: Normal, expected workflows that should pass
    - Negative Test Cases: Invalid inputs, error conditions, and failure scenarios
    - Edge Cases: Boundary conditions, extreme values, and unusual but valid inputs
    - Boundary Value Tests: Tests at the limits of acceptable input ranges
    - Error Handling Tests: How the system responds to errors, exceptions, and unexpected conditions
    - Security/Validation Tests: Input validation, sanitization, and security-related scenarios
    - Performance/Stress Tests: High load, large data sets, or resource-intensive operations
    - Integration Tests: Interactions between different components or systems
    - Accessibility Tests: Usability for different user types or assistive technologies
    - Cross-browser/Cross-platform Tests: If applicable to the context

    For each test case, provide a Title, Description, Preconditions${fieldsRequest.length > 0 ? ", " + fieldsRequest.join(", ") : ""}.${existingCasesContext}`;

    const properties: any = {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        preconditions: { type: Type.STRING }
    };

    const required = ["title", "description"];

    if (selectedFields.area) {
        properties.area = { type: Type.STRING };
    }
    if (selectedFields.expected) {
        properties.expectedResult = { type: Type.STRING };
    }
    if (selectedFields.steps) {
        properties.steps = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    action: { type: Type.STRING },
                    expectedResult: { type: Type.STRING }
                }
            }
        };
        required.push("steps");
    }

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: properties,
            required: required
        }
    };

    return { prompt, schema };
}

/**
 * Build contents for Gemini API (handles images if present)
 */
async function buildContents(prompt: string, imageUrls: string[] = []): Promise<any> {
    if (imageUrls.length > 0) {
        const parts: any[] = [];
        
        for (const imageUrl of imageUrls) {
            try {
                const imageData = await fetchImageAsBase64(imageUrl);
                if (imageData) {
                    parts.push({
                        inlineData: {
                            mimeType: imageData.mimeType,
                            data: imageData.base64
                        }
                    });
                }
            } catch (imgError) {
                console.warn(`Failed to fetch image ${imageUrl}:`, imgError);
            }
        }
        
        parts.push({ text: prompt });
        return parts;
    }
    
    return prompt;
}

/**
 * Fetches an image from a URL and returns it as base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            console.warn(`Failed to fetch image: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = response.headers.get('content-type') || getMimeTypeFromUrl(imageUrl);
        
        return {
            base64,
            mimeType: contentType
        };
    } catch (error) {
        console.error(`Error fetching image from ${imageUrl}:`, error);
        return null;
    }
}

/**
 * Helper function to get MIME type from URL based on file extension
 */
function getMimeTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
    const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
    };
    return mimeTypes[extension || ''] || 'image/jpeg';
}

export const generateTestCaseDetails = async (
    apiKey: string,
    context: string,
    selectedFields: { area: boolean; steps: boolean; expected: boolean; testDescription?: boolean } = { area: true, steps: true, expected: true },
    existingTestCases: string[] = [],
    imageUrls: string[] = [],
    model: string = 'gemini-2.5-flash'
) => {
    const ai = new GoogleGenAI({ apiKey });

    const { prompt, schema } = buildPromptAndSchema(context, selectedFields, existingTestCases, imageUrls);

    try {
        const contents = await buildContents(prompt, imageUrls);

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        let text = response.text;
        if (!text) return [];

        // Remove markdown code blocks if present
        if (typeof text === 'string') {
            text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            console.warn(`JSON parse failed (length: ${text.length}), attempting recovery. Error:`, error);

            // Attempt to recover truncated JSON array
            if (typeof text === 'string' && text.trim().startsWith('[')) {
                // Try to close at the last few '}' characters
                const closingBraces = [];
                let pos = text.indexOf('}');
                while (pos !== -1) {
                    closingBraces.push(pos);
                    pos = text.indexOf('}', pos + 1);
                }

                // Try the last 5 closing braces
                for (let i = closingBraces.length - 1; i >= Math.max(0, closingBraces.length - 5); i--) {
                    const cutPos = closingBraces[i];
                    const recovered = text.substring(0, cutPos + 1) + ']';
                    try {
                        const parsed = JSON.parse(recovered);
                        console.log("JSON recovery successful at position:", cutPos);
                        return parsed;
                    } catch {
                        // Continue trying
                    }
                }
                console.error("JSON recovery failed after multiple attempts.");
            }
            throw error;
        }
    } catch (error) {
        console.error("Gemini generation failed:", error);
        throw error;
    }
};

/**
 * Streaming version of generateTestCaseDetails
 * Streams chunks directly to the Express response using Server-Sent Events
 */
export const generateTestCaseDetailsStream = async (
    apiKey: string,
    context: string,
    selectedFields: { area: boolean; steps: boolean; expected: boolean; testDescription?: boolean },
    existingTestCases: string[],
    imageUrls: string[],
    model: string,
    res: Response
): Promise<void> => {
    const ai = new GoogleGenAI({ apiKey });
    
    const { prompt, schema } = buildPromptAndSchema(context, selectedFields, existingTestCases, imageUrls);
    const contents = await buildContents(prompt, imageUrls);

    try {
        const stream = await ai.models.generateContentStream({
            model: model,
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        // Stream each chunk to the client
        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
                // Send as SSE data event
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
            }
        }

        // Send completion event
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();

    } catch (error: any) {
        console.error("Gemini streaming generation failed:", error);
        const simplifiedMessage = simplifyGeminiError(error);
        // Send error event
        res.write(`data: ${JSON.stringify({ type: 'error', message: simplifiedMessage })}\n\n`);
        res.end();
    }
};
