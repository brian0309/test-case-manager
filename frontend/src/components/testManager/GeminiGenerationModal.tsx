import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { API_URL } from '../../utils/api';
import axios from 'axios';
import toast from 'react-hot-toast';
import { TestCase, Status, Priority } from '../../types/testManager';

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCases, setGeneratedCases] = useState<GeneratedCase[]>([]);
    const [expandedCaseIndex, setExpandedCaseIndex] = useState<number | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await axios.post(
                `${API_URL}/gemini/generate`,
                { context, type: generationType, selectedFields, existingTestCases },
                { withCredentials: true }
            );

            if (response.data.success) {
                const cases = response.data.data.map((c: any) => ({ ...c, selected: true }));
                setGeneratedCases(cases);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to generate test cases");
        } finally {
            setIsGenerating(false);
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
                    className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-2xl bg-white sm:rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Generate with AI</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Configuration */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Generation Type
                                </label>
                                <select
                                    value={generationType}
                                    onChange={(e) => setGenerationType(e.target.value as GenerationType)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="new_case">New Test Cases</option>
                                    {/* Other options disabled for now as per requirement focus */}
                                    {/* <option value="steps">Test Steps Only</option> */}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Context
                                </label>
                                <textarea
                                    value={context}
                                    onChange={(e) => setContext(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Describe what you want to test..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Include Fields
                                </label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.area}
                                            onChange={(e) => setSelectedFields(prev => ({ ...prev, area: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Page / Area</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.steps}
                                            onChange={(e) => setSelectedFields(prev => ({ ...prev, steps: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Test Steps</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.expected}
                                            onChange={(e) => setSelectedFields(prev => ({ ...prev, expected: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Expected Result (Summary)</span>
                                    </label>
                                    {/* Test Description is required and always included; no checkbox */}
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
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
                        </div>

                        {/* Results */}
                        {generatedCases.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-medium text-gray-900">Generated Results</h3>
                                <div className="space-y-3">
                                    {generatedCases.map((testCase, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="flex items-center justify-between p-3 bg-gray-50">
                                                <div className="flex items-center space-x-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={testCase.selected}
                                                        onChange={(e) => {
                                                            const newCases = [...generatedCases];
                                                            newCases[index].selected = e.target.checked;
                                                            setGeneratedCases(newCases);
                                                        }}
                                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <span className="font-medium text-gray-900">{testCase.title}</span>
                                                </div>
                                                <button
                                                    onClick={() => setExpandedCaseIndex(expandedCaseIndex === index ? null : index)}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    {expandedCaseIndex === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            {expandedCaseIndex === index && (
                                                <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                                                    <p className="text-sm text-gray-600">{testCase.description}</p>
                                                    {testCase.steps && testCase.steps.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Steps</h4>
                                                            <div className="space-y-2">
                                                                {testCase.steps.map((step, i) => (
                                                                    <div key={i} className="flex text-sm">
                                                                        <span className="w-6 text-gray-400">{i + 1}.</span>
                                                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                                                            <span className="text-gray-900">{step.action}</span>
                                                                            <span className="text-gray-600 italic">{step.expectedResult}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {testCase.area && (
                                                        <div className="mt-2">
                                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Area: </span>
                                                            <span className="text-sm text-gray-700">{testCase.area}</span>
                                                        </div>
                                                    )}
                                                    {testCase.expectedResult && (
                                                        <div className="mt-2">
                                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expected Result</h4>
                                                            <p className="text-sm text-gray-700">{testCase.expectedResult}</p>
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
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSelected}
                            disabled={generatedCases.filter(c => c.selected).length === 0}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
