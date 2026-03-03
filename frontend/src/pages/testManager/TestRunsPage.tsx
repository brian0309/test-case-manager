import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTestManagerStore } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import ConfirmationModal from '../../components/testManager/ConfirmationModal';
import {
    TestRunListItem,
    RunItemStatus,
    TestRun,
    TestRunGroup,
} from '../../types/testManager';
import { testRunApi } from '../../services/testRunApi';
import { useRealtimeTestRuns } from '../../hooks/useRealtimeTestRuns';
import {
    Play,
    Clock,
    CheckCircle,
    Trash2,
    Copy,
    ChevronRight,
    Layers,
    Menu,
    Edit2,
} from 'lucide-react';
import CreateGroupModal from './components/CreateGroupModal';
import RunGroupsSidebar from '../../components/testManager/RunGroupsSidebar';
import CreateRunModal from './components/CreateRunModal';
import EditTestRunModal from './components/EditTestRunModal';
import ExecuteRunModal from './components/ExecuteRunModal';
import RunDetailView from './components/RunDetailView';
import { getRunStatusColor, generateSuiteTitle } from './components/testRunUtils';


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
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Handle deep-link to a specific test run via ?runId= query param
    // Read from window.location directly to avoid React Router searchParams interference
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const runId = params.get('runId');
        const itemId = params.get('itemId');
        const caseId = params.get('caseId');
        if (!runId) return;

        // Clean the URL immediately so it doesn't re-trigger on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('runId');
        window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ''));

        const loadRun = async () => {
            try {
                const run = await testRunApi.getTestRun(runId);
                const typedRun = run as unknown as TestRun;
                setDetailRun(typedRun);

                const targetItemIndex = typedRun.items.findIndex(
                    item => item.id === itemId || item.caseId === itemId || item.caseId === caseId
                );

                if (targetItemIndex >= 0) {
                    setExecuteRun(typedRun);
                    setExecuteStartIndex(targetItemIndex);
                    setIsExecuteModalOpen(true);
                }
            } catch {
                toast.error('Could not load the linked test run');
            }
        };
        loadRun();
    }, []);

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

    // If a run is selected for detail view, show it regardless of activeProject state
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
                    availableTestCases={testCases}
                    availableSuites={testSuites}
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
                    availableTestCases={testCases}
                    availableSuites={testSuites}
                />
            </>
        );
    }

    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test runs"
            />
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
