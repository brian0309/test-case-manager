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
            model: "gemini-2.5-pro",
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
    selectedFields: { area: boolean; steps: boolean; expected: boolean } = { area: true, steps: true, expected: true },
    existingTestCases: string[] = [],
    imageUrls: string[] = []
) => {
    const ai = new GoogleGenAI({ apiKey });

    let prompt = "";
    let schema: any = {};

    if (type === 'new_case') {
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

        prompt = `Based on this context: "${context}"${imageContext}, generate a comprehensive set of test case scenarios covering all possible scenarios and edge cases.
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
        // Build contents array - if we have images, we need to use multimodal input
        let contents: any;
        
        if (imageUrls.length > 0) {
            // For images, we need to fetch and convert to base64
            const parts: any[] = [];
            
            // Add images as inline data
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
                    // Continue without this image
                }
            }
            
            // Add the text prompt
            parts.push({ text: prompt });
            
            contents = parts;
        } else {
            // No images, just use the text prompt
            contents = prompt;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
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
