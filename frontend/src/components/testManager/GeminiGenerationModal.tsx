import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ImagePreviewUploader from '../ImagePreviewUploader';
import ProviderLogo from '../ProviderLogo';
import { API_URL } from '../../utils/api';
import { Priority, Status, TestCase } from '../../types/testManager';
import type { AIProvider } from '../../utils/providerBrands';

interface GeminiGenerationModalProps {
    onClose: () => void;
    onAddCases: (cases: TestCase[]) => void;
    projectContext: string;
    suiteContext: string;
    projectId: string;
    suiteId: string;
    existingTestCases: string[];
}

interface GeneratedCase {
    title: string;
    description: string;
    preconditions: string;
    steps?: { action: string; expectedResult: string }[];
    area?: string;
    expectedResult?: string;
    selected: boolean;
}

interface ProviderMeta {
    label: string;
    endpointBase: string;
    defaultModel: string;
}

const PROVIDER_META: Record<AIProvider, ProviderMeta> = {
    gemini: { label: 'Gemini', endpointBase: '/gemini', defaultModel: 'gemini-2.5-flash' },
    openrouter: { label: 'OpenRouter', endpointBase: '/openrouter', defaultModel: 'openai/gpt-4o-mini' },
    openai: { label: 'OpenAI', endpointBase: '/openai', defaultModel: 'gpt-5' },
    anthropic: { label: 'Anthropic Claude', endpointBase: '/anthropic', defaultModel: 'claude-sonnet-4' },
    deepseek: { label: 'DeepSeek', endpointBase: '/deepseek', defaultModel: 'deepseek-v4-flash' },
};

const ALL_PROVIDERS: AIProvider[] = ['gemini', 'openrouter', 'openai', 'anthropic', 'deepseek'];

interface ProviderModelOption {
    value: string;
    label: string;
    description?: string;
    source?: 'api' | 'fallback' | 'custom';
}

interface ProviderSettingsData {
    hasApiKey: boolean;
    model: string;
    availableModels: ProviderModelOption[];
    visibleModels: string[];
    preferredProvider?: AIProvider;
}

const pickVisibleModelOptions = (
    availableModels: ProviderModelOption[],
    visibleModels: string[]
): ProviderModelOption[] => {
    if (!Array.isArray(availableModels) || availableModels.length === 0) {
        return [];
    }

    if (!Array.isArray(visibleModels) || visibleModels.length === 0) {
        return availableModels;
    }

    const visibleSet = new Set(visibleModels);
    const filtered = availableModels.filter((model) => visibleSet.has(model.value));
    return filtered.length > 0 ? filtered : availableModels;
};

const toSelectableCases = (input: unknown[]): GeneratedCase[] => {
    return input
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
        .map((item) => ({
            title: typeof item.title === 'string' ? item.title : '',
            description: typeof item.description === 'string' ? item.description : '',
            preconditions: typeof item.preconditions === 'string' ? item.preconditions : '',
            steps: Array.isArray(item.steps)
                ? item.steps
                    .filter((step): step is Record<string, unknown> => step !== null && typeof step === 'object')
                    .map((step) => ({
                        action: typeof step.action === 'string' ? step.action : '',
                        expectedResult: typeof step.expectedResult === 'string' ? step.expectedResult : '',
                    }))
                : [],
            area: typeof item.area === 'string' ? item.area : '',
            expectedResult: typeof item.expectedResult === 'string' ? item.expectedResult : '',
            selected: true,
        }))
        .filter((item) => item.title.trim().length > 0);
};

const extractGeneratedCases = (parsed: unknown): GeneratedCase[] => {
    if (Array.isArray(parsed)) {
        return toSelectableCases(parsed);
    }

    if (parsed && typeof parsed === 'object') {
        const payload = parsed as Record<string, unknown>;
        const nested = payload.testCases || payload.cases || payload.data;
        if (Array.isArray(nested)) {
            return toSelectableCases(nested);
        }
    }

    return [];
};

const parseStreamedJson = (rawText: string): GeneratedCase[] => {
    let cleanText = rawText.trim();
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

    if (!cleanText) {
        return [];
    }

    try {
        const parsed = JSON.parse(cleanText);
        return extractGeneratedCases(parsed);
    } catch {
        if (cleanText.startsWith('[')) {
            const lastObjectEnd = cleanText.lastIndexOf('}');
            if (lastObjectEnd > 0) {
                try {
                    const recovered = `${cleanText.substring(0, lastObjectEnd + 1)}]`;
                    const parsed = JSON.parse(recovered);
                    return extractGeneratedCases(parsed);
                } catch {
                    return [];
                }
            }
        }

        return [];
    }
};

