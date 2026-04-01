export type PreferredProvider = 'gemini' | 'openrouter';

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

export interface OpenRouterModelApiRecord {
    id?: string;
    name?: string;
    description?: string;
    context_length?: number;
    architecture?: {
        input_modalities?: string[];
        output_modalities?: string[];
    };
    supported_parameters?: string[];
}

export interface OpenRouterModelListResponse {
    data?: OpenRouterModelApiRecord[];
}
