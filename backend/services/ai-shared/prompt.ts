import {
    GeneratedStep,
    GeneratedTestCase,
    SelectedFields,
} from './types.js';

export const buildGenerationPrompt = (
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

export const cleanJsonText = (value: string): string => {
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

export const parseGeneratedCases = (rawContent: string): GeneratedTestCase[] => {
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
