import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTestManagerStore } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import RichTextEditor from '../../components/testManager/RichTextEditor';
import {
    TestRunListItem,
    TestRunStatus,
    RunItemStatus,
    TestRun,
    TestCase,
} from '../../types/testManager';
import { testRunApi } from '../../services/testRunApi';
import {
    Play,
    Plus,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    MoreVertical,
    Trash2,
    Copy,
    Eye,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react';

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
    onSubmit: (title: string, description: string, caseIds: string[]) => Promise<void>;
    testCases: TestCase[];
    selectedCases: string[];
    onToggleCase: (caseId: string) => void;
    onSelectAll: (selectAll: boolean) => void;
}

const CreateRunModal: React.FC<CreateRunModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    testCases,
    selectedCases,
    onToggleCase,
    onSelectAll,
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            await onSubmit(title, description, selectedCases);
            setTitle('');
            setDescription('');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create test run');
        } finally {
            setIsSubmitting(false);
        }
    };

    const allSelected = testCases.length > 0 && testCases.every(tc => selectedCases.includes(tc.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Select Test Cases ({selectedCases.length} selected)
                            </label>
                            <button
                                onClick={() => onSelectAll(!allSelected)}
                                className="text-sm text-blue-600 hover:text-blue-700"
                            >
                                {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                            {testCases.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    No test cases available
                                </div>
                            ) : (
                                testCases.map((tc) => (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{testRun.title}</h2>
                        <div className="text-sm text-gray-500 mt-1">
                            Progress: {executedCount} / {totalItems} ({Math.round((executedCount / totalItems) * 100)}%)
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XCircle className="w-6 h-6" />
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
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                Case {currentIndex + 1} of {totalItems}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getItemStatusColor(currentItem.status)} text-white`}>
                                {currentItem.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setCurrentIndex(Math.min(totalItems - 1, currentIndex + 1))}
                                disabled={currentIndex === totalItems - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {currentItem.caseSnapshot.title}
                    </h3>

                    {currentItem.caseSnapshot.testDescription && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                            <p className="text-sm text-gray-600">{currentItem.caseSnapshot.testDescription}</p>
                        </div>
                    )}

                    {currentItem.caseSnapshot.stepsContent && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Steps</h4>
                            <div
                                className="prose prose-sm max-w-none text-gray-600"
                                dangerouslySetInnerHTML={{ __html: currentItem.caseSnapshot.stepsContent }}
                            />
                        </div>
                    )}

                    {currentItem.caseSnapshot.expectedResult && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Expected Result</h4>
                            <p className="text-sm text-gray-600">{currentItem.caseSnapshot.expectedResult}</p>
                        </div>
                    )}

                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Actual Result / Notes</h4>
                        <RichTextEditor
                            content={actualResult}
                            onChange={setActualResult}
                            placeholder="Enter actual result or notes..."
                            editable={true}
                        />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
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
    );
};

const TestRunsPage: React.FC = () => {
    const { activeProject, testCases, fetchTestCasesByProject } = useTestManagerStore();
    const [testRuns, setTestRuns] = useState<TestRunListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedCasesForRun, setSelectedCasesForRun] = useState<string[]>([]);
    const [executeRun, setExecuteRun] = useState<TestRun | null>(null);
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);

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

    useEffect(() => {
        fetchRuns();
    }, [fetchRuns]);

    // Fetch test cases for the create modal
    useEffect(() => {
        if (activeProject) {
            fetchTestCasesByProject(activeProject);
        }
    }, [activeProject, fetchTestCasesByProject]);

    const handleCreateRun = async (title: string, description: string, caseIds: string[]) => {
        if (!activeProject) return;
        await testRunApi.createTestRun(activeProject, {
            title,
            description,
            testCaseIds: caseIds,
        });
        toast.success('Test run created!');
        setSelectedCasesForRun([]);
        fetchRuns();
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

    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test runs"
            />
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <ContextBreadcrumb showSuiteSelector={false} />
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    New Test Run
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : testRuns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Play className="w-12 h-12 mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No Test Runs Yet</h3>
                        <p className="text-sm">Create a test run to start executing your test cases</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {testRuns.map((run) => (
                            <div
                                key={run.id}
                                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-medium text-gray-900">{run.title}</h3>
                                            <span
                                                className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRunStatusColor(run.status)}`}
                                            >
                                                {run.status}
                                            </span>
                                        </div>
                                        {run.description && (
                                            <p className="text-sm text-gray-600 mb-3">{run.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {new Date(run.createdAt).toLocaleDateString()}
                                            </span>
                                            <span>{run.itemCount} cases</span>
                                            {run.suiteName && (
                                                <span className="text-blue-600">{run.suiteName}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Progress summary */}
                                        <div className="flex items-center gap-1 mr-4">
                                            <div className="flex items-center gap-0.5">
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                <span className="text-sm font-medium text-green-600">
                                                    {run.resultsSummary.passed}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-0.5 ml-2">
                                                <XCircle className="w-4 h-4 text-red-500" />
                                                <span className="text-sm font-medium text-red-600">
                                                    {run.resultsSummary.failed}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-400 ml-2">
                                                {run.resultsSummary.passRate}% pass
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleExecuteRun(run.id)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                                        >
                                            <Play className="w-4 h-4" />
                                            {run.status === TestRunStatus.Draft ? 'Start' : 'Continue'}
                                        </button>
                                        <div className="relative group">
                                            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-10 min-w-[120px]">
                                                <button
                                                    onClick={() => handleExecuteRun(run.id)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleCloneRun(run.id)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                    Clone
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRun(run.id)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
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
                                            className="bg-orange-500"
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

            {/* Create Run Modal */}
            <CreateRunModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedCasesForRun([]);
                }}
                onSubmit={handleCreateRun}
                testCases={testCases}
                selectedCases={selectedCasesForRun}
                onToggleCase={toggleCaseSelection}
                onSelectAll={(selectAll) => {
                    if (selectAll) {
                        setSelectedCasesForRun(testCases.map((tc) => tc.id));
                    } else {
                        setSelectedCasesForRun([]);
                    }
                }}
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
        </div>
    );
};

export default TestRunsPage;