const GeminiGenerationModal: React.FC<GeminiGenerationModalProps> = ({
    onClose,
    onAddCases,
    projectContext,
    suiteContext,
    projectId,
    suiteId,
    existingTestCases,
}) => {
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
    const [providerHasApiKey, setProviderHasApiKey] = useState<Record<AIProvider, boolean>>({
        gemini: false,
        openrouter: false,
        openai: false,
        anthropic: false,
        deepseek: false,
    });
    const [providerModels, setProviderModels] = useState<Record<AIProvider, ProviderModelOption[]>>({
        gemini: [],
        openrouter: [],
        openai: [],
        anthropic: [],
        deepseek: [],
    });
    const [selectedModels, setSelectedModels] = useState<Record<AIProvider, string>>({
        gemini: 'gemini-2.5-flash',
        openrouter: 'openai/gpt-4o-mini',
        openai: 'gpt-5',
        anthropic: 'claude-sonnet-4',
        deepseek: 'deepseek-v4-flash',
    });
    const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

    const [selectedFields, setSelectedFields] = useState({
        area: true,
        steps: true,
        expected: true,
        testDescription: true,
    });
    const [context, setContext] = useState(`Project: ${projectContext}\nSuite: ${suiteContext}`);
    const [contextImages, setContextImages] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCases, setGeneratedCases] = useState<GeneratedCase[]>([]);
    const [expandedCaseIndex, setExpandedCaseIndex] = useState<number | null>(null);

    const [streamingText, setStreamingText] = useState('');
    const [showLivePreview, setShowLivePreview] = useState(true);
    const streamingTextRef = useRef('');
    const livePreviewRef = useRef<HTMLPreElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const fetchProviderSettings = async () => {
            setIsLoadingSettings(true);
            try {
                const readSettings = async (url: string): Promise<ProviderSettingsData | null> => {
                    const response = await fetch(url, { credentials: 'include' });
                    if (!response.ok) {
                        return null;
                    }

                    const result = await response.json();
                    if (!result?.success || !result?.data) {
                        return null;
                    }

                    return result.data as ProviderSettingsData;
                };

                const settingsResults = await Promise.all(
                    ALL_PROVIDERS.map(async (provider) => {
                        const meta = PROVIDER_META[provider];
                        const settings = await readSettings(`${API_URL}${meta.endpointBase}/settings`);
                        return { provider, settings };
                    })
                );

                const nextHasApiKey = { ...providerHasApiKey };
                const nextModels = { ...providerModels };
                const nextSelectedModels = { ...selectedModels };
                let nextPreferred: AIProvider | null = null;

                settingsResults.forEach(({ provider, settings }) => {
                    const meta = PROVIDER_META[provider];
                    const options = pickVisibleModelOptions(
                        settings?.availableModels || [],
                        settings?.visibleModels || []
                    );

                    const savedModel = settings?.model
                        && options.some((model) => model.value === settings.model)
                        ? settings.model
                        : options[0]?.value || meta.defaultModel;

                    nextHasApiKey[provider] = Boolean(settings?.hasApiKey);
                    nextModels[provider] = options;
                    nextSelectedModels[provider] = savedModel;

                    if (!nextPreferred && settings?.preferredProvider) {
                        nextPreferred = settings.preferredProvider;
                    }
                });

                setProviderHasApiKey(nextHasApiKey);
                setProviderModels(nextModels);
                setSelectedModels(nextSelectedModels);

                if (nextPreferred) {
                    setSelectedProvider(nextPreferred);
                } else if (settingsResults.some(({ settings }) => settings?.hasApiKey)) {
                    const firstConfigured = settingsResults.find(({ settings }) => settings?.hasApiKey);
                    if (firstConfigured) {
                        setSelectedProvider(firstConfigured.provider);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch provider settings:', error);
                toast.error('Unable to load AI provider settings.');
            } finally {
                setIsLoadingSettings(false);
            }
        };

        fetchProviderSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (livePreviewRef.current && showLivePreview) {
            livePreviewRef.current.scrollTop = livePreviewRef.current.scrollHeight;
        }
    }, [streamingText, showLivePreview]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleGenerate = async () => {
        const selectedModel = selectedModels[selectedProvider];
        const activeModels = providerModels[selectedProvider];

        if (!providerHasApiKey[selectedProvider]) {
            toast.error(`${PROVIDER_META[selectedProvider].label} API key is not configured in Settings.`);
            return;
        }

        if (!selectedModel || activeModels.length === 0) {
            toast.error('No visible model is available for the selected provider.');
            return;
        }

        setIsGenerating(true);
        setStreamingText('');
        setGeneratedCases([]);
        streamingTextRef.current = '';
        abortControllerRef.current = new AbortController();

        try {
            const endpoint = `${API_URL}${PROVIDER_META[selectedProvider].endpointBase}/generate-stream`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    context,
                    selectedFields,
                    existingTestCases,
                    imageUrls: contextImages,
                    model: selectedModel,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';
            let didReceiveDone = false;

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split('\n\n');
                buffer = events.pop() || '';

                for (const event of events) {
                    if (!event.startsWith('data: ')) {
                        continue;
                    }

                    try {
                        const data = JSON.parse(event.slice(6));

                        if (data.type === 'chunk') {
                            const chunkContent = typeof data.content === 'string' ? data.content : '';
                            streamingTextRef.current += chunkContent;
                            setStreamingText(streamingTextRef.current);
                        } else if (data.type === 'done') {
                            didReceiveDone = true;
                            const parsedCases = parseStreamedJson(streamingTextRef.current);
                            setGeneratedCases(parsedCases);
                        } else if (data.type === 'error') {
                            throw new Error(data.message || 'AI generation failed');
                        }
                    } catch (error) {
                        if (error instanceof SyntaxError) {
                            console.warn('Failed to parse SSE chunk:', event);
                        } else {
                            throw error;
                        }
                    }
                }
            }

            if (!didReceiveDone && streamingTextRef.current.trim().length > 0) {
                const parsedCases = parseStreamedJson(streamingTextRef.current);
                setGeneratedCases(parsedCases);
            }
        } catch (error: unknown) {
            const errorObj = error as { name?: string; message?: string; error?: { message?: string } };
            if (errorObj.name === 'AbortError') {
                toast.error('Generation cancelled');
            } else {
                let errorMessage = 'Failed to generate test cases';
                if (typeof error === 'string') {
                    errorMessage = error;
                } else if (errorObj?.message) {
                    errorMessage = errorObj.message;
                } else if (errorObj?.error?.message) {
                    errorMessage = errorObj.error.message;
                }

                if (errorMessage.length > 150) {
                    errorMessage = `${errorMessage.substring(0, 147)}...`;
                }

                toast.error(errorMessage, { duration: 5000 });
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const handleAddSelected = () => {
        const selected = generatedCases.filter((testCase) => testCase.selected);

        const newTestCases: TestCase[] = selected.map((testCase, index) => ({
            id: `gen-${Date.now()}-${index}`,
            title: testCase.title,
            priority: Priority.Medium,
            status: Status.Draft,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            assignedTester: {
                id: 'u-current',
                name: 'You',
                avatar: 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff',
            },
            suite: suiteId,
            projectId,
            area: testCase.area || '',
            steps: (testCase.steps || []).map((step, stepIndex) => ({
                id: `step-${stepIndex}`,
                action: step.action,
                expectedResult: step.expectedResult,
            })),
            testDescription: testCase.description || '',
            preconditions: testCase.preconditions,
            expectedResult: testCase.expectedResult || '',
        } as TestCase));

        onAddCases(newTestCases);
        onClose();
    };

    const activeProviderModels = providerModels[selectedProvider];
    const selectedModel = selectedModels[selectedProvider] || '';
    const selectedModelDescription = activeProviderModels.find((model) => model.value === selectedModel)?.description;
    const configuredProviders = ALL_PROVIDERS.filter(
        (provider) => providerHasApiKey[provider] && providerModels[provider].length > 0
    );

    useEffect(() => {
        if (configuredProviders.length > 0 && !configuredProviders.includes(selectedProvider)) {
            setSelectedProvider(configuredProviders[0]);
        }
    }, [configuredProviders, selectedProvider]);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
                <div
                    className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-gray-800 sm:rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
                >
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate with AI</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="space-y-4">
                            {isLoadingSettings ? (
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
                                    Loading provider settings...
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                AI Provider
                                            </label>
                                            <div className="relative">
                                                {configuredProviders.length > 0 && (
                                                    <ProviderLogo
                                                        provider={selectedProvider}
                                                        size="sm"
                                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                                    />
                                                )}
                                                <select
                                                    value={selectedProvider}
                                                    onChange={(event) => setSelectedProvider(event.target.value as AIProvider)}
                                                    disabled={isGenerating || configuredProviders.length === 0}
                                                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed ${configuredProviders.length > 0 ? 'pl-10' : ''}`}
                                                >
                                                    {configuredProviders.length === 0 && (
                                                        <option value="">No providers configured</option>
                                                    )}
                                                    {configuredProviders.map((provider) => (
                                                        <option key={provider} value={provider}>
                                                            {PROVIDER_META[provider].label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                AI Model
                                            </label>
                                            <select
                                                value={selectedModel}
                                                onChange={(event) => {
                                                    const nextValue = event.target.value;
                                                    setSelectedModels((previous) => ({
                                                        ...previous,
                                                        [selectedProvider]: nextValue,
                                                    }));
                                                }}
                                                disabled={isGenerating || activeProviderModels.length === 0}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {activeProviderModels.length === 0 && (
                                                    <option value="">No visible models available</option>
                                                )}
                                                {activeProviderModels.map((model) => (
                                                    <option key={model.value} value={model.value}>
                                                        {model.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {configuredProviders.length === 0 && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 text-sm text-amber-700 dark:text-amber-300">
                                            No AI providers configured yet. Set up a provider API key in{' '}
                                            <a
                                                href="/settings"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium underline hover:text-amber-800 dark:hover:text-amber-200"
                                            >
                                                Settings
                                            </a>{' '}
                                            to generate test cases.
                                        </div>
                                    )}

                                    {selectedModelDescription && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{selectedModelDescription}</p>
                                    )}
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Context
                                </label>
                                <div className="space-y-3">
                                    <ImagePreviewUploader
                                        images={contextImages}
                                        onImagesChange={setContextImages}
                                        maxImages={5}
                                        disabled={isGenerating}
                                    />
                                    <textarea
                                        value={context}
                                        onChange={(event) => setContext(event.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
                                        placeholder="Describe what you want to test..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Include Fields
                                </label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.area}
                                            onChange={(event) => setSelectedFields((previous) => ({ ...previous, area: event.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Page / Area</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.steps}
                                            onChange={(event) => setSelectedFields((previous) => ({ ...previous, steps: event.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Test Steps</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.expected}
                                            onChange={(event) => setSelectedFields((previous) => ({ ...previous, expected: event.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Expected Result (Summary)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || isLoadingSettings || activeProviderModels.length === 0 || configuredProviders.length === 0}
                                    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white py-2.5 rounded-lg hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 transition-all disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Generate Test Cases</span>
                                        </>
                                    )}
                                </button>
                                {isGenerating && (
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2.5 bg-red-500 dark:bg-red-600 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>

                        {(isGenerating || streamingText) && (
                            <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Live Preview</h3>
                                        {isGenerating && (
                                            <span className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                </span>
                                                <span>Streaming...</span>
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowLivePreview(!showLivePreview)}
                                        className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {showLivePreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        <span>{showLivePreview ? 'Hide' : 'Show'}</span>
                                    </button>
                                </div>
                                {showLivePreview && (
                                    <pre
                                        ref={livePreviewRef}
                                        className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-auto max-h-48 font-mono whitespace-pre-wrap break-words"
                                    >
                                        {streamingText || 'Waiting for AI response...'}
                                        {isGenerating && <span className="animate-pulse">▊</span>}
                                    </pre>
                                )}
                            </div>
                        )}

                        {generatedCases.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Generated Results</h3>
                                <div className="space-y-3">
                                    {generatedCases.map((testCase, index) => (
                                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700">
                                                <div className="flex items-center space-x-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={testCase.selected}
                                                        onChange={(event) => {
                                                            const nextCases = [...generatedCases];
                                                            nextCases[index].selected = event.target.checked;
                                                            setGeneratedCases(nextCases);
                                                        }}
                                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                                                    />
                                                    <span className="font-medium text-gray-900 dark:text-white">{testCase.title}</span>
                                                </div>
                                                <button
                                                    onClick={() => setExpandedCaseIndex(expandedCaseIndex === index ? null : index)}
                                                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                                >
                                                    {expandedCaseIndex === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            {expandedCaseIndex === index && (
                                                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-3">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{testCase.description}</p>
                                                    {testCase.steps && testCase.steps.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Steps</h4>
                                                            <div className="space-y-2">
                                                                {testCase.steps.map((step, stepIndex) => (
                                                                    <div key={stepIndex} className="flex text-sm">
                                                                        <span className="w-6 text-gray-400 dark:text-gray-500">{stepIndex + 1}.</span>
                                                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                                                            <span className="text-gray-900 dark:text-white">{step.action}</span>
                                                                            <span className="text-gray-600 dark:text-gray-400 italic">{step.expectedResult}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {testCase.area && (
                                                        <div className="mt-2">
                                                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Area: </span>
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{testCase.area}</span>
                                                        </div>
                                                    )}
                                                    {testCase.expectedResult && (
                                                        <div className="mt-2">
                                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Expected Result</h4>
                                                            <p className="text-sm text-gray-700 dark:text-gray-300">{testCase.expectedResult}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSelected}
                            disabled={generatedCases.filter((testCase) => testCase.selected).length === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Add Selected Cases
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default GeminiGenerationModal;
