import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { shallow } from 'zustand/shallow';
import { mapTestCaseResponse, useTestManagerStore } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import ConfirmationModal from '../../components/testManager/ConfirmationModal';
import {
    TestRunListItem,
    RunItemStatus,
    TestRun,
    TestRunGroup,
} from '../../types/testManager';
import { CreateTicketRequest } from '../../types/api/testManager.api';
import { testRunApi } from '../../services/testRunApi';
import { getTestCase } from '../../services/testManagerApi';
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
    Loader2,
    Share2,
} from 'lucide-react';
import CreateGroupModal from './components/CreateGroupModal';
import RunGroupsSidebar from '../../components/testManager/RunGroupsSidebar';
import CreateRunModal from './components/CreateRunModal';
import EditTestRunModal from './components/EditTestRunModal';
import ExecuteRunModal from './components/ExecuteRunModal';
import RunDetailView from './components/RunDetailView';
import { filterTestRunsBySearch, getRunStatusColor, generateSuiteTitle } from './components/testRunUtils';

const RUNS_PAGE_SIZE = 40;

const mapRunResponseToListItem = (run: TestRun): TestRunListItem => ({
    id: run.id,
    title: run.title,
    description: run.description,
    projectId: run.projectId,
    suiteId: run.suiteId,
    suiteName: run.suiteName,
    status: run.status,
    environment: run.environment,
    tags: run.tags,
    itemCount: run.items.length,
    createdBy: run.createdBy,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    resultsSummary: run.resultsSummary,
    groupId: run.groupId,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
});


