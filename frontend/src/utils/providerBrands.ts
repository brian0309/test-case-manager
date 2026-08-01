export type AIProvider = 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'deepseek';

export interface ProviderBrand {
    color: string;
    monogram: string;
}

export const PROVIDER_BRANDS: Record<AIProvider, ProviderBrand> = {
    gemini: { color: '#4285F4', monogram: 'G' },
    openrouter: { color: '#7A5AF8', monogram: 'OR' },
    openai: { color: '#10A37F', monogram: 'O' },
    anthropic: { color: '#D97757', monogram: 'C' },
    deepseek: { color: '#4D6BFE', monogram: 'D' },
};
