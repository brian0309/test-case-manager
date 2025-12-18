
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTestManagerStore } from '../../store/testManagerStore';
import { TestCase, Priority, Status, HistoryEntry, CustomFieldDefinition } from '../../types/testManager';
import { X, Plus, ChevronDown, History, Check, Loader2, Cloud } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TestCaseModalProps {
    testCase: TestCase | null;
    availableAreas: string[];
    onClose: () => void;
    onSave: (updatedCase: TestCase) => Promise<TestCase | void>;
    // Called when user wants to go back to view mode (passes current edited case)
    onBack?: (updatedCase: TestCase) => void;
}

const TestCaseModal: React.FC<TestCaseModalProps> = ({ testCase, availableAreas, onClose, onSave, onBack }) => {
    const [localCase, setLocalCase] = useState<TestCase | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    // Track selected field preview for each history entry
    const [selectedPreview, setSelectedPreview] = useState<{ entryId: string; field: string } | null>(null);

    // Track if this is initial load vs user edit
    const isInitialLoad = useRef(true);
    const hasUnsavedChanges = useRef(false);
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedCaseRef = useRef<string | null>(null);

    // Store access for projects/suites selection
    const { projects, testSuites, fetchTestSuites, fetchProjectSettings, projectSettings } = useTestManagerStore();

    // Project settings
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
    const [hiddenFields, setHiddenFields] = useState<any>({});

    // Load project settings when project changes
    useEffect(() => {
        if (localCase?.projectId) {
            const loadSettings = async () => {
                try {
                    await fetchProjectSettings(localCase.projectId);
                    const settings = projectSettings[localCase.projectId];
                    if (settings?.testCases) {
                        setCustomFields(settings.testCases.customFields || []);
                        setHiddenFields(settings.testCases.hiddenDefaultFields || {});
                    }
                } catch (err) {
                    console.error('Failed to load project settings:', err);
                }
            };
            loadSettings();
        }
    }, [localCase?.projectId, fetchProjectSettings]);

    // Combobox state
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
    const areaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalCase(testCase);
        isInitialLoad.current = true;
        hasUnsavedChanges.current = false;
        setSaveStatus('idle');
        lastSavedCaseRef.current = testCase ? JSON.stringify(testCase) : null;
    }, [testCase]);

    // Perform save
    const performSave = useCallback(async (caseToSave: TestCase) => {
        // Check if there are actual changes
        const currentJson = JSON.stringify(caseToSave);
        if (currentJson === lastSavedCaseRef.current) {
            return; // No changes to save
        }

        setSaveStatus('saving');
        setError(null);
        try {
            const result = await onSave(caseToSave);
            // If a new case was created, update localCase with the real ID
            if (result && caseToSave.id.startsWith('new-')) {
                setLocalCase(prev => prev ? { ...prev, id: result.id } : null);
                lastSavedCaseRef.current = JSON.stringify({ ...caseToSave, id: result.id });
            } else {
                lastSavedCaseRef.current = currentJson;
            }
            hasUnsavedChanges.current = false;
            setSaveStatus('saved');
            // Reset to idle after showing "Saved" for 2 seconds
            if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
            savedTimeoutRef.current = setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (err: any) {
            setSaveStatus('error');
            setError(err?.message || 'Failed to save changes');
        }
    }, [onSave]);

    // Save on blur (when field loses focus)
    const handleFieldBlur = useCallback(() => {
        if (localCase && hasUnsavedChanges.current) {
            performSave(localCase);
        }
    }, [localCase, performSave]);

    // Track changes (mark as dirty but don't save immediately)
    useEffect(() => {
        // Skip initial load
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }

        if (!localCase) return;

        // Mark as having unsaved changes
        hasUnsavedChanges.current = true;
    }, [localCase]);

    // Periodic auto-save every 15 seconds (for safety)
    useEffect(() => {
        autoSaveIntervalRef.current = setInterval(() => {
            if (localCase && hasUnsavedChanges.current) {
                performSave(localCase);
            }
        }, 15000); // 15 seconds

        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
            }
        };
    }, [localCase, performSave]);

    // Cleanup timeouts on unmount and save any pending changes
    useEffect(() => {
        return () => {
            if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
            if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
                setIsAreaDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!testCase || !localCase) return null;

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalCase(prev => prev ? ({ ...prev, title: e.target.value }) : null);
    };

    const handleExpectedResultChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalCase(prev => prev ? ({ ...prev, expectedResult: e.target.value }) : null);
    };

    const handleTestDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalCase(prev => prev ? ({ ...prev, testDescription: e.target.value }) : null);
    };

    const handleRestoreFromHistory = (historyEntry: HistoryEntry) => {
        if (!localCase) return;

        // Restore the snapshot from history
        setLocalCase(prev => prev ? ({
            ...prev,
            ...historyEntry.snapshot,
            id: prev.id, // Keep the same ID
        }) : null);

        // Clear any selected preview
        setSelectedPreview(null);
    };

    // Helper to get display value for a snapshot field
    const getSnapshotFieldValue = (snapshot: Partial<TestCase>, field: string): string => {
        const key = field.toLowerCase() as keyof TestCase;
        const value = snapshot[key];
        if (value === undefined || value === null) return 'Not set';
        if (typeof value === 'string') {
            // For HTML content, strip tags for preview
            if (key === 'stepsContent' || key === 'comments') {
                const stripped = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                return stripped.length > 100 ? stripped.slice(0, 100) + '...' : stripped || 'Empty';
            }
            return value || 'Empty';
        }
        if (typeof value === 'object' && 'name' in value) {
            return (value as any).name; // For Tester objects
        }
        return String(value);
    };

    // Filter areas for dropdown
    const filteredAreas = availableAreas.filter(a =>
        a.toLowerCase().includes((localCase.area || '').toLowerCase())
    );

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
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full h-full sm:h-auto sm:max-w-6xl bg-white sm:rounded-2xl shadow-2xl flex flex-col sm:flex-row sm:max-h-[90vh] animate-[scaleIn_0.2s_ease-out]">
                {/* Main Content Wrapper */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            {localCase.id.startsWith('new-') ? (
                                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">New Case</span>
                            ) : (
                                <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{localCase.id}</span>
                            )}
                            {/* Auto-save status indicator */}
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                                {saveStatus === 'saving' && (
                                    <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Saving...
                                    </span>
                                )}
                                {saveStatus === 'saved' && (
                                    <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-full animate-in fade-in duration-200">
                                        <Check className="h-3 w-3" />
                                        Saved
                                    </span>
                                )}
                                {saveStatus === 'error' && (
                                    <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                        Save failed
                                    </span>
                                )}
                                {saveStatus === 'idle' && (
                                    <span className="flex items-center gap-1.5 text-gray-400">
                                        <Cloud className="h-3.5 w-3.5" />
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${showHistory
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-200'
                                    }`}
                                title="View History"
                            >
                                <History className="h-4 w-4" />
                                History
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
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                        <div className="mb-8">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Title</label>
                            <input
                                type="text"
                                value={localCase.title}
                                onChange={handleTitleChange}
                                onBlur={handleFieldBlur}
                                className="w-full text-2xl font-semibold text-gray-900 border border-gray-200 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-300 bg-white"
                                placeholder="Test Case Title"
                            />
                        </div>
                        {/* Project & Suite selectors - Always visible */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Project</label>
                                <select
                                    value={localCase.projectId || ''}
                                    onChange={(e) => {
                                        const projectId = e.target.value;
                                        setLocalCase(prev => prev ? ({ ...prev, projectId, suite: '' }) : null);
                                        if (projectId) fetchTestSuites?.(projectId);
                                    }}
                                    onBlur={handleFieldBlur}
                                    className="w-full rounded-lg py-2 px-3 text-sm font-medium border bg-white"
                                >
                                    <option value="">Select project...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Test Suite</label>
                                <select
                                    value={localCase.suite || ''}
                                    onChange={(e) => setLocalCase(prev => prev ? ({ ...prev, suite: e.target.value }) : null)}
                                    onBlur={handleFieldBlur}
                                    className="w-full rounded-lg py-2 px-3 text-sm font-medium border bg-white"
                                >
                                    <option value="">Select suite...</option>
                                    {testSuites.filter(s => s.projectId === localCase.projectId).map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                            {/* Assignee */}
                            {!hiddenFields.assignedTester && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Assignee</label>
                                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50/50 border border-transparent">
                                        <img src={localCase.assignedTester.avatar} className="h-6 w-6 rounded-full" alt="avatar" />
                                        <span className="text-sm text-gray-700 font-medium">{localCase.assignedTester.name}</span>
                                    </div>
                                </div>
                            )}

                            {/* Priority (Editable) */}
                            {!hiddenFields.priority && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
                                <div className="relative">
                                    <select
                                        value={localCase.priority}
                                        onChange={(e) => setLocalCase(prev => prev ? ({ ...prev, priority: e.target.value as Priority }) : null)}
                                        onBlur={handleFieldBlur}
                                        className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getPriorityColor(localCase.priority)}`}
                                    >
                                        {Object.values(Priority).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none opacity-50" />
                                </div>
                                </div>
                            )}

                            {/* Status (Editable) */}
                            {!hiddenFields.status && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</label>
                                <div className="relative">
                                    <select
                                        value={localCase.status}
                                        onChange={(e) => setLocalCase(prev => prev ? ({ ...prev, status: e.target.value as Status }) : null)}
                                        onBlur={handleFieldBlur}
                                        className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getStatusColor(localCase.status)}`}
                                    >
                                        {Object.values(Status).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none opacity-50" />
                                </div>
                                </div>
                            )}
                        </div>

                        {/* Searchable Page/Area Input - Moved below grid */}
                        {!hiddenFields.area && (
                            <div className="mb-8">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Page / Area</label>
                            <div className="relative" ref={areaRef}>
                                <div className="flex items-center gap-2">
                                    <div className="relative w-full group">
                                        <input
                                            type="text"
                                            value={localCase.area || ''}
                                            onChange={(e) => {
                                                setLocalCase(prev => prev ? ({ ...prev, area: e.target.value }) : null);
                                                setIsAreaDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsAreaDropdownOpen(true)}
                                            onBlur={() => {
                                                // Delay to allow dropdown click to register
                                                setTimeout(() => {
                                                    setIsAreaDropdownOpen(false);
                                                    handleFieldBlur();
                                                }, 150);
                                            }}
                                            placeholder="Select or type..."
                                            className="w-full text-sm font-medium text-gray-700 border-b border-gray-200 focus:border-blue-500 pb-1.5 focus:ring-0 placeholder:text-gray-300 bg-transparent outline-none pr-6 transition-all"
                                        />
                                        <ChevronDown className="absolute right-0 top-0 h-4 w-4 text-gray-300 group-hover:text-gray-500 pointer-events-none transition-colors" />
                                    </div>

                                    <button
                                        onClick={() => {
                                            setLocalCase(prev => prev ? ({ ...prev, area: '' }) : null);
                                            setIsAreaDropdownOpen(true);
                                        }}
                                        className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        title="New / Clear"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Dropdown Menu */}
                                {isAreaDropdownOpen && (
                                    <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        <div className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar">
                                            {filteredAreas.length === 0 ? (
                                                <div className="px-4 py-3 text-xs text-gray-400 italic text-center">
                                                    Type to create "{localCase.area}"
                                                </div>
                                            ) : (
                                                filteredAreas.map(area => (
                                                    <button
                                                        key={area}
                                                        onClick={() => {
                                                            setLocalCase(prev => prev ? ({ ...prev, area: area }) : null);
                                                            setIsAreaDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between group/item"
                                                    >
                                                        <span>{area}</span>
                                                        {localCase.area === area && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            </div>
                        )}
                        
                        {/* Test Description (between Page/Area and Steps) */}
                        {!hiddenFields.testDescription && (
                            <div className="mb-2">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Test Description</label>
                            <textarea
                                value={localCase.testDescription || ''}
                                onChange={handleTestDescriptionChange}
                                onBlur={handleFieldBlur}
                                className="w-full text-sm text-gray-700 bg-gray-50 border-transparent rounded-lg focus:border-blue-300 focus:bg-white focus:ring-0 p-3 transition-colors resize-none"
                                rows={3}
                                placeholder="Short description of what this test verifies"
                            />
                            </div>
                        )}

                        {!hiddenFields.stepsContent && (
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Test Steps</label>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                        <span className="font-bold">Error:</span> {error}
                                    </div>
                                )}

                                <div className="mb-8">
                                    <RichTextEditor
                                        content={localCase.stepsContent || ''}
                                        onChange={(html) => setLocalCase(prev => prev ? ({ ...prev, stepsContent: html }) : null)}
                                        onBlur={handleFieldBlur}
                                        placeholder="Describe the test steps here. You can use lists, bold text, etc."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Moved Expected Result to bottom */}
                        {!hiddenFields.expectedResult && (
                            <div className="mb-2">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Expected Result (Summary)</label>
                            <textarea
                                value={localCase.expectedResult || ''}
                                onChange={handleExpectedResultChange}
                                onBlur={handleFieldBlur}
                                className="w-full text-sm text-gray-700 bg-gray-50 border-transparent rounded-lg focus:border-blue-300 focus:bg-white focus:ring-0 p-3 transition-colors resize-none"
                                rows={3}
                                placeholder="What is the high-level expected outcome of this test case?"
                            />
                            </div>
                        )}

                        {/* Comments Section */}
                        {!hiddenFields.comments && (
                            <div className="mb-2">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Comments</label>
                            <RichTextEditor
                                content={localCase.comments || ''}
                                onChange={(html) => setLocalCase(prev => prev ? ({ ...prev, comments: html }) : null)}
                                onBlur={handleFieldBlur}
                                placeholder="Add comments, notes, or additional information about this test case..."
                            />
                            </div>
                        )}

                        {/* Custom Fields */}
                        {customFields.filter(f => !f.deleted).length > 0 && (
                            <div className="mt-8 space-y-6">
                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Custom Fields</h3>
                                    {customFields.filter(f => !f.deleted).map((field) => {
                                        const value = localCase.customFields?.[field.id] || '';
                                        return (
                                            <div key={field.id} className="mb-6">
                                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                    {field.label}
                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                {field.type === 'text' && (
                                                    <input
                                                        type="text"
                                                        value={value}
                                                        onChange={(e) => {
                                                            setLocalCase(prev => prev ? ({
                                                                ...prev,
                                                                customFields: { ...(prev.customFields || {}), [field.id]: e.target.value }
                                                            }) : null);
                                                        }}
                                                        onBlur={handleFieldBlur}
                                                        className="w-full text-sm text-gray-700 bg-gray-50 border-transparent rounded-lg focus:border-blue-300 focus:bg-white focus:ring-0 p-3 transition-colors"
                                                        placeholder={`Enter ${field.label.toLowerCase()}`}
                                                    />
                                                )}
                                                {field.type === 'long_text' && (
                                                    <textarea
                                                        value={value}
                                                        onChange={(e) => {
                                                            setLocalCase(prev => prev ? ({
                                                                ...prev,
                                                                customFields: { ...(prev.customFields || {}), [field.id]: e.target.value }
                                                            }) : null);
                                                        }}
                                                        onBlur={handleFieldBlur}
                                                        className="w-full text-sm text-gray-700 bg-gray-50 border-transparent rounded-lg focus:border-blue-300 focus:bg-white focus:ring-0 p-3 transition-colors resize-none"
                                                        rows={4}
                                                        placeholder={`Enter ${field.label.toLowerCase()}`}
                                                    />
                                                )}
                                                {field.type === 'dropdown' && (
                                                    <select
                                                        value={value}
                                                        onChange={(e) => {
                                                            setLocalCase(prev => prev ? ({
                                                                ...prev,
                                                                customFields: { ...(prev.customFields || {}), [field.id]: e.target.value }
                                                            }) : null);
                                                        }}
                                                        onBlur={handleFieldBlur}
                                                        className="w-full rounded-lg py-2 px-3 text-sm font-medium border bg-white"
                                                    >
                                                        <option value="">Select {field.label.toLowerCase()}...</option>
                                                        {(field.options || []).map(opt => (
                                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {field.type === 'wysiwyg' && (
                                                    <RichTextEditor
                                                        content={value}
                                                        onChange={(html) => {
                                                            setLocalCase(prev => prev ? ({
                                                                ...prev,
                                                                customFields: { ...(prev.customFields || {}), [field.id]: html }
                                                            }) : null);
                                                        }}
                                                        onBlur={handleFieldBlur}
                                                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Modal Footer */}
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
                        <p className="text-xs text-gray-400">
                            Changes are saved automatically
                        </p>
                        <button
                            onClick={() => {
                                // If onBack provided, call it with current local case to return to view mode
                                if (localCase && typeof onBack === 'function') {
                                    onBack(localCase);
                                } else {
                                    onClose();
                                }
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Back
                        </button>
                    </div>
                </div>
                {/* End of Main Content Wrapper */}

                {/* History Panel */}
                {showHistory && (
                    <div className="hidden sm:flex w-80 border-l border-gray-200 bg-gray-50 flex-col overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200 bg-white">
                            <h3 className="text-sm font-semibold text-gray-900">Edit History</h3>
                            <p className="text-xs text-gray-500 mt-0.5">View and restore previous versions</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {!localCase.history || localCase.history.length === 0 ? (
                                <div className="text-center py-8">
                                    <History className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No edit history yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Changes will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {localCase.history.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={entry.user.avatar}
                                                        alt={entry.user.name}
                                                        className="h-6 w-6 rounded-full"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-900">{entry.user.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(entry.timestamp).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: 'numeric',
                                                                minute: '2-digit',
                                                                hour12: true
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {entry.changedFields.length > 0 && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-gray-500 mb-1">Changed:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {entry.changedFields.map((field) => (
                                                            <button
                                                                key={field}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedPreview(
                                                                        selectedPreview?.entryId === entry.id && selectedPreview?.field === field
                                                                            ? null
                                                                            : { entryId: entry.id, field }
                                                                    );
                                                                }}
                                                                className={`inline-block px-2 py-0.5 text-xs rounded-md font-medium transition-colors cursor-pointer border ${selectedPreview?.entryId === entry.id && selectedPreview?.field === field
                                                                    ? 'bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-200'
                                                                    : 'bg-blue-50 text-blue-700 border-transparent hover:bg-blue-100 hover:border-blue-200'
                                                                    }`}
                                                            >
                                                                {field}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Field value preview */}
                                                    {selectedPreview?.entryId === entry.id && (
                                                        <div className="mt-2 p-2 bg-gray-100 rounded-md border border-gray-200 animate-in fade-in slide-in-from-top-1 duration-150">
                                                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                                                {selectedPreview.field} value:
                                                            </p>
                                                            <p className="text-xs text-gray-700 break-words">
                                                                {getSnapshotFieldValue(entry.snapshot, selectedPreview.field)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleRestoreFromHistory(entry)}
                                                className="w-full mt-2 px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-xs font-medium rounded-md transition-colors border border-gray-200 hover:border-blue-200"
                                            >
                                                Restore this version
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestCaseModal;
