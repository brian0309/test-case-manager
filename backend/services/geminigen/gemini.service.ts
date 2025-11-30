import { GoogleGenAI, Type } from "@google/genai";
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// ENCRYPTION_KEY must be 32 chars
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    console.warn("WARNING: ENCRYPTION_KEY is missing or not 32 characters. Secure storage will fail.");
}

export const encryptApiKey = (text: string): string => {
    if (!ENCRYPTION_KEY) throw new Error("Server configuration error: Missing encryption key");

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decryptApiKey = (text: string): string => {
    if (!ENCRYPTION_KEY) throw new Error("Server configuration error: Missing encryption key");

    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

export const generateTestSteps = async (apiKey: string, testCaseTitle: string, context?: string) => {
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Generate a list of sequential test steps for a software test case titled: "${testCaseTitle}".
        ${context ? `Context: ${context}` : ''}
        Each step should have an Action and an Expected Result. Keep it concise.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
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
                    } catch (e) {
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

export const generateTestCaseDetails = async (
    apiKey: string,
    context: string,
    type: 'new_case' | 'steps' | 'area' | 'expected',
    selectedFields: { area: boolean; steps: boolean; expected: boolean } = { area: true, steps: true, expected: true }
) => {
    const ai = new GoogleGenAI({ apiKey });

    let prompt = "";
    let schema: any = {};

    if (type === 'new_case') {
        const fieldsRequest = [];
        if (selectedFields.area) fieldsRequest.push("Page/Area");
        if (selectedFields.steps) fieldsRequest.push("list of Steps (Action + Expected Result)");
        if (selectedFields.expected) fieldsRequest.push("Expected Result Summary");

        prompt = `Based on this context: "${context}", generate a comprehensive set of test case scenarios covering all possible scenarios and edge cases.
        The number of test cases should depend on the complexity and scope of the context provided.
        For each test case, provide a Title, Description, Preconditions${fieldsRequest.length > 0 ? ", " + fieldsRequest.join(", ") : ""}.`;

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

        schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: properties,
                required: required
            }
        };
    } else {
        // Fallback or specific field generation
        prompt = `Generate content for "${type}" based on: "${context}"`;
        // ... define other schemas as needed
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
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
                    } catch (e) {
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