const TestRunsPage: React.FC = () => {
    const {
        activeProject,
        testCases,
        testSuites,
        setRunDetailViewOpen,
        fetchTestCasesByProject,
        fetchTestSuites,
        setActiveProject,
        setTestCases,
        searchQuery,
        clearSearchQuery,
        createTicket,
    } = useTestManagerStore(
        (state) => ({
            activeProject: state.activeProject,
            testCases: state.testCases,
            testSuites: state.testSuites,
            setRunDetailViewOpen: state.setRunDetailViewOpen,
            fetchTestCasesByProject: state.fetchTestCasesByProject,
            fetchTestSuites: state.fetchTestSuites,
            setActiveProject: state.setActiveProject,
            setTestCases: state.setTestCases,
            searchQuery: state.searchQuery,
            clearSearchQuery: state.clearSearchQuery,
            createTicket: state.createTicket,
        }),
        shallow
    );
    const [searchParams, setSearchParams] = useSearchParams();
    const [testRuns, setTestRuns] = useState<TestRunListItem[]>([]);
    const [testRunGroups, setTestRunGroups] = useState<TestRunGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreRuns, setHasMoreRuns] = useState(false);
    const [runsOffset, setRunsOffset] = useState(0);
    const [runsTotal, setRunsTotal] = useState(0);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<TestRunGroup | undefined>(undefined);
    const [preselectedCaseIds, setPreselectedCaseIds] = useState<string[]>([]);
    const [executeRun, setExecuteRun] = useState<TestRun | null>(null);
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
    const [detailRun, setDetailRun] = useState<TestRun | null>(null);
    const [detailRunId, setDetailRunId] = useState<string | null>(null);
    const [executeStartIndex, setExecuteStartIndex] = useState(0);
    const [executeItemOrder, setExecuteItemOrder] = useState<number[] | undefined>(undefined);
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
    const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
    const [editingRun, setEditingRun] = useState<TestRunListItem | null>(null);
    const [isEditRunModalOpen, setIsEditRunModalOpen] = useState(false);
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
    const [createModalInitialTitle, setCreateModalInitialTitle] = useState('');
    const runsListContainerRef = useRef<HTMLDivElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const detailLookupsLoadedForRunIdRef = useRef<string | null>(null);
    const detailRequestSequenceRef = useRef(0);

    // Ref to hold suite ID from URL params, resolved once test cases are loaded
    const pendingSuiteIdRef = useRef<string | null>(null);
    const pendingSuiteNameRef = useRef<string | null>(null);
    const processedUrlRef = useRef(false);

    useEffect(() => {
        clearSearchQuery();
        return () => clearSearchQuery();
    }, [clearSearchQuery]);

    useEffect(() => {
        setRunDetailViewOpen(Boolean(detailRunId));

        return () => {
            setRunDetailViewOpen(false);
        };
    }, [detailRunId, setRunDetailViewOpen]);

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
            setPreselectedCaseIds([]);
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
        setPreselectedCaseIds(ids);
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
            setPreselectedCaseIds([]);
            setIsCreateModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Fetch test runs when project changes
    const fetchRuns = useCallback(async (reset = true, offsetValue = 0) => {
        if (!activeProject) return;
        if (reset) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }
        try {
            const nextOffset = reset ? 0 : offsetValue;
            const result = await testRunApi.getTestRunsPaginated(activeProject, {
                limit: RUNS_PAGE_SIZE,
                offset: nextOffset,
            });

            setTestRuns((previous) => {
                const incomingRuns = result.items as unknown as TestRunListItem[];
                if (reset) {
                    return incomingRuns;
                }

                const existingIds = new Set(previous.map((run) => run.id));
                const dedupedIncoming = incomingRuns.filter((run) => !existingIds.has(run.id));
                return [...previous, ...dedupedIncoming];
            });

            const loadedCount = result.items.length;
            const totalLoaded = nextOffset + loadedCount;
            setRunsOffset(totalLoaded);
            setRunsTotal(result.meta.total);
            setHasMoreRuns(result.meta.hasMore && totalLoaded < result.meta.total);
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to load test runs');
        } finally {
            if (reset) {
                setIsLoading(false);
            } else {
                setIsLoadingMore(false);
            }
        }
    }, [activeProject]);

    const closeDetailView = useCallback(() => {
        detailRequestSequenceRef.current += 1;
        setDetailRunId(null);
        setDetailRun(null);
        setExecuteRun(null);
        setIsExecuteModalOpen(false);
        setExecuteItemOrder(undefined);
        fetchRuns();
    }, [fetchRuns]);

    const loadDetailRun = useCallback(async (
        runId: string,
        options?: {
            itemId?: string | null;
            caseId?: string | null;
            errorMessage?: string;
        }
    ) => {
        const requestSequence = detailRequestSequenceRef.current + 1;
        detailRequestSequenceRef.current = requestSequence;

        setDetailRunId(runId);
        setDetailRun(null);

        try {
            const run = await testRunApi.getTestRun(runId);
            if (detailRequestSequenceRef.current !== requestSequence) {
                return;
            }

            const typedRun = run as unknown as TestRun;
            setDetailRun(typedRun);

            const targetItemIndex = typedRun.items.findIndex(
                (item) => item.id === options?.itemId || item.caseId === options?.itemId || item.caseId === options?.caseId
            );

            if (targetItemIndex >= 0) {
                setExecuteRun(typedRun);
                setExecuteStartIndex(targetItemIndex);
                setExecuteItemOrder(undefined);
                setIsExecuteModalOpen(true);
            }
        } catch (error: unknown) {
            if (detailRequestSequenceRef.current !== requestSequence) {
                return;
            }

            setDetailRunId(null);
            setDetailRun(null);
            toast.error((error as Error).message || options?.errorMessage || 'Failed to load run');
        }
    }, []);

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

        void loadDetailRun(runId, {
            itemId,
            caseId,
            errorMessage: 'Could not load the linked test run',
        });
    }, [loadDetailRun]);

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
                parentId: g.parentId,
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
        fetchRuns(true);
        fetchGroups();
        fetchTags();
    }, [fetchRuns, fetchGroups, fetchTags]);

    const handleLoadMoreRuns = useCallback(() => {
        if (!hasMoreRuns || isLoadingMore || isLoading) return;
        fetchRuns(false, runsOffset);
    }, [fetchRuns, hasMoreRuns, isLoadingMore, isLoading, runsOffset]);

    useEffect(() => {
        if (!hasMoreRuns || isLoading || isLoadingMore) {
            return;
        }

        const sentinel = loadMoreSentinelRef.current;
        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first?.isIntersecting) {
                    handleLoadMoreRuns();
                }
            },
            {
                root: runsListContainerRef.current,
                rootMargin: '200px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [handleLoadMoreRuns, hasMoreRuns, isLoading, isLoadingMore]);

    // Fetch test cases and suites only when run creation/editing flows need them
    useEffect(() => {
        const shouldLoadCaseSelectionData =
            !!activeProject &&
            (
                isCreateModalOpen ||
                isEditRunModalOpen ||
                searchParams.get('openCreate') === 'true'
            );

        if (shouldLoadCaseSelectionData && activeProject) {
            fetchTestCasesByProject(activeProject);
            fetchTestSuites(activeProject);
        }
    }, [
        activeProject,
        isCreateModalOpen,
        isEditRunModalOpen,
        searchParams,
        fetchTestCasesByProject,
        fetchTestSuites,
    ]);

    useEffect(() => {
        if (!detailRun) {
            detailLookupsLoadedForRunIdRef.current = null;
            return;
        }

        if (detailLookupsLoadedForRunIdRef.current === detailRun.id) {
            return;
        }

        detailLookupsLoadedForRunIdRef.current = detailRun.id;
        void fetchTestCasesByProject(detailRun.projectId);
        void fetchTestSuites(detailRun.projectId);
    }, [detailRun, fetchTestCasesByProject, fetchTestSuites]);

    const handleCreateRun = async (title: string, description: string, caseIds: string[], groupId?: string, tags?: string[]) => {
        if (!activeProject) return;
        const createdRun = await testRunApi.createTestRun(activeProject, {
            title,
            description,
            testCaseIds: caseIds,
            groupId,
            tags,
        });
        toast.success('Test run created!');
        const listItem = mapRunResponseToListItem(createdRun as unknown as TestRun);
        setTestRuns((previous) => {
            if (previous.some((run) => run.id === listItem.id)) {
                return previous;
            }
            return [listItem, ...previous];
        });
        setRunsOffset((previous) => previous + 1);
        fetchTags();
    };

    const handleCreateGroup = async (name: string, description: string, color: string, parentId?: string | null) => {
        if (!activeProject) return;
        try {
            await testRunApi.createTestRunGroup(activeProject, { name, description, parentId, color });
            toast.success('Group created!');
            fetchGroups();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to create group');
            throw error;
        }
    };

    const handleUpdateGroup = async (name: string, description: string, color: string, parentId?: string | null) => {
        if (!editingGroup) return;
        try {
            await testRunApi.updateTestRunGroup(editingGroup.id, { name, description, parentId, color });
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
            setTestRuns((previous) => previous.filter((run) => run.id !== runId));
            setRunsOffset((previous) => Math.max(previous - 1, 0));
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to delete');
        }
    };

    const handleCloneRun = async (runId: string) => {
        try {
            const clonedRun = await testRunApi.cloneTestRun(runId);
            toast.success('Test run cloned');
            const listItem = mapRunResponseToListItem(clonedRun as unknown as TestRun);
            setTestRuns((previous) => {
                if (previous.some((run) => run.id === listItem.id)) {
                    return previous;
                }
                return [listItem, ...previous];
            });
            setRunsOffset((previous) => previous + 1);
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to clone');
        }
    };

    const handleEditRun = (run: TestRunListItem) => {
        setEditingRun(run);
        setIsEditRunModalOpen(true);
    };

    const handleShareRun = async (e: React.MouseEvent, runId: string) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/test-manager/runs?runId=${runId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard');
        } catch (err) {
            console.error('Failed to copy link: ', err);
            toast.error('Failed to copy link');
        }
    };

    const handleUpdateRun = async (runId: string, data: { title: string; groupId: string | null; tags: string[]; additionalTestCaseIds?: string[] }) => {
        try {
            await testRunApi.updateTestRun(runId, {
                title: data.title,
                groupId: data.groupId,
                tags: data.tags,
                additionalTestCaseIds: data.additionalTestCaseIds,
            });
            toast.success('Test run updated');
            setTestRuns((previous) => previous.map((run) => (
                run.id === runId
                    ? {
                        ...run,
                        title: data.title,
                        groupId: data.groupId || undefined,
                        tags: data.tags,
                        updatedAt: new Date().toISOString(),
                    }
                    : run
            )));
            fetchTags();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to update test run');
            throw error;
        }
    };

    const handleExecuteRun = async (runId: string) => {
        await loadDetailRun(runId);
    };

    const handleOpenExecuteFromDetail = (itemIndex: number, itemOrder?: number[]) => {
        if (!detailRun) return;
        setExecuteRun(detailRun);
        setExecuteStartIndex(itemIndex);
        setExecuteItemOrder(itemOrder);
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
        fetchRuns(true);
    };

    const mergeLatestCaseSnapshot = useCallback((run: TestRun, caseId: string, refreshedCase: ReturnType<typeof mapTestCaseResponse>): TestRun => {
        return {
            ...run,
            items: run.items.map((item) => (
                item.caseId === caseId
                    ? {
                        ...item,
                        caseSnapshot: {
                            title: refreshedCase.title,
                            priority: refreshedCase.priority,
                            suiteId: refreshedCase.suiteId,
                            suiteName: refreshedCase.suite,
                            area: refreshedCase.area,
                            expectedResult: refreshedCase.expectedResult,
                            testDescription: refreshedCase.testDescription,
                            stepsContent: refreshedCase.stepsContent,
                        },
                    }
                    : item
            )),
        };
    }, []);

    const handleRefreshRunCase = useCallback(async (caseId: string) => {
        try {
            const latestCaseResponse = await getTestCase(caseId);
            const refreshedCase = mapTestCaseResponse(latestCaseResponse);

            setTestCases((currentCases) => {
                const hasExistingCase = currentCases.some((testCase) => testCase.id === refreshedCase.id);
                if (!hasExistingCase) {
                    return [...currentCases, refreshedCase];
                }

                return currentCases.map((testCase) => (
                    testCase.id === refreshedCase.id ? refreshedCase : testCase
                ));
            });

            setExecuteRun((currentRun) => (
                currentRun ? mergeLatestCaseSnapshot(currentRun, caseId, refreshedCase) : currentRun
            ));
            setDetailRun((currentRun) => (
                currentRun ? mergeLatestCaseSnapshot(currentRun, caseId, refreshedCase) : currentRun
            ));
        } catch (error: unknown) {
            const message = (error as Error).message || 'Failed to refresh test case';
            toast.error(message);
            throw error;
        }
    }, [mergeLatestCaseSnapshot, setTestCases]);

    const handleCreateBugFromRun = useCallback(async (data: CreateTicketRequest) => {
        if (!activeProject) {
            throw new Error('No active project selected');
        }
        await createTicket(activeProject, data);
    }, [activeProject, createTicket]);

    const groupNameById = useMemo(
        () => new Map(testRunGroups.map((group) => [group.id, group.name])),
        [testRunGroups]
    );

    const allDescendantGroupIds = useCallback((groupId: string): Set<string> => {
        const ids = new Set<string>([groupId]);
        const children = testRunGroups.filter(g => g.parentId === groupId);
        for (const child of children) {
            const childDescendants = allDescendantGroupIds(child.id);
            childDescendants.forEach(id => ids.add(id));
        }
        return ids;
    }, [testRunGroups]);

    const filteredRuns = useMemo(() => {
        const groupFilteredRuns = testRuns.filter((run) => {
            if (selectedGroupFilter === 'all') return true;
            if (selectedGroupFilter === 'ungrouped') return !run.groupId;
            const groupIds = allDescendantGroupIds(selectedGroupFilter);
            return run.groupId ? groupIds.has(run.groupId) : false;
        });

        return filterTestRunsBySearch(groupFilteredRuns, searchQuery, groupNameById);
    }, [testRuns, selectedGroupFilter, searchQuery, groupNameById, allDescendantGroupIds]);

    const isDetailLoading = Boolean(detailRunId) && (!detailRun || detailRun.id !== detailRunId);

    // If a run is selected for detail view, show it regardless of activeProject state
    if (detailRunId) {
        return (
            <>
                {isDetailLoading ? (
                    <div className="flex flex-col h-auto sm:h-full bg-white dark:bg-gray-900">
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 sm:sticky sm:top-0 sm:z-20">
                            <button
                                onClick={closeDetailView}
                                className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                aria-label="Back to test runs"
                            >
                                <ChevronRight className="h-5 w-5 rotate-180" />
                            </button>
                            <div>
                                <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Loading test run</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Fetching run details...</p>
                            </div>
                        </div>

                        <div className="flex flex-1 items-center justify-center px-6 py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    </div>
                ) : detailRun ? (
                    <RunDetailView
                        testRun={detailRun}
                        searchQuery={searchQuery}
                        onBack={closeDetailView}
                        onUpdateItem={handleDetailUpdateItem}
                        onComplete={handleCompleteRun}
                        onOpenExecute={handleOpenExecuteFromDetail}
                        availableTestCases={testCases}
                        availableSuites={testSuites}
                    />
                ) : null}

                {/* Execute Run Modal (from detail view) */}
                <ExecuteRunModal
                    isOpen={isExecuteModalOpen}
                    onClose={() => {
                        setIsExecuteModalOpen(false);
                        setExecuteRun(null);
                        setExecuteItemOrder(undefined);
                    }}
                    testRun={executeRun}
                    onUpdateItem={handleUpdateRunItem}
                    onRefreshCurrentCase={handleRefreshRunCase}
                    onComplete={handleCompleteRun}
                    onCreateTicket={handleCreateBugFromRun}
                    startIndex={executeStartIndex}
                    itemOrder={executeItemOrder}
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
                    <ContextBreadcrumb showSuiteSelector={false} className="border-b-0" />
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
                <div ref={runsListContainerRef} className="flex-1 sm:overflow-auto p-4 bg-gray-50/50 dark:bg-gray-900">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredRuns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <Play className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No Test Runs Found</h3>
                            <p className="text-sm">
                                {searchQuery.trim()
                                    ? 'No test runs match your search.'
                                    : selectedGroupFilter !== 'all'
                                    ? "No test runs in this group."
                                    : "Create a test run to start executing your test cases"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredRuns.map((run) => {
                                const executedCount = run.resultsSummary.passed + run.resultsSummary.failed;
                                const computedPassRate = executedCount > 0
                                    ? Math.round((run.resultsSummary.passed / executedCount) * 100)
                                    : 0;

                                return (
                                <div
                                    key={run.id}
                                    className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:hover:shadow-none transition-shadow cursor-pointer"
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
                                                    {computedPassRate}% Pass Rate
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => handleShareRun(e, run.id)}
                                                className="p-2 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Copy link to Test Run"
                                                aria-label="Copy link to test run"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </button>
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
                                );
                            })}
                            {hasMoreRuns && (
                                <div ref={loadMoreSentinelRef} className="flex justify-center py-2">
                                    {isLoadingMore && (
                                        <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading more runs...
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex justify-end">
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                    Loaded {Math.min(runsOffset, filteredRuns.length)} / {runsTotal || filteredRuns.length} runs
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Run Modal */}
            <CreateRunModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setPreselectedCaseIds([]);
                    setCreateModalInitialTitle('');
                }}
                onSubmit={handleCreateRun}
                testCases={testCases}
                testSuites={testSuites.map(s => ({ id: s.id, name: s.name }))}
                testRunGroups={testRunGroups}
                tagSuggestions={tagSuggestions}
                initialTitle={createModalInitialTitle}
                initialGroupId={selectedGroupFilter !== 'all' && selectedGroupFilter !== 'ungrouped' ? selectedGroupFilter : undefined}
                initialSelectedCaseIds={preselectedCaseIds}
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
                allGroups={testRunGroups}
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
                testCases={testCases}
                testSuites={testSuites.map((suite) => ({ id: suite.id, name: suite.name }))}
                onSubmit={handleUpdateRun}
                tagSuggestions={tagSuggestions}
            />
        </div>
    );
};

export default TestRunsPage;
