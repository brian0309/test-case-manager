import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
} from '../../types/testManager';
import { testRunApi } from '../../services/testRunApi';
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
} from 'lucide-react';
import CreateGroupModal from './components/CreateGroupModal';
import RunGroupsSidebar from '../../components/testManager/RunGroupsSidebar';

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
interface CreateRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (title: string, description: string, caseIds: string[], groupId?: string) => Promise<void>;
    testCases: TestCase[];
    testSuites: { id: string; name: string }[];
    testRunGroups: TestRunGroup[];
    selectedCases: string[];
    onToggleCase: (caseId: string) => void;
    onSelectAll: (selectAll: boolean, filteredCases: TestCase[]) => void;
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
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSuiteFilter, setSelectedSuiteFilter] = useState<string>('all');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');

    // Filter test cases by selected suite
    const filteredTestCases = selectedSuiteFilter === 'all'
        ? testCases
        : testCases.filter(tc => tc.suiteId === selectedSuiteFilter);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setDescription('');
            setSelectedSuiteFilter('all');
            setSelectedGroupId('');
        }
    }, [isOpen]);

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
            await onSubmit(title, description, selectedCases, selectedGroupId || undefined);
            setTitle('');
            setDescription('');
            setSelectedSuiteFilter('all');
            setSelectedGroupId('');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create test run');
        } finally {
            setIsSubmitting(false);
        }
    };

    const allFilteredSelected = filteredTestCases.length > 0 && filteredTestCases.every(tc => selectedCases.includes(tc.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Create Test Run</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Sprint 23 Regression"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Test Run Group & Suite Filter - Same Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group (Optional)</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Suite</label>
                            <select
                                value={selectedSuiteFilter}
                                onChange={(e) => setSelectedSuiteFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Select Test Cases ({selectedCases.length} selected)
                            </label>
                            <button
                                onClick={() => onSelectAll(!allFilteredSelected, filteredTestCases)}
                                className="text-sm text-blue-600 hover:text-blue-700"
                            >
                                {allFilteredSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                            {filteredTestCases.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    No test cases available
                                </div>
                            ) : (
                                filteredTestCases.map((tc) => (
                                    <label
                                        key={tc.id}
                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCases.includes(tc.id)}
                                            onChange={() => onToggleCase(tc.id)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">{tc.title}</div>
                                            <div className="text-xs text-gray-500">{tc.suite}</div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
    onSubmit: (runId: string, data: { title: string; groupId: string | null }) => Promise<void>;
}

const EditTestRunModal: React.FC<EditTestRunModalProps> = ({
    isOpen,
    onClose,
    testRun,
    testRunGroups,
    onSubmit,
}) => {
    const [title, setTitle] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (testRun) {
            setTitle(testRun.title);
            setSelectedGroupId(testRun.groupId || '');
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
            });
            onClose();
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Edit Test Run</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Run Group</label>
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="">No Group (Ungrouped)</option>
                            {testRunGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
}

const ExecuteRunModal: React.FC<ExecuteRunModalProps> = ({
    isOpen,
    onClose,
    testRun,
    onUpdateItem,
    onComplete,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [actualResult, setActualResult] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

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
        } catch (error: any) {
            toast.error(error.message || 'Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleComplete = async () => {
        try {
            await onComplete();
            toast.success('Test run completed!');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to complete run');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div 
                className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                        <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{testRun.title}</h2>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                            Progress: {executedCount} / {totalItems} ({Math.round((executedCount / totalItems) * 100)}%)
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 flex">
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
                            <span className="text-xs sm:text-sm text-gray-500">
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
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 active:bg-gray-100 rounded"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setCurrentIndex(Math.min(totalItems - 1, currentIndex + 1))}
                                disabled={currentIndex === totalItems - 1}
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 active:bg-gray-100 rounded"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                        {currentItem.caseSnapshot.title}
                    </h3>

                    {currentItem.caseSnapshot.testDescription && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{currentItem.caseSnapshot.testDescription}</p>
                        </div>
                    )}

                    {currentItem.caseSnapshot.stepsContent && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Steps</h4>
                            <div
                                className="prose prose-sm max-w-none text-gray-600"
                                dangerouslySetInnerHTML={{ __html: currentItem.caseSnapshot.stepsContent }}
                            />
                        </div>
                    )}

                    {currentItem.caseSnapshot.expectedResult && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Expected Result</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{currentItem.caseSnapshot.expectedResult}</p>
                        </div>
                    )}

                    <div className="mb-0">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Actual Result / Notes</h4>
                        <RichTextEditor
                            content={actualResult}
                            onChange={setActualResult}
                            placeholder="Enter actual result or notes..."
                            editable={true}
                        />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-t border-gray-200">
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
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg active:bg-gray-300 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        {/* Complete button */}
                        <button
                            onClick={handleComplete}
                            className="w-full px-4 py-3 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg active:bg-blue-50"
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
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        <button
                            onClick={handleComplete}
                            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                        >
                            Complete Run
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TestRunsPage: React.FC = () => {
    const { activeProject, testCases, testSuites, fetchTestCasesByProject, fetchTestSuites } = useTestManagerStore();
    const [testRuns, setTestRuns] = useState<TestRunListItem[]>([]);
    const [testRunGroups, setTestRunGroups] = useState<TestRunGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<TestRunGroup | undefined>(undefined);
    const [selectedCasesForRun, setSelectedCasesForRun] = useState<string[]>([]);
    const [executeRun, setExecuteRun] = useState<TestRun | null>(null);
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
    const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
    const [editingRun, setEditingRun] = useState<TestRunListItem | null>(null);
    const [isEditRunModalOpen, setIsEditRunModalOpen] = useState(false);
    
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
        } catch (error: any) {
            toast.error(error.message || 'Failed to load test runs');
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
        } catch (error: any) {
            console.error('Failed to fetch groups:', error);
        }
    }, [activeProject]);

    useEffect(() => {
        fetchRuns();
        fetchGroups();
    }, [fetchRuns, fetchGroups]);

    // Fetch test cases and suites for the create modal
    useEffect(() => {
        if (activeProject) {
            fetchTestCasesByProject(activeProject);
            fetchTestSuites(activeProject);
        }
    }, [activeProject, fetchTestCasesByProject, fetchTestSuites]);

    const handleCreateRun = async (title: string, description: string, caseIds: string[], groupId?: string) => {
        if (!activeProject) return;
        await testRunApi.createTestRun(activeProject, {
            title,
            description,
            testCaseIds: caseIds,
            groupId,
        });
        toast.success('Test run created!');
        setSelectedCasesForRun([]);
        fetchRuns();
    };

    const handleCreateGroup = async (name: string, description: string, color: string) => {
        if (!activeProject) return;
        try {
            await testRunApi.createTestRunGroup(activeProject, { name, description, color });
            toast.success('Group created!');
            fetchGroups();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create group');
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
        } catch (error: any) {
            toast.error(error.message || 'Failed to update group');
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
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete group');
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
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    const handleCloneRun = async (runId: string) => {
        try {
            await testRunApi.cloneTestRun(runId);
            toast.success('Test run cloned');
            fetchRuns();
        } catch (error: any) {
            toast.error(error.message || 'Failed to clone');
        }
    };

    const handleEditRun = (run: TestRunListItem) => {
        setEditingRun(run);
        setIsEditRunModalOpen(true);
    };

    const handleUpdateRun = async (runId: string, data: { title: string; groupId: string | null }) => {
        try {
            await testRunApi.updateTestRun(runId, {
                title: data.title,
                groupId: data.groupId,
            });
            toast.success('Test run updated');
            fetchRuns();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update test run');
            throw error;
        }
    };

    const handleExecuteRun = async (runId: string) => {
        try {
            const run = await testRunApi.getTestRun(runId);
            setExecuteRun(run as unknown as TestRun);
            setIsExecuteModalOpen(true);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load run');
        }
    };

    const handleUpdateRunItem = async (itemId: string, status: RunItemStatus, actualResult?: string) => {
        if (!executeRun) return;
        const updated = await testRunApi.updateRunItem(executeRun.id, itemId, {
            status,
            actualResult,
        });
        setExecuteRun(updated as unknown as TestRun);
    };

    const handleCompleteRun = async () => {
        if (!executeRun) return;
        await testRunApi.completeTestRun(executeRun.id);
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

    return (
        <div className="flex flex-col h-auto sm:h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sm:sticky sm:top-0 sm:z-20">
                <div className="flex items-center gap-2">
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg md:hidden"
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
                    <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl transform transition-transform">
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
                <div className="hidden md:block">
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
                <div className="flex-1 sm:overflow-auto p-4 bg-gray-50/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredRuns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Play className="w-12 h-12 mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Test Runs Found</h3>
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
                                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => handleExecuteRun(run.id)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-base font-medium text-gray-900">{run.title}</h3>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRunStatusColor(run.status)}`}>
                                                    {run.status}
                                                </span>
                                                {run.groupId && (
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                        {testRunGroups.find(g => g.id === run.groupId)?.name || 'Group'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
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
                                                className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                                                title="Edit Run"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCloneRun(run.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                                                title="Clone Run"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteRun(run.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                                                title="Delete Run"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <ChevronRight className="w-5 h-5 text-gray-300" />
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
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
                                                className="bg-gray-400"
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

            {/* Execute Run Modal */}
            <ExecuteRunModal
                isOpen={isExecuteModalOpen}
                onClose={() => {
                    setIsExecuteModalOpen(false);
                    setExecuteRun(null);
                    fetchRuns();
                }}
                testRun={executeRun}
                onUpdateItem={handleUpdateRunItem}
                onComplete={handleCompleteRun}
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
            />
        </div>
    );
};

export default TestRunsPage;
