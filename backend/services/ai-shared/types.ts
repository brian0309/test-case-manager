export type AIProvider = 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'deepseek';

export const AI_PROVIDER_IDS: AIProvider[] = ['gemini', 'openrouter', 'openai', 'anthropic', 'deepseek'];

export const isPreferredProvider = (value: unknown): value is AIProvider => {
    return typeof value === 'string' && (AI_PROVIDER_IDS as string[]).includes(value);
};

export interface ProviderModelOption {
    value: string;
    label: string;
    description?: string;
    source?: 'api' | 'fallback' | 'custom';
}

export interface GeneratedStep {
    action: string;
    expectedResult: string;
}

export interface GeneratedTestCase {
    title: string;
    description: string;
    preconditions: string;
    area?: string;
    expectedResult?: string;
    steps?: GeneratedStep[];
}

export interface SelectedFields {
    area: boolean;
    steps: boolean;
    expected: boolean;
    testDescription?: boolean;
}
