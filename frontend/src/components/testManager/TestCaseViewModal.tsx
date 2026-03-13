
import React, { useState, useEffect, useCallback } from 'react';
import { TestCase, Priority, Status, CustomFieldDefinition } from '../../types/testManager';
import { X, Edit2, ChevronDown, Share2 } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';
import RichTextEditor from './RichTextEditor';
import toast from 'react-hot-toast';
import { useCollaborativeEditing } from '../../hooks/useCollaborativeEditing';
import { socketService, SocketEvents } from '../../services/socket';
import IdDisplay from './IdDisplay';
import DiscussionPanel from './DiscussionPanel';

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

    // Project settings for custom fields
    const { fetchProjectSettings, projectSettings } = useTestManagerStore();
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);

    // Handle remote field updates from collaborative editing
    const handleRemoteFieldUpdate = useCallback((fieldName: string, value: string | number | boolean | null) => {
        setLocalCase(prev => {
            // Handle nested custom fields
            if (fieldName.startsWith('customFields.')) {
                const fieldId = fieldName.replace('customFields.', '');
                return {
                    ...prev,
                    customFields: { ...(prev.customFields || {}), [fieldId]: String(value ?? '') }
                };
            }
            // Handle regular fields
            return { ...prev, [fieldName]: value };
        });
    }, []);

    // Collaborative editing - receive real-time updates from other users
    const { collaboratingUsers, emitFieldChange, remoteEditingField, isCollaborating } = useCollaborativeEditing({
        testCase: testCase,
        onFieldUpdate: handleRemoteFieldUpdate,
    });

    // Subscribe to testcase:updated socket events for real-time sync
    // This updates localCase when another user saves changes via API
    useEffect(() => {
        const handleTestCaseUpdated = (data: SocketEvents['testcase:updated']) => {
            // Only update if it's for this specific test case
            if (data.testCase?.id === testCase.id) {
                setLocalCase(data.testCase);
            }
        };

        socketService.on('testcase:updated', handleTestCaseUpdated);

        return () => {
            socketService.off('testcase:updated', handleTestCaseUpdated);
        };
    }, [testCase.id]);

    // Update local state when testCase prop changes
    useEffect(() => {
        setLocalCase(testCase);
    }, [testCase]);

    // Load project settings when test case changes
    useEffect(() => {
        if (testCase?.projectId) {
            const loadSettings = async () => {
                try {
                    await fetchProjectSettings(testCase.projectId);
                } catch (err: unknown) {
                    console.error('Failed to load project settings:', err);
                }
            };
            loadSettings();
        }
    }, [testCase?.projectId, fetchProjectSettings]);

    // Separate effect to update custom fields when projectSettings changes
    useEffect(() => {
        if (testCase?.projectId) {
            const settings = projectSettings[testCase.projectId];
            const fields = settings?.testCases?.customFields;
            if (fields) {
                setCustomFields(fields);
            }
        }
    }, [testCase?.projectId, projectSettings]);

    // Auto-save changes with real-time socket broadcast
    const handlePriorityChange = (priority: Priority) => {
        const updated = { ...localCase, priority };
        setLocalCase(updated);
        onUpdate?.(updated);
        // Emit for immediate real-time sync to other users viewing this test case
        emitFieldChange('priority', priority);
    };

    const handleStatusChange = (status: Status) => {
        const updated = { ...localCase, status, lastModified: new Date().toISOString() };
        setLocalCase(updated);
        onUpdate?.(updated);
        // Emit for immediate real-time sync to other users viewing this test case
        emitFieldChange('status', status);
    };

    const getStatusColor = (status: Status) => {
        switch (status) {
            case Status.Passed: return 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
            case Status.PassFixed: return 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800';
            case Status.Failed: return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
            case Status.Retest: return 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
            case Status.Skipped: return 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
            case Status.Draft: return 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
            case Status.ReadyForTesting: return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
            case Status.InProgress: return 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800';
            case Status.Blocked: return 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
            case Status.OutOfScope: return 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800';
            default: return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        }
    };

    const getPriorityColor = (priority: Priority) => {
        switch (priority) {
            case Priority.Low: return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
            case Priority.Medium: return 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
            case Priority.High: return 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
            case Priority.Critical: return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
            default: return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        }
    };

    const handleShareClick = async () => {
        const shareUrl = `${window.location.origin}/test-manager/cases?testCaseId=${testCase.id}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard');
        } catch {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success('Link copied to clipboard');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full h-full sm:h-auto sm:max-w-7xl bg-white dark:bg-gray-800 sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-[scaleIn_0.2s_ease-out]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <IdDisplay
                            id={testCase.id}
                            className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md"
                        />
                        <span className="text-xs text-gray-400 dark:text-gray-500">View Mode</span>
                        {/* Real-time editing indicator */}
                        {isCollaborating && collaboratingUsers.length > 0 && (
                            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                                <div className="flex -space-x-2">
                                    {collaboratingUsers.slice(0, 3).map((u) => (
                                        <div
                                            key={u.id}
                                            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-gray-800"
                                            title={u.name}
                                        >
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                    {remoteEditingField ? (
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                            {remoteEditingField.userName} is editing
                                        </span>
                                    ) : (
                                        `${collaboratingUsers.length} ${collaboratingUsers.length === 1 ? 'viewer' : 'viewers'}`
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShareClick}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5"
                            title="Copy link to clipboard"
                        >
                            <Share2 className="h-4 w-4" />
                            Share
                        </button>
                        <button
                            onClick={() => onEdit(localCase)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-1.5"
                            title="Edit Test Case"
                        >
                            <Edit2 className="h-4 w-4" />
                            Edit
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content area: main content + discussion panel side by side */}
                <div className="relative flex-1 min-h-0 lg:flex lg:overflow-hidden overflow-y-auto">
                    {/* Main Content */}
                    <div className="flex-1 min-h-0 p-4 md:p-6 lg:overflow-y-auto">
                        <div className="mb-5">
                            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
                            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{localCase.title}</h1>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                            {/* Assignee */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Assignee</label>
                                <div className="flex items-center gap-3 p-1.5 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-transparent">
                                    <img src={localCase.assignedTester.avatar} className="h-6 w-6 rounded-full" alt="avatar" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{localCase.assignedTester.name}</span>
                                </div>
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
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
                                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                                <div className="relative">
                                    <select
                                        value={localCase.status}
                                        onChange={(e) => handleStatusChange(e.target.value as Status)}
                                        className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getStatusColor(localCase.status)}`}
                                    >
                                        {Object.values(Status).map(s => {
                                            // Hide "Passed" option when current status is "Failed"
                                            if (s === Status.Passed && localCase.status === Status.Failed) {
                                                return null;
                                            }
                                            return <option key={s} value={s}>{s}</option>;
                                        })}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* Page/Area */}
                        {localCase.area && (
                            <div className="mb-5">
                                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Page / Area</label>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2 border-b border-gray-200 dark:border-gray-700/80">
                                    {localCase.area}
                                </div>
                            </div>
                        )}

                        {/* Test Description */}
                        {localCase.testDescription && (
                            <div className="mb-5">
                                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Test Description</label>
                                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700/80 whitespace-pre-wrap">
                                    {localCase.testDescription}
                                </div>
                            </div>
                        )}

                        {/* Test Steps */}
                        <div className="mb-5">
                            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Test Steps</label>
                            {localCase.stepsContent ? (
                                <RichTextEditor
                                    content={localCase.stepsContent}
                                    onChange={() => { }}
                                    editable={false}
                                />
                            ) : (localCase.steps ?? []).length > 0 ? (
                                <div className="space-y-2">
                                    {(localCase.steps ?? []).map((step, idx) => (
                                        <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                            <div className="flex gap-3">
                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-sm text-gray-900 dark:text-gray-100"><strong>Action:</strong> {step.action}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400"><em>Expected:</em> {step.expectedResult}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No steps defined</p>
                            )}
                        </div>

                        {/* Expected Result */}
                        {localCase.expectedResult && (
                            <div className="mb-5">
                                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Expected Result (Summary)</label>
                                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700/80 whitespace-pre-wrap">
                                    {localCase.expectedResult}
                                </div>
                            </div>
                        )}

                        {/* Comments */}
                        {localCase.comments && (
                            <div className="mb-2">
                                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Comments</label>
                                <RichTextEditor
                                    content={localCase.comments}
                                    onChange={() => { }}
                                    editable={false}
                                />
                            </div>
                        )}

                        {/* Custom Fields */}
                        {(() => {
                            const nonDeletedFields = customFields.filter(f => !f.deleted);
                            const fieldsWithContent = nonDeletedFields.filter((field) => {
                                const value = localCase.customFields?.[field.id] || '';
                                return value && value.trim() !== '';
                            });
                            return fieldsWithContent.length > 0 ? (
                                <div className="mt-6 space-y-4">
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                                        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Custom Fields</h3>
                                        {fieldsWithContent.map((field) => {
                                            const value = localCase.customFields?.[field.id] || '';

                                            return (
                                                <div key={field.id} className="mb-4">
                                                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                                                        {field.label}
                                                    </label>
                                                    {(field.type === 'text' || field.type === 'dropdown') && (
                                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2 border-b border-gray-200 dark:border-gray-700">
                                                            {field.type === 'dropdown'
                                                                ? (field.options?.find(opt => opt.id === value)?.label || value)
                                                                : value
                                                            }
                                                        </div>
                                                    )}
                                                    {field.type === 'long_text' && (
                                                        <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
                                                            {value}
                                                        </div>
                                                    )}
                                                    {field.type === 'wysiwyg' && (
                                                        <RichTextEditor
                                                            content={value}
                                                            onChange={() => { }}
                                                            editable={false}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        {/* Last Modified Info */}
                        {localCase.lastModified && (
                            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Last modified: {new Date(localCase.lastModified).toLocaleString('en-US', {
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

                    {/* Discussion Panel */}
                    <DiscussionPanel testCaseId={testCase.id} projectId={testCase.projectId} />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div>
                        <button
                            onClick={() => onNavigate && onNavigate(currentIndex - 1)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            disabled={currentIndex <= 0}
                        >
                            Previous
                        </button>
                    </div>
                    <div>
                        <button
                            onClick={() => onNavigate && onNavigate(currentIndex + 1)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
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
