import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTestManagerStore } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import RichTextEditor from '../../components/testManager/RichTextEditor';
import ConfirmationModal from '../../components/testManager/ConfirmationModal';
import {
    TestRunListItem,
    TestRunStatus,
    RunItemStatus,
    TestRun,
    TestCase,
    TestRunGroup,
    RunItem,
} from '../../types/testManager';
import { testRunApi } from '../../services/testRunApi';
import { useRealtimeTestRuns } from '../../hooks/useRealtimeTestRuns';
import {
    Play,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Trash2,
    Copy,
    ChevronRight,
    ChevronLeft,
    Layers,
    Menu,
    Edit2,
    ArrowLeft,
    Eye,
} from 'lucide-react';
import CreateGroupModal from './components/CreateGroupModal';
import RunGroupsSidebar from '../../components/testManager/RunGroupsSidebar';
import TagInput from '../../components/testManager/TagInput';

// Status badge colors for test runs
const getRunStatusColor = (status: TestRunStatus) => {
    switch (status) {
        case TestRunStatus.Draft:
            return 'bg-gray-100 text-gray-600 border-gray-200';
        case TestRunStatus.InProgress:
            return 'bg-blue-100 text-blue-600 border-blue-200';
        case TestRunStatus.Completed:
            return 'bg-green-100 text-green-600 border-green-200';
        case TestRunStatus.Abandoned:
            return 'bg-red-100 text-red-600 border-red-200';
        default:
            return 'bg-gray-100 text-gray-600 border-gray-200';
    }
};

// Run item status colors
const getItemStatusColor = (status: RunItemStatus) => {
    switch (status) {
        case RunItemStatus.Passed:
            return 'bg-green-500';
        case RunItemStatus.Failed:
            return 'bg-red-500';
        case RunItemStatus.Blocked:
            return 'bg-orange-500';
        case RunItemStatus.Skipped:
            return 'bg-gray-400';
        case RunItemStatus.NotRun:
        default:
            return 'bg-gray-200';
    }
};

