export type { ProviderModelOption } from './types.js';
export { encryptApiKey, decryptApiKey } from './encryption.js';
export type { AIProvider } from './types.js';
export { AI_PROVIDER_IDS, isPreferredProvider } from './types.js';
export { buildGenerationPrompt, parseGeneratedCases } from './prompt.js';

export const sanitizeModelIds = (value: unknown): string[] => {
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

export const toCustomModelOption = (modelId: string): { value: string; label: string; source: 'custom' } => {
    return {
        value: modelId,
        label: `${modelId} (Custom)`,
        source: 'custom',
    };
};
