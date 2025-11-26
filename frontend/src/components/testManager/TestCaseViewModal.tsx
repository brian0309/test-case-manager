
import React, { useState, useEffect } from 'react';
import { TestCase, Priority, Status } from '../../types/testManager';
import { X, Edit2, ChevronDown } from 'lucide-react';

interface TestCaseViewModalProps {
    testCase: TestCase;
    testCases: TestCase[];
    onClose: () => void;
    onEdit: (testCase: TestCase) => void;
    onUpdate?: (updatedCase: TestCase) => void;
    onNavigate?: (index: number) => void;
}


const TestCaseViewModal: React.FC<TestCaseViewModalProps> = ({ testCase, testCases, onClose, onEdit, onUpdate, onNavigate }) => {
    const [localCase, setLocalCase] = useState<TestCase>(testCase);
    const currentIndex = testCases.findIndex(tc => tc.id === testCase.id);

    // Update local state when testCase prop changes
    useEffect(() => {
        setLocalCase(testCase);
    }, [testCase]);

    // Auto-save changes
    const handlePriorityChange = (priority: Priority) => {
        const updated = { ...localCase, priority };
        setLocalCase(updated);
        onUpdate?.(updated);
    };

    const handleStatusChange = (status: Status) => {
        const updated = { ...localCase, status, lastModified: new Date().toISOString() };
        setLocalCase(updated);
        onUpdate?.(updated);
    };

    const getStatusColor = (status: Status) => {
        switch (status) {
            case Status.Passed: return 'text-green-700 bg-green-50 border-green-200';
            case Status.PassFixed: return 'text-teal-700 bg-teal-50 border-teal-200';
            case Status.Failed: return 'text-red-700 bg-red-50 border-red-200';
            case Status.Retest: return 'text-yellow-700 bg-yellow-50 border-yellow-200';
            case Status.Skipped: return 'text-gray-500 bg-gray-50 border-gray-200';
            case Status.Draft: return 'text-gray-500 bg-gray-50 border-gray-200';
            default: return 'text-gray-700 bg-gray-50 border-gray-200';
        }
    };

    const getPriorityColor = (priority: Priority) => {
        switch (priority) {
            case Priority.Low: return 'text-blue-700 bg-blue-50 border-blue-200';
            case Priority.Medium: return 'text-yellow-700 bg-yellow-50 border-yellow-200';
            case Priority.High: return 'text-orange-700 bg-orange-50 border-orange-200';
            case Priority.Critical: return 'text-red-700 bg-red-50 border-red-200';
            default: return 'text-gray-700 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-[scaleIn_0.2s_ease-out]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{testCase.id}</span>
                        <span className="text-xs text-gray-400">View Mode</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEdit(testCase)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-1.5"
                            title="Edit Test Case"
                        >
                            <Edit2 className="h-4 w-4" />
                            Edit
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mb-8">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Title</label>
                        <h1 className="text-2xl font-semibold text-gray-900">{testCase.title}</h1>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        {/* Assignee */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Assignee</label>
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50/50 border border-transparent">
                                <img src={testCase.assignedTester.avatar} className="h-6 w-6 rounded-full" alt="avatar" />
                                <span className="text-sm text-gray-700 font-medium">{testCase.assignedTester.name}</span>
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
                            <div className="relative">
                                <select
                                    value={localCase.priority}
                                    onChange={(e) => handlePriorityChange(e.target.value as Priority)}
                                    className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getPriorityColor(localCase.priority)}`}
                                >
                                    {Object.values(Priority).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none opacity-50" />
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</label>
                            <div className="relative">
                                <select
                                    value={localCase.status}
                                    onChange={(e) => handleStatusChange(e.target.value as Status)}
                                    className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getStatusColor(localCase.status)}`}
                                >
                                    {Object.values(Status).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none opacity-50" />
                            </div>
                        </div>
                    </div>

                    {/* Page/Area */}
                    {testCase.area && (
                        <div className="mb-8">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Page / Area</label>
                            <div className="text-sm font-medium text-gray-700 py-2 border-b border-gray-200">
                                {testCase.area}
                            </div>
                        </div>
                    )}

                    {/* Test Steps */}
                    <div className="mb-8">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Test Steps</label>
                        {testCase.stepsContent ? (
                            <div
                                className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4 border border-gray-200"
                                dangerouslySetInnerHTML={{ __html: testCase.stepsContent }}
                            />
                        ) : testCase.steps.length > 0 ? (
                            <div className="space-y-3">
                                {testCase.steps.map((step, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm text-gray-900"><strong>Action:</strong> {step.action}</p>
                                                <p className="text-sm text-gray-600"><em>Expected:</em> {step.expectedResult}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No steps defined</p>
                        )}
                    </div>

                    {/* Expected Result */}
                    {testCase.expectedResult && (
                        <div className="mb-8">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Expected Result (Summary)</label>
                            <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-200 whitespace-pre-wrap">
                                {testCase.expectedResult}
                            </div>
                        </div>
                    )}

                    {/* Comments */}
                    {testCase.comments && (
                        <div className="mb-2">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Comments</label>
                            <div
                                className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4 border border-gray-200"
                                dangerouslySetInnerHTML={{ __html: testCase.comments }}
                            />
                        </div>
                    )}

                    {/* Last Modified Info */}
                    {testCase.lastModified && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                                Last modified: {new Date(testCase.lastModified).toLocaleString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                })}
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <div>
                        <button
                            onClick={() => onNavigate && onNavigate(currentIndex - 1)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                            disabled={currentIndex <= 0}
                        >
                            Previous
                        </button>
                    </div>
                    <div>
                        <button
                            onClick={() => onNavigate && onNavigate(currentIndex + 1)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                            disabled={currentIndex === -1 || currentIndex >= testCases.length - 1}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestCaseViewModal;