// Create Test Run Modal
const generateSuiteTitle = (suiteName: string) => {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${suiteName} - ${month}-${day}-${year} ${hours}:${minutes}`;
};

interface CreateRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (title: string, description: string, caseIds: string[], groupId?: string, tags?: string[]) => Promise<void>;
    testCases: TestCase[];
    testSuites: { id: string; name: string }[];
    testRunGroups: TestRunGroup[];
    selectedCases: string[];
    onToggleCase: (caseId: string) => void;
    onSelectAll: (selectAll: boolean, filteredCases: TestCase[]) => void;
    tagSuggestions: string[];
    initialTitle?: string;
}

const CreateRunModal: React.FC<CreateRunModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    testCases,
    testSuites,
    testRunGroups,
    selectedCases,
    onToggleCase,
    onSelectAll,
    tagSuggestions,
    initialTitle,
}) => {
    const [title, setTitle] = useState(initialTitle ?? '');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSuiteFilter, setSelectedSuiteFilter] = useState<string>('all');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);

    // Filter test cases by selected suite
    const filteredTestCases = selectedSuiteFilter === 'all'
        ? testCases
        : testCases.filter(tc => tc.suiteId === selectedSuiteFilter);

    // Sync title and reset state when modal opens or closes
    useEffect(() => {
        if (isOpen) {
            setTitle(initialTitle ?? '');
        } else {
            setTitle('');
            setDescription('');
            setSelectedSuiteFilter('all');
            setSelectedGroupId('');
            setTags([]);
        }
    }, [isOpen, initialTitle]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('Please enter a title');
            return;
        }
        if (selectedCases.length === 0) {
            toast.error('Please select at least one test case');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(title, description, selectedCases, selectedGroupId || undefined, tags.length > 0 ? tags : undefined);
            setTitle(initialTitle ?? '');
            setDescription('');
            setSelectedSuiteFilter('all');
            setSelectedGroupId('');
            setTags([]);
            onClose();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to create test run');
        } finally {
            setIsSubmitting(false);
        }
    };

    const allFilteredSelected = filteredTestCases.length > 0 && filteredTestCases.every(tc => selectedCases.includes(tc.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create Test Run</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Sprint 23 Regression"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description..."
                            rows={2}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>

                    {/* Test Run Group & Suite Filter - Same Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group (Optional)</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">No Group</option>
                                {testRunGroups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Suite</label>
                            <select
                                value={selectedSuiteFilter}
                                onChange={(e) => setSelectedSuiteFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                            >
                                <option value="all">All Suites</option>
                                {testSuites.map((suite) => (
                                    <option key={suite.id} value={suite.id}>
                                        {suite.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                        <TagInput
                            tags={tags}
                            onChange={setTags}
                            suggestions={tagSuggestions}
                            placeholder="e.g., regression, smoke, sprint-23"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select Test Cases ({selectedCases.length} selected)
                            </label>
                            <button
                                onClick={() => onSelectAll(!allFilteredSelected, filteredTestCases)}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                {allFilteredSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                            {filteredTestCases.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                    No test cases available
                                </div>
                            ) : (
                                filteredTestCases.map((tc) => (
                                    <label
                                        key={tc.id}
                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCases.includes(tc.id)}
                                            onChange={() => onToggleCase(tc.id)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tc.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{tc.suite}</div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Run'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Edit Test Run Modal - for changing group assignment
interface EditTestRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    testRun: TestRunListItem | null;
    testRunGroups: TestRunGroup[];
    onSubmit: (runId: string, data: { title: string; groupId: string | null; tags: string[] }) => Promise<void>;
    tagSuggestions: string[];
}

const EditTestRunModal: React.FC<EditTestRunModalProps> = ({
    isOpen,
    onClose,
    testRun,
    testRunGroups,
    onSubmit,
    tagSuggestions,
}) => {
    const [title, setTitle] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (testRun) {
            setTitle(testRun.title);
            setSelectedGroupId(testRun.groupId || '');
            setTags(testRun.tags || []);
        }
    }, [testRun]);

    if (!isOpen || !testRun) return null;

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(testRun.id, {
                title: title.trim(),
                groupId: selectedGroupId || null,
                tags,
            });
            onClose();
        } catch {
            // Error handled by parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Test Run</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Run Group</label>
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">No Group (Ungrouped)</option>
                            {testRunGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                        <TagInput
                            tags={tags}
                            onChange={setTags}
                            suggestions={tagSuggestions}
                            placeholder="e.g., regression, smoke, sprint-23"
                        />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Execute Run Modal (single-case focus view)
interface ExecuteRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    testRun: TestRun | null;
    onUpdateItem: (itemId: string, status: RunItemStatus, actualResult?: string) => Promise<void>;
    onComplete: () => Promise<void>;
    startIndex?: number;
}

const ExecuteRunModal: React.FC<ExecuteRunModalProps> = ({
    isOpen,
    onClose,
    testRun,
    onUpdateItem,
    onComplete,
    startIndex = 0,
}) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [actualResult, setActualResult] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Reset index when modal opens with a new startIndex
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(startIndex);
        }
    }, [isOpen, startIndex]);

    useEffect(() => {
        if (testRun && testRun.items[currentIndex]) {
            setActualResult(testRun.items[currentIndex].actualResult || '');
        }
    }, [testRun, currentIndex]);

    if (!isOpen || !testRun) return null;

    const currentItem = testRun.items[currentIndex];
    const totalItems = testRun.items.length;
    const executedCount = testRun.items.filter(i => i.status !== RunItemStatus.NotRun).length;

    const handleStatusUpdate = async (status: RunItemStatus) => {
        setIsUpdating(true);
        try {
            await onUpdateItem(currentItem.id, status, actualResult);
            // Move to next item if not last
            if (currentIndex < totalItems - 1) {
                setCurrentIndex(currentIndex + 1);
                setActualResult('');
            }
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleComplete = async () => {
        try {
            await onComplete();
            toast.success('Test run completed!');
            onClose();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to complete run');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                        <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">{testRun.title}</h2>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Progress: {executedCount} / {totalItems} ({Math.round((executedCount / totalItems) * 100)}%)
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 dark:bg-gray-700 flex">
                    {testRun.items.map((item, idx) => (
                        <div
                            key={item.id}
                            className={`flex-1 ${getItemStatusColor(item.status)} ${idx === currentIndex ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                            style={{ cursor: 'pointer' }}
                        />
                    ))}
                </div>

                {/* Current item */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Case {currentIndex + 1} of {totalItems}
                            </span>
                            <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded ${getItemStatusColor(currentItem.status)} text-white`}>
                                {currentItem.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 active:bg-gray-100 dark:active:bg-gray-700 rounded"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setCurrentIndex(Math.min(totalItems - 1, currentIndex + 1))}
                                disabled={currentIndex === totalItems - 1}
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 active:bg-gray-100 dark:active:bg-gray-700 rounded"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                        {currentItem.caseSnapshot.title}
                    </h3>

                    {currentItem.caseSnapshot.testDescription && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{currentItem.caseSnapshot.testDescription}</p>
                        </div>
                    )}

                    {currentItem.caseSnapshot.stepsContent && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Steps</h4>
                            <RichTextEditor
                                content={currentItem.caseSnapshot.stepsContent}
                                onChange={() => {}}
                                editable={false}
                            />
                        </div>
                    )}

                    {currentItem.caseSnapshot.expectedResult && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Result</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{currentItem.caseSnapshot.expectedResult}</p>
                        </div>
                    )}

                    <div className="mb-0">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actual Result / Notes</h4>
                        <RichTextEditor
                            content={actualResult}
                            onChange={setActualResult}
                            placeholder="Enter actual result or notes..."
                            editable={true}
                        />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-t border-gray-100 dark:border-gray-700">
                    {/* Mobile: Stacked layout */}
                    <div className="sm:hidden flex flex-col gap-3">
                        {/* Status buttons grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Passed)}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-green-600 rounded-lg active:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Pass
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Failed)}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-red-600 rounded-lg active:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Fail
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Blocked)}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-orange-600 rounded-lg active:bg-orange-700 disabled:opacity-50"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Blocked
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Skipped)}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        {/* Complete button */}
                        <button
                            onClick={handleComplete}
                            disabled={executedCount < totalItems}
                            className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${executedCount < totalItems
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                    : 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 active:bg-blue-50 dark:active:bg-blue-900/30'
                                }`}
                            title={executedCount < totalItems ? "Please complete all test cases before finishing the run" : ""}
                        >
                            Complete Run
                        </button>
                    </div>

                    {/* Desktop: Horizontal layout */}
                    <div className="hidden sm:flex items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Passed)}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Pass
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Failed)}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Fail
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Blocked)}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Blocked
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Skipped)}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        <button
                            onClick={handleComplete}
                            disabled={executedCount < totalItems}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${executedCount < totalItems
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                    : 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 active:bg-blue-50 dark:active:bg-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                }`}
                            title={executedCount < totalItems ? "Please complete all test cases before finishing the run" : ""}
                        >
                            Complete Run
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Run item status color for badges (styled like TestCaseTable)
const getRunItemStatusBadgeColor = (status: RunItemStatus) => {
    switch (status) {
        case RunItemStatus.Passed:
            return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700';
        case RunItemStatus.Failed:
            return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700';
        case RunItemStatus.Blocked:
            return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700';
        case RunItemStatus.Skipped:
            return 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 border-gray-200 dark:border-gray-600';
        case RunItemStatus.NotRun:
        default:
            return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600';
    }
};

// Priority badge color (dot style, like TestCaseTable)
const getPriorityColor = (priority?: string) => {
    switch (priority) {
        case 'Critical': return 'bg-red-500 dark:bg-red-500';
        case 'High': return 'bg-orange-500 dark:bg-orange-500';
        case 'Medium': return 'bg-yellow-400 dark:bg-yellow-500';
        case 'Low': return 'bg-blue-400 dark:bg-blue-500';
        default: return 'bg-gray-400 dark:bg-gray-500';
    }
};

// Run Detail View – table layout similar to TestCaseTable
interface RunDetailViewProps {
    testRun: TestRun;
    onBack: () => void;
    onUpdateItem: (itemId: string, status: RunItemStatus, actualResult?: string) => Promise<void>;
    onComplete: () => Promise<void>;
    onOpenExecute: (itemIndex: number) => void;
}

const RunDetailView: React.FC<RunDetailViewProps> = ({
    testRun,
    onBack,
    onUpdateItem,
    onComplete,
    onOpenExecute,
}) => {
    const executedCount = testRun.items.filter(i => i.status !== RunItemStatus.NotRun).length;
    const totalItems = testRun.items.length;

    const handleStatusChange = async (item: RunItem, newStatus: RunItemStatus) => {
        try {
            await onUpdateItem(item.id, newStatus, item.actualResult);
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to update status');
        }
    };

    const handleComplete = async () => {
        try {
            await onComplete();
            toast.success('Test run completed!');
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to complete run');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onBack}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                        title="Back to runs"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{testRun.title}</h2>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRunStatusColor(testRun.status)}`}>
                                {testRun.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>{executedCount} / {totalItems} executed ({totalItems > 0 ? Math.round((executedCount / totalItems) * 100) : 0}%)</span>
                            <span>{testRun.resultsSummary.passRate}% pass rate</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleComplete}
                        disabled={executedCount < totalItems}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                            executedCount < totalItems
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                : 'text-white bg-blue-600 hover:bg-blue-700'
                        }`}
                        title={executedCount < totalItems ? 'Complete all test cases first' : 'Complete Run'}
                    >
                        Complete Run
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 dark:bg-gray-700 flex flex-shrink-0">
                {testRun.resultsSummary.passed > 0 && (
                    <div className="bg-green-500" style={{ width: `${(testRun.resultsSummary.passed / totalItems) * 100}%` }} />
                )}
                {testRun.resultsSummary.failed > 0 && (
                    <div className="bg-red-500" style={{ width: `${(testRun.resultsSummary.failed / totalItems) * 100}%` }} />
                )}
                {testRun.resultsSummary.blocked > 0 && (
                    <div className="bg-orange-500" style={{ width: `${(testRun.resultsSummary.blocked / totalItems) * 100}%` }} />
                )}
                {testRun.resultsSummary.skipped > 0 && (
                    <div className="bg-gray-400 dark:bg-gray-500" style={{ width: `${(testRun.resultsSummary.skipped / totalItems) * 100}%` }} />
                )}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none">
                        <tr>
                            <th className="py-2 pl-6 pr-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-12">#</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-1/3">Title</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-32">Priority</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-40">Run Status</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-40">Area</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-24"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                        {testRun.items.map((item, index) => (
                            <tr
                                key={item.id}
                                onClick={() => onOpenExecute(index)}
                                className="group transition-colors cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
                            >
                                {/* Order */}
                                <td className="py-2.5 pl-6 pr-4 text-sm font-medium text-gray-400 dark:text-gray-500 font-mono tracking-tight group-hover:text-gray-900 dark:group-hover:text-gray-200">
                                    {index + 1}
                                </td>

                                {/* Title */}
                                <td className="py-2.5 px-4">
                                    <div className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{item.caseSnapshot.title}</div>
                                    {item.caseSnapshot.testDescription && (
                                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-md">
                                            {item.caseSnapshot.testDescription}
                                        </div>
                                    )}
                                </td>

                                {/* Priority */}
                                <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(item.caseSnapshot.priority)} shadow-sm`} />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.caseSnapshot.priority || 'N/A'}</span>
                                    </div>
                                </td>

                                {/* Run Status Dropdown */}
                                <td className="py-2.5 px-4">
                                    <div onClick={e => e.stopPropagation()}>
                                        <select
                                            value={item.status}
                                            onChange={(e) => handleStatusChange(item, e.target.value as RunItemStatus)}
                                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border appearance-none cursor-pointer outline-none transition-colors text-center min-w-[90px] ${getRunItemStatusBadgeColor(item.status)}`}
                                        >
                                            <option value={RunItemStatus.NotRun}>Not Run</option>
                                            <option value={RunItemStatus.Passed}>Passed</option>
                                            <option value={RunItemStatus.Failed}>Failed</option>
                                            <option value={RunItemStatus.Blocked}>Blocked</option>
                                            <option value={RunItemStatus.Skipped}>Skipped</option>
                                        </select>
                                    </div>
                                </td>

                                {/* Area */}
                                <td className="py-2.5 px-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {item.caseSnapshot.area || '—'}
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="py-2.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenExecute(index);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Execute Test Case"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile list */}
            <div className="block sm:hidden flex-1 overflow-auto p-2">
                {testRun.items.map((item, index) => (
                    <div
                        key={item.id}
                        onClick={() => onOpenExecute(index)}
                        className="relative mac-card overflow-hidden cursor-pointer transition-all active:scale-[0.98] mb-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/80"
                    >
                        {/* Priority Color Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(item.caseSnapshot.priority)}`} />

                        <div className="p-4 pl-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    {/* Top Row: Status & Index */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRunItemStatusBadgeColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                            #{index + 1}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h4 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                                        {item.caseSnapshot.title}
                                    </h4>

                                    {/* Area */}
                                    {item.caseSnapshot.area && (
                                        <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {item.caseSnapshot.area}
                                        </div>
                                    )}

                                    {/* Footer: Priority & Status change */}
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(item.caseSnapshot.priority)} shadow-sm`} />
                                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                {item.caseSnapshot.priority || 'N/A'}
                                            </span>
                                        </div>
                                        <div onClick={e => e.stopPropagation()}>
                                            <select
                                                value={item.status}
                                                onChange={(e) => handleStatusChange(item, e.target.value as RunItemStatus)}
                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border appearance-none cursor-pointer outline-none transition-colors min-w-[80px] ${getRunItemStatusBadgeColor(item.status)}`}
                                            >
                                                <option value={RunItemStatus.NotRun}>Not Run</option>
                                                <option value={RunItemStatus.Passed}>Passed</option>
                                                <option value={RunItemStatus.Failed}>Failed</option>
                                                <option value={RunItemStatus.Blocked}>Blocked</option>
                                                <option value={RunItemStatus.Skipped}>Skipped</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TestRunsPage: React.FC = () => {
    const { activeProject, testCases, testSuites, fetchTestCasesByProject, fetchTestSuites, setActiveProject } = useTestManagerStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [testRuns, setTestRuns] = useState<TestRunListItem[]>([]);
    const [testRunGroups, setTestRunGroups] = useState<TestRunGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<TestRunGroup | undefined>(undefined);
    const [selectedCasesForRun, setSelectedCasesForRun] = useState<string[]>([]);
    const [executeRun, setExecuteRun] = useState<TestRun | null>(null);
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
    const [detailRun, setDetailRun] = useState<TestRun | null>(null);
    const [executeStartIndex, setExecuteStartIndex] = useState(0);
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
    const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
    const [editingRun, setEditingRun] = useState<TestRunListItem | null>(null);
    const [isEditRunModalOpen, setIsEditRunModalOpen] = useState(false);
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
    const [createModalInitialTitle, setCreateModalInitialTitle] = useState('');

    // Ref to hold suite ID from URL params, resolved once test cases are loaded
    const pendingSuiteIdRef = useRef<string | null>(null);
    const pendingSuiteNameRef = useRef<string | null>(null);
    const processedUrlRef = useRef(false);

    // Handle URL params: openCreate=true&suiteId=...&suiteName=...&projectId=...
    useEffect(() => {
        if (processedUrlRef.current) return;
        const openCreate = searchParams.get('openCreate');
        const suiteId = searchParams.get('suiteId');
        const suiteName = searchParams.get('suiteName');
        const projectId = searchParams.get('projectId');

        if (openCreate !== 'true') return;
        processedUrlRef.current = true;

        if (projectId && projectId !== activeProject) {
            setActiveProject(projectId);
        }

        if (suiteId) {
            pendingSuiteIdRef.current = suiteId;
            pendingSuiteNameRef.current = suiteName;
        } else {
            setIsCreateModalOpen(true);
        }

        // Clear URL params
        setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Once test cases are loaded, resolve the pending suite selection and open modal
    useEffect(() => {
        if (!pendingSuiteIdRef.current || testCases.length === 0) return;
        const suiteId = pendingSuiteIdRef.current;
        const suiteName = pendingSuiteNameRef.current;
        pendingSuiteIdRef.current = null;
        pendingSuiteNameRef.current = null;
        const ids = testCases.filter(tc => tc.suiteId === suiteId).map(tc => tc.id);
        setSelectedCasesForRun(ids);
        if (suiteName) {
            setCreateModalInitialTitle(generateSuiteTitle(suiteName));
        }
        setIsCreateModalOpen(true);
    }, [testCases]);

    // Real-time updates
    useRealtimeTestRuns({
        projectId: activeProject,
        setTestRuns,
        setExecuteRun,
    });

    const location = useLocation();

    // Handle navigation state for opening new run modal
    useEffect(() => {
        if (location.state?.openNewRun) {
            setIsCreateModalOpen(true);
            // Clear the state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Fetch test runs when project changes
    const fetchRuns = useCallback(async () => {
        if (!activeProject) return;
        setIsLoading(true);
        try {
            const runs = await testRunApi.getTestRuns(activeProject);
            setTestRuns(runs as unknown as TestRunListItem[]);
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to load test runs');
        } finally {
            setIsLoading(false);
        }
    }, [activeProject]);

    // Fetch test run groups
    const fetchGroups = useCallback(async () => {
        if (!activeProject) return;
        try {
            const groups = await testRunApi.getTestRunGroups(activeProject);
            setTestRunGroups(groups.map(g => ({
                id: g.id,
                name: g.name,
                description: g.description,
                projectId: g.projectId,
                color: g.color,
                createdBy: g.createdBy,
                createdAt: g.createdAt,
                updatedAt: g.updatedAt,
            })));
        } catch (error: unknown) {
            console.error('Failed to fetch groups:', error);
        }
    }, [activeProject]);

    // Fetch tag suggestions
    const fetchTags = useCallback(async () => {
        if (!activeProject) return;
        try {
            const tags = await testRunApi.getTagsByProject(activeProject);
            setTagSuggestions(tags);
        } catch (error: unknown) {
            console.error('Failed to fetch tags:', error);
        }
    }, [activeProject]);

    useEffect(() => {
        fetchRuns();
        fetchGroups();
        fetchTags();
    }, [fetchRuns, fetchGroups, fetchTags]);

    // Fetch test cases and suites for the create modal
    useEffect(() => {
        if (activeProject) {
            fetchTestCasesByProject(activeProject);
            fetchTestSuites(activeProject);
        }
    }, [activeProject, fetchTestCasesByProject, fetchTestSuites]);

    const handleCreateRun = async (title: string, description: string, caseIds: string[], groupId?: string, tags?: string[]) => {
        if (!activeProject) return;
        await testRunApi.createTestRun(activeProject, {
            title,
            description,
            testCaseIds: caseIds,
            groupId,
            tags,
        });
        toast.success('Test run created!');
        setSelectedCasesForRun([]);
        fetchRuns();
        fetchTags();
    };

    const handleCreateGroup = async (name: string, description: string, color: string) => {
        if (!activeProject) return;
        try {
            await testRunApi.createTestRunGroup(activeProject, { name, description, color });
            toast.success('Group created!');
            fetchGroups();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to create group');
            throw error;
        }
    };

    const handleUpdateGroup = async (name: string, description: string, color: string) => {
        if (!editingGroup) return;
        try {
            await testRunApi.updateTestRunGroup(editingGroup.id, { name, description, color });
            toast.success('Group updated!');
            fetchGroups();
            setEditingGroup(undefined);
            setIsCreateGroupModalOpen(false);
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to update group');
            throw error;
        }
    };

    const handleDeleteGroup = (groupId: string) => {
        setDeleteGroupId(groupId);
        setIsDeleteGroupModalOpen(true);
    };

    const confirmDeleteGroup = async () => {
        if (!deleteGroupId) return;
        try {
            await testRunApi.deleteTestRunGroup(deleteGroupId);
            toast.success('Group deleted');
            if (selectedGroupFilter === deleteGroupId) {
                setSelectedGroupFilter('all');
            }
            fetchGroups();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to delete group');
        } finally {
            setIsDeleteGroupModalOpen(false);
            setDeleteGroupId(null);
        }
    };

    const handleDeleteRun = async (runId: string) => {
        if (!confirm('Are you sure you want to delete this test run?')) return;
        try {
            await testRunApi.deleteTestRun(runId);
            toast.success('Test run deleted');
            fetchRuns();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to delete');
        }
    };

    const handleCloneRun = async (runId: string) => {
        try {
            await testRunApi.cloneTestRun(runId);
            toast.success('Test run cloned');
            fetchRuns();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to clone');
        }
    };

    const handleEditRun = (run: TestRunListItem) => {
        setEditingRun(run);
        setIsEditRunModalOpen(true);
    };

    const handleUpdateRun = async (runId: string, data: { title: string; groupId: string | null; tags: string[] }) => {
        try {
            await testRunApi.updateTestRun(runId, {
                title: data.title,
                groupId: data.groupId,
                tags: data.tags,
            });
            toast.success('Test run updated');
            fetchRuns();
            fetchTags();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to update test run');
            throw error;
        }
    };

    const handleExecuteRun = async (runId: string) => {
        try {
            const run = await testRunApi.getTestRun(runId);
            const typedRun = run as unknown as TestRun;
            setDetailRun(typedRun);
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to load run');
        }
    };

    const handleOpenExecuteFromDetail = (itemIndex: number) => {
        if (!detailRun) return;
        setExecuteRun(detailRun);
        setExecuteStartIndex(itemIndex);
        setIsExecuteModalOpen(true);
    };

    const handleUpdateRunItem = async (itemId: string, status: RunItemStatus, actualResult?: string) => {
        const currentRun = executeRun || detailRun;
        if (!currentRun) return;
        const updated = await testRunApi.updateRunItem(currentRun.id, itemId, {
            status,
            actualResult,
        });
        const typedUpdated = updated as unknown as TestRun;
        if (executeRun) setExecuteRun(typedUpdated);
        setDetailRun(typedUpdated);
    };

    const handleDetailUpdateItem = async (itemId: string, status: RunItemStatus, actualResult?: string) => {
        if (!detailRun) return;
        const updated = await testRunApi.updateRunItem(detailRun.id, itemId, {
            status,
            actualResult,
        });
        const typedUpdated = updated as unknown as TestRun;
        setDetailRun(typedUpdated);
    };

    const handleCompleteRun = async () => {
        const currentRun = executeRun || detailRun;
        if (!currentRun) return;
        await testRunApi.completeTestRun(currentRun.id);
        // Refresh the detail view
        if (detailRun) {
            try {
                const refreshed = await testRunApi.getTestRun(detailRun.id);
                setDetailRun(refreshed as unknown as TestRun);
            } catch {
                // If refresh fails, just close
            }
        }
        fetchRuns();
    };

    const toggleCaseSelection = (caseId: string) => {
        setSelectedCasesForRun((prev) =>
            prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]
        );
    };

    const filteredRuns = testRuns.filter(run => {
        if (selectedGroupFilter === 'all') return true;
        if (selectedGroupFilter === 'ungrouped') return !run.groupId;
        return run.groupId === selectedGroupFilter;
    });

    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test runs"
            />
        );
    }

    // If a run is selected for detail view, show the detail table
    if (detailRun) {
        return (
            <>
                <RunDetailView
                    testRun={detailRun}
                    onBack={() => {
                        setDetailRun(null);
                        fetchRuns();
                    }}
                    onUpdateItem={handleDetailUpdateItem}
                    onComplete={handleCompleteRun}
                    onOpenExecute={handleOpenExecuteFromDetail}
                />

                {/* Execute Run Modal (from detail view) */}
                <ExecuteRunModal
                    isOpen={isExecuteModalOpen}
                    onClose={() => {
                        setIsExecuteModalOpen(false);
                        setExecuteRun(null);
                    }}
                    testRun={executeRun}
                    onUpdateItem={handleUpdateRunItem}
                    onComplete={handleCompleteRun}
                    startIndex={executeStartIndex}
                />
            </>
        );
    }

    return (
        <div className="flex flex-col h-auto sm:h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 sm:sticky sm:top-0 sm:z-20">
                <div className="flex items-center gap-2">
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg md:hidden"
                        title="Open Run Groups"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <ContextBreadcrumb showSuiteSelector={false} />
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 transition-opacity"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white dark:bg-gray-900 shadow-xl transform transition-transform">
                        <RunGroupsSidebar
                            groups={testRunGroups}
                            selectedFilter={selectedGroupFilter}
                            onSelectFilter={setSelectedGroupFilter}
                            onCreateGroup={() => {
                                setEditingGroup(undefined);
                                setIsCreateGroupModalOpen(true);
                            }}
                            onEditGroup={(group) => {
                                setEditingGroup(group);
                                setIsCreateGroupModalOpen(true);
                            }}
                            onDeleteGroup={handleDeleteGroup}
                            isMobile={true}
                            onClose={() => setIsMobileSidebarOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Main Content with Sidebar */}
            <div className="flex-1 flex sm:overflow-hidden">
                {/* Desktop Groups Sidebar */}
                <div className="hidden md:block h-full">
                    <RunGroupsSidebar
                        groups={testRunGroups}
                        selectedFilter={selectedGroupFilter}
                        onSelectFilter={setSelectedGroupFilter}
                        onCreateGroup={() => {
                            setEditingGroup(undefined);
                            setIsCreateGroupModalOpen(true);
                        }}
                        onEditGroup={(group) => {
                            setEditingGroup(group);
                            setIsCreateGroupModalOpen(true);
                        }}
                        onDeleteGroup={handleDeleteGroup}
                    />
                </div>

                {/* Test Runs List */}
                <div className="flex-1 sm:overflow-auto p-4 bg-gray-50/50 dark:bg-gray-900">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredRuns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <Play className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No Test Runs Found</h3>
                            <p className="text-sm">
                                {selectedGroupFilter !== 'all'
                                    ? "No test runs in this group."
                                    : "Create a test run to start executing your test cases"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredRuns.map((run) => (
                                <div
                                    key={run.id}
                                    className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:hover:shadow-none transition-shadow cursor-pointer"
                                    onClick={() => handleExecuteRun(run.id)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center flex-wrap gap-2 mb-1">
                                                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">{run.title}</h3>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRunStatusColor(run.status)}`}>
                                                    {run.status}
                                                </span>
                                                {run.groupId && (
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                                        {testRunGroups.find(g => g.id === run.groupId)?.name || 'Group'}
                                                    </span>
                                                )}
                                                {run.tags && run.tags.length > 0 && run.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(run.createdAt).toLocaleDateString()}
                                                </span>
                                                {run.suiteName && (
                                                    <span className="flex items-center gap-1">
                                                        <Layers className="w-3.5 h-3.5" />
                                                        {run.suiteName}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    {run.resultsSummary.passRate}% Pass Rate
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditRun(run);
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                title="Edit Run"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCloneRun(run.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                title="Clone Run"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteRun(run.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                                                title="Delete Run"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                        {run.resultsSummary.passed > 0 && (
                                            <div
                                                className="bg-green-500"
                                                style={{
                                                    width: `${(run.resultsSummary.passed / run.resultsSummary.total) * 100}%`,
                                                }}
                                            />
                                        )}
                                        {run.resultsSummary.failed > 0 && (
                                            <div
                                                className="bg-red-500"
                                                style={{
                                                    width: `${(run.resultsSummary.failed / run.resultsSummary.total) * 100}%`,
                                                }}
                                            />
                                        )}
                                        {run.resultsSummary.blocked > 0 && (
                                            <div
                                                className="bg-yellow-500"
                                                style={{
                                                    width: `${(run.resultsSummary.blocked / run.resultsSummary.total) * 100}%`,
                                                }}
                                            />
                                        )}
                                        {run.resultsSummary.skipped > 0 && (
                                            <div
                                                className="bg-gray-400 dark:bg-gray-500"
                                                style={{
                                                    width: `${(run.resultsSummary.skipped / run.resultsSummary.total) * 100}%`,
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Run Modal */}
            <CreateRunModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedCasesForRun([]);
                    setCreateModalInitialTitle('');
                }}
                onSubmit={handleCreateRun}
                testCases={testCases}
                testSuites={testSuites.map(s => ({ id: s.id, name: s.name }))}
                testRunGroups={testRunGroups}
                selectedCases={selectedCasesForRun}
                onToggleCase={toggleCaseSelection}
                onSelectAll={(selectAll, filteredCases) => {
                    if (selectAll) {
                        setSelectedCasesForRun(filteredCases.map((tc) => tc.id));
                    } else {
                        setSelectedCasesForRun([]);
                    }
                }}
                tagSuggestions={tagSuggestions}
                initialTitle={createModalInitialTitle}
            />

            {/* Create/Edit Group Modal */}
            <CreateGroupModal
                isOpen={isCreateGroupModalOpen}
                onClose={() => {
                    setIsCreateGroupModalOpen(false);
                    setEditingGroup(undefined);
                }}
                onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
                initialData={editingGroup}
                mode={editingGroup ? 'edit' : 'create'}
            />

            {/* Delete Group Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteGroupModalOpen}
                onClose={() => {
                    setIsDeleteGroupModalOpen(false);
                    setDeleteGroupId(null);
                }}
                onConfirm={confirmDeleteGroup}
                title="Delete Run Group"
                message="Are you sure you want to delete this group? Test runs in this group will not be deleted but will be ungrouped."
                confirmText="Delete"
                isDestructive={true}
            />

            {/* Edit Test Run Modal */}
            <EditTestRunModal
                isOpen={isEditRunModalOpen}
                onClose={() => {
                    setIsEditRunModalOpen(false);
                    setEditingRun(null);
                }}
                testRun={editingRun}
                testRunGroups={testRunGroups}
                onSubmit={handleUpdateRun}
                tagSuggestions={tagSuggestions}
            />
        </div>
    );
};

export default TestRunsPage;
