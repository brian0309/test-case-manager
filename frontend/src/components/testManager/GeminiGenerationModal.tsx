import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronDown, ChevronUp, Loader2, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../../utils/api';
import toast from 'react-hot-toast';
import { TestCase, Status, Priority } from '../../types/testManager';
import ImagePreviewUploader from '../ImagePreviewUploader';

interface GeminiGenerationModalProps {
    onClose: () => void;
    onAddCases: (cases: TestCase[]) => void;
    projectContext: string;
    suiteContext: string;
    projectId: string;
    suiteId: string;
    existingTestCases: string[];
}

type GenerationType = 'new_case' | 'steps' | 'area' | 'expected';

interface GeneratedCase {
    title: string;
    description: string;
    preconditions: string;
    steps?: { action: string; expectedResult: string }[];
    area?: string;
    expectedResult?: string;
    selected: boolean;
}

const GeminiGenerationModal: React.FC<GeminiGenerationModalProps> = ({
    onClose,
    onAddCases,
    projectContext,
    suiteContext,
    projectId,
    suiteId,
    existingTestCases
}) => {
    const [generationType, setGenerationType] = useState<GenerationType>('new_case');
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
    
    // Streaming state
    const [streamingText, setStreamingText] = useState('');
    const [showLivePreview, setShowLivePreview] = useState(true);
    const streamingTextRef = useRef('');
    const livePreviewRef = useRef<HTMLPreElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Auto-scroll live preview to bottom
    useEffect(() => {
        if (livePreviewRef.current && showLivePreview) {
            livePreviewRef.current.scrollTop = livePreviewRef.current.scrollHeight;
        }
    }, [streamingText, showLivePreview]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    /**
     * Parse the accumulated JSON text and extract test cases
     */
    const parseStreamedJson = (text: string): GeneratedCase[] => {
        // Clean up the text - remove markdown code blocks if present
        let cleanText = text.trim();
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        
        try {
            const parsed = JSON.parse(cleanText);
            return Array.isArray(parsed) ? parsed.map((c: any) => ({ ...c, selected: true })) : [];
        } catch {
            // Try to recover truncated JSON by finding the last complete object
            if (cleanText.startsWith('[')) {
                const closingBraces: number[] = [];
                let pos = cleanText.indexOf('}');
                while (pos !== -1) {
                    closingBraces.push(pos);
                    pos = cleanText.indexOf('}', pos + 1);
                }
                
                // Try the last few closing braces
                for (let i = closingBraces.length - 1; i >= Math.max(0, closingBraces.length - 5); i--) {
                    const cutPos = closingBraces[i];
                    const recovered = cleanText.substring(0, cutPos + 1) + ']';
                    try {
                        const parsed = JSON.parse(recovered);
                        return Array.isArray(parsed) ? parsed.map((c: any) => ({ ...c, selected: true })) : [];
                    } catch {
                        // Continue trying
                    }
                }
            }
            return [];
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setStreamingText('');
        setGeneratedCases([]);
        streamingTextRef.current = '';
        
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();
        
        try {
            const response = await fetch(`${API_URL}/gemini/generate-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    context,
                    type: generationType,
                    selectedFields,
                    existingTestCases,
                    imageUrls: contextImages
                }),
                signal: abortControllerRef.current.signal
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

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                // Process SSE events (format: "data: {...}\n\n")
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.type === 'chunk') {
                                streamingTextRef.current += data.content;
                                setStreamingText(streamingTextRef.current);
                            } else if (data.type === 'done') {
                                // Parse the final result
                                const cases = parseStreamedJson(streamingTextRef.current);
                                setGeneratedCases(cases);
                            } else if (data.type === 'error') {
                                throw new Error(data.message);
                            }
                        } catch (e) {
                            if (e instanceof SyntaxError) {
                                console.warn('Failed to parse SSE data:', line);
                            } else {
                                throw e;
                            }
                        }
                    }
                }
            }

            // Handle any remaining buffer
            if (buffer.startsWith('data: ')) {
                try {
                    const data = JSON.parse(buffer.slice(6));
                    if (data.type === 'chunk') {
                        streamingTextRef.current += data.content;
                        setStreamingText(streamingTextRef.current);
                    }
                } catch {
                    // Ignore incomplete data
                }
            }

            // Final parse if we haven't gotten a 'done' event
            if (generatedCases.length === 0 && streamingTextRef.current) {
                const cases = parseStreamedJson(streamingTextRef.current);
                setGeneratedCases(cases);
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                toast.error('Generation cancelled');
            } else {
                console.error('Generation error:', error);
                // Extract simplified message from error
                let errorMessage = "Failed to generate test cases";
                
                // Try to get the error message from various possible locations
                if (typeof error === 'string') {
                    errorMessage = error;
                } else if (error?.message) {
                    errorMessage = error.message;
                } else if (error?.error?.message) {
                    errorMessage = error.error.message;
                }
                
                // Limit error message length for toasts
                if (errorMessage.length > 150) {
                    errorMessage = errorMessage.substring(0, 147) + '...';
                }
                
                toast.error(errorMessage, {
                    duration: 5000
                });
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
        const selected = generatedCases.filter(c => c.selected);
        const newTestCases: TestCase[] = selected.map((c, index) => ({
            id: `gen-${Date.now()}-${index}`,
            title: c.title,
            priority: Priority.Medium,
            status: Status.Draft,
            lastModified: new Date().toISOString(),
            assignedTester: {
                id: 'u-current', // Placeholder, backend might override or frontend store handles it
                name: 'You',
                avatar: 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
            },
            suite: suiteId, // Use ID or Name? The store uses ID usually but let's check. 
            // In TestCasesPage, createTestCase takes suiteId. 
            // But the TestCase object has `suite` property which seems to be the ID or Name depending on usage.
            // Looking at `TestCase` type in `frontend/src/types/testManager.ts` (implied), it's likely a string.
            // We'll pass the suiteId here.
            projectId: projectId,
            area: c.area || '',
            steps: c.steps ? c.steps.map((s, i) => ({
                id: `step-${i}`,
                action: s.action,
                expectedResult: s.expectedResult
            })) : [],
            testDescription: c.description || (c as any).testDescription || '',
            preconditions: c.preconditions,
            expectedResult: c.expectedResult || ''
        } as any)); // Type assertion as TestCase might have more fields

        onAddCases(newTestCases);
        onClose();
    };

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
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate with AI</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Configuration */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Generation Type
                                </label>
                                <select
                                    value={generationType}
                                    onChange={(e) => setGenerationType(e.target.value as GenerationType)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
                                >
                                    <option value="new_case">New Test Cases</option>
                                    {/* Other options disabled for now as per requirement focus */}
                                    {/* <option value="steps">Test Steps Only</option> */}
                                </select>
                            </div>

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
                                        onChange={(e) => setContext(e.target.value)}
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
                                            onChange={(e) => setSelectedFields(prev => ({ ...prev, area: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Page / Area</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.steps}
                                            onChange={(e) => setSelectedFields(prev => ({ ...prev, steps: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Test Steps</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.expected}
                                            onChange={(e) => setSelectedFields(prev => ({ ...prev, expected: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Expected Result (Summary)</span>
                                    </label>
                                    {/* Test Description is required and always included; no checkbox */}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
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

                        {/* Live Preview - Streaming Output */}
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

                        {/* Results */}
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
                                                        onChange={(e) => {
                                                            const newCases = [...generatedCases];
                                                            newCases[index].selected = e.target.checked;
                                                            setGeneratedCases(newCases);
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
                                                                {testCase.steps.map((step, i) => (
                                                                    <div key={i} className="flex text-sm">
                                                                        <span className="w-6 text-gray-400 dark:text-gray-500">{i + 1}.</span>
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

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSelected}
                            disabled={generatedCases.filter(c => c.selected).length === 0}
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
