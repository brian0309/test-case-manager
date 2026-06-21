import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { shallow } from 'zustand/shallow';
import TestCaseTable, { SortInfo } from '../../components/testManager/TestCaseTable';
import TestCaseModal from '../../components/testManager/TestCaseModal';
import TestCaseViewModal from '../../components/testManager/TestCaseViewModal';
import FilterModal from '../../components/testManager/FilterModal';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import GeminiGenerationModal from '../../components/testManager/GeminiGenerationModal';
import ExportTestCasesModal from '../../components/testManager/ExportTestCasesModal';
import ImportTestCasesModal from '../../components/testManager/ImportTestCasesModal';
import ProjectPresenceIndicator from '../../components/testManager/ProjectPresenceIndicator';
import { mapTestCaseResponse, useTestManagerStore } from '../../store/testManagerStore';
import { useRealtimeTestCases } from '../../hooks/useRealtimeTestCases';
import { useProjectPresence } from '../../hooks/useProjectPresence';
import { TestCase, Status, Priority, CustomFieldDefinition, HiddenDefaultColumns } from '../../types/testManager';
import { reorderTestCases, getTestCase, getTestSuite, bulkImportTestCasesWithSuite, getTestCasesByProjectPaginated, getTestCasesBySuitePaginated } from '../../services/testManagerApi';
import { exportTestCasesToCSV, exportTestCasesToXLSX, ExportColumn } from '../../utils/exportTestCases';
import { escapeHtml } from '../../utils/sanitize';
import { CreateTestCaseWithSuiteRequest, UpdateTestCaseRequest } from '../../types/api/testManager.api';
import { Sparkles, GripVertical, ArrowUp, ArrowDown, RotateCcw, Tag, X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { getTagColor } from '../../utils/tagColors';

const getSuiteTagFilterStorageKey = (projectId: string) => `testSuitesTagFilter:${projectId}`;
const PROJECT_CASES_PAGE_SIZE = 30;
const STATUS_FILTER_PAGE_SIZE = 100;

type StoredSuiteTagFilter = {
    selectedTags: string[];
    includeNoTags: boolean;
};

const TestCasesPage: React.FC = () => {
    const {
        testCases,
        activeSuite,
        activeSuiteId,
        activeProject,
        activeArea,
        updateTestCase,
        createTestCase,
        cloneTestCase,
        fetchProjects,
        projects,
        testSuites,
        fetchTestSuites,
        fetchTestCases,
        fetchTestCasesByProject,
        filters,
        isFilterModalOpen,
        searchQuery,
        clearSearchQuery,
        isSelectionMode,
        selectedTestCaseIds,
        toggleTestCaseSelection,
        selectAllTestCases,
        clearSelection,
        fetchProjectSettings,
        getProjectSettings,
        setActiveProject,
        setActiveSuiteWithId,
        setActiveArea,
        setExportTestCasesCallback,
        setImportTestCasesCallback,
        setTestCases,
    } = useTestManagerStore(
        (state) => ({
            testCases: state.testCases,
            activeSuite: state.activeSuite,
            activeSuiteId: state.activeSuiteId,
            activeProject: state.activeProject,
            activeArea: state.activeArea,
            updateTestCase: state.updateTestCase,
            createTestCase: state.createTestCase,
            cloneTestCase: state.cloneTestCase,
            fetchProjects: state.fetchProjects,
            projects: state.projects,
            testSuites: state.testSuites,
            fetchTestSuites: state.fetchTestSuites,
            fetchTestCases: state.fetchTestCases,
            fetchTestCasesByProject: state.fetchTestCasesByProject,
            filters: state.filters,
            isFilterModalOpen: state.isFilterModalOpen,
            searchQuery: state.searchQuery,
            clearSearchQuery: state.clearSearchQuery,
            isSelectionMode: state.isSelectionMode,
            selectedTestCaseIds: state.selectedTestCaseIds,
            toggleTestCaseSelection: state.toggleTestCaseSelection,
            selectAllTestCases: state.selectAllTestCases,
            clearSelection: state.clearSelection,
            fetchProjectSettings: state.fetchProjectSettings,
            getProjectSettings: state.getProjectSettings,
            setActiveProject: state.setActiveProject,
            setActiveSuiteWithId: state.setActiveSuiteWithId,
            setActiveArea: state.setActiveArea,
            setExportTestCasesCallback: state.setExportTestCasesCallback,
            setImportTestCasesCallback: state.setImportTestCasesCallback,
            setTestCases: state.setTestCases,
        }),
        shallow
    );

    // Enable real-time updates for test cases
    useRealtimeTestCases({
        projectId: activeProject,
        suiteId: activeSuiteId,
    });

    // Track users present in the same project
    const { projectUsers } = useProjectPresence({
        projectId: activeProject,
    });

    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
    const [viewCase, setViewCase] = useState<TestCase | null>(null);
    const [isListEditMode] = useState(false);
    const [sortInfo, setSortInfo] = useState<SortInfo | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
    const [isProjectCasesLoading, setIsProjectCasesLoading] = useState(false);
    const [isProjectCasesLoadingMore, setIsProjectCasesLoadingMore] = useState(false);
    const [projectCasesHasMore, setProjectCasesHasMore] = useState(false);
    const [projectCasesOffset, setProjectCasesOffset] = useState(0);
    const [projectCasesTotal, setProjectCasesTotal] = useState(0);
    const [isSuiteCasesLoading, setIsSuiteCasesLoading] = useState(false);
    const [isSuiteCasesLoadingMore, setIsSuiteCasesLoadingMore] = useState(false);
    const [suiteCasesHasMore, setSuiteCasesHasMore] = useState(false);
    const [suiteCasesOffset, setSuiteCasesOffset] = useState(0);
    const [suiteCasesTotal, setSuiteCasesTotal] = useState(0);
    const [selectedSuiteTags, setSelectedSuiteTags] = useState<string[]>([]);
    const [includeSuitesWithNoTags, setIncludeSuitesWithNoTags] = useState(false);
    const [isSuiteTagFilterOpen, setIsSuiteTagFilterOpen] = useState(false);
    const suiteTagFilterRef = useRef<HTMLDivElement>(null);
    const projectCasesScrollContainerRef = useRef<HTMLDivElement>(null);
    const projectCasesSentinelRef = useRef<HTMLDivElement>(null);
    const suiteCasesSentinelRef = useRef<HTMLDivElement>(null);
    const statusFilterSentinelRef = useRef<HTMLDivElement>(null);
    const [statusFilterVisibleCount, setStatusFilterVisibleCount] = useState(STATUS_FILTER_PAGE_SIZE);
    
    // Track if we've already processed the testCaseId URL parameter
    const processedTestCaseIdRef = useRef<string | null>(null);
    const processedSuiteIdRef = useRef<string | null>(null);

    const uniqueAreas = useMemo(
        () => Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort(),
        [testCases]
    );

    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const loadProjectCases = useCallback(async (reset = true, offsetValue = 0) => {
        if (!activeProject) return;

        if (reset) {
            setIsProjectCasesLoading(true);
            setTestCases([]);
            setProjectCasesOffset(0);
            setProjectCasesHasMore(false);
            setProjectCasesTotal(0);
        } else {
            setIsProjectCasesLoadingMore(true);
        }

        try {
            const currentOffset = reset ? 0 : offsetValue;
            const result = await getTestCasesByProjectPaginated(activeProject, {
                limit: PROJECT_CASES_PAGE_SIZE,
                offset: currentOffset,
            });
            const mapped = result.items.map(mapTestCaseResponse);

            setTestCases((previous) => {
                if (reset) {
                    return mapped;
                }

                const existingIds = new Set(previous.map((testCase) => testCase.id));
                const dedupedIncoming = mapped.filter((testCase) => !existingIds.has(testCase.id));
                return [...previous, ...dedupedIncoming];
            });

            const loadedCount = mapped.length;
            const totalLoaded = currentOffset + loadedCount;
            setProjectCasesOffset(totalLoaded);
            setProjectCasesTotal(result.meta.total);
            setProjectCasesHasMore(result.meta.hasMore && totalLoaded < result.meta.total);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load test cases');
        } finally {
            if (reset) {
                setIsProjectCasesLoading(false);
            } else {
                setIsProjectCasesLoadingMore(false);
            }
        }
    }, [activeProject, setTestCases]);

    const loadSuiteCases = useCallback(async (reset = true, offsetValue = 0) => {
        if (!activeSuiteId) return;

        if (reset) {
            setIsSuiteCasesLoading(true);
            setTestCases([]);
            setSuiteCasesOffset(0);
            setSuiteCasesHasMore(false);
            setSuiteCasesTotal(0);
        } else {
            setIsSuiteCasesLoadingMore(true);
        }

        try {
            const currentOffset = reset ? 0 : offsetValue;
            const result = await getTestCasesBySuitePaginated(activeSuiteId, {
                limit: PROJECT_CASES_PAGE_SIZE,
                offset: currentOffset,
            });
            const mapped = result.items.map(mapTestCaseResponse);

            setTestCases((previous) => {
                if (reset) {
                    return mapped;
                }

                const existingIds = new Set(previous.map((testCase) => testCase.id));
                const dedupedIncoming = mapped.filter((testCase) => !existingIds.has(testCase.id));
                return [...previous, ...dedupedIncoming];
            });

            const loadedCount = mapped.length;
            const totalLoaded = currentOffset + loadedCount;
            setSuiteCasesOffset(totalLoaded);
            setSuiteCasesTotal(result.meta.total);
            setSuiteCasesHasMore(result.meta.hasMore && totalLoaded < result.meta.total);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load test cases');
        } finally {
            if (reset) {
                setIsSuiteCasesLoading(false);
            } else {
                setIsSuiteCasesLoadingMore(false);
            }
        }
    }, [activeSuiteId, setTestCases]);

    const requiresFullSuiteDataset = useMemo(() => (
        !!activeSuiteId && (
            !!activeArea ||
            !!searchQuery ||
            filters.status.length > 0 ||
            filters.priority.length > 0 ||
            !!filters.dateRange.start ||
            !!filters.dateRange.end ||
            !!filters.createdAtRange?.start ||
            !!filters.createdAtRange?.end
        )
    ), [
        activeArea,
        activeSuiteId,
        filters.createdAtRange?.end,
        filters.createdAtRange?.start,
        filters.dateRange.end,
        filters.dateRange.start,
        filters.priority,
        filters.status,
        searchQuery,
    ]);

    // Restore suite tag filter state per project (shared with TestSuitesPage)
    useEffect(() => {
        if (!activeProject || typeof window === 'undefined') {
            setSelectedSuiteTags([]);
            setIncludeSuitesWithNoTags(false);
            return;
        }

        try {
            const rawValue = localStorage.getItem(getSuiteTagFilterStorageKey(activeProject));
            if (!rawValue) {
                setSelectedSuiteTags([]);
                setIncludeSuitesWithNoTags(false);
                return;
            }

            const parsed = JSON.parse(rawValue) as Partial<StoredSuiteTagFilter>;
            setSelectedSuiteTags(Array.isArray(parsed.selectedTags) ? parsed.selectedTags.filter((tag): tag is string => typeof tag === 'string') : []);
            setIncludeSuitesWithNoTags(typeof parsed.includeNoTags === 'boolean' ? parsed.includeNoTags : false);
        } catch (error) {
            console.error('Failed to restore suite tag filters from localStorage:', error);
            setSelectedSuiteTags([]);
            setIncludeSuitesWithNoTags(false);
        }
    }, [activeProject]);

    // Persist suite tag filter state per project
    useEffect(() => {
        if (!activeProject || typeof window === 'undefined') {
            return;
        }

        const payload: StoredSuiteTagFilter = {
            selectedTags: selectedSuiteTags,
            includeNoTags: includeSuitesWithNoTags,
        };

        localStorage.setItem(getSuiteTagFilterStorageKey(activeProject), JSON.stringify(payload));
    }, [activeProject, selectedSuiteTags, includeSuitesWithNoTags]);

    // Close suite tag filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suiteTagFilterRef.current && !suiteTagFilterRef.current.contains(event.target as Node)) {
                setIsSuiteTagFilterOpen(false);
            }
        };

        if (isSuiteTagFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSuiteTagFilterOpen]);

    // Load project settings when active project changes
    useEffect(() => {
        if (activeProject) {
            fetchProjectSettings(activeProject);
        }
    }, [activeProject, fetchProjectSettings]);

    // Register export callback
    useEffect(() => {
        setExportTestCasesCallback(() => setIsExportModalOpen(true));
        return () => setExportTestCasesCallback(null);
    }, [setExportTestCasesCallback]);

    // Register import callback
    useEffect(() => {
        setImportTestCasesCallback(() => setIsImportModalOpen(true));
        return () => setImportTestCasesCallback(null);
    }, [setImportTestCasesCallback]);

    // Get custom fields and visibility settings for table (filter out deleted fields)
    const projectSettings = activeProject ? getProjectSettings(activeProject) : null;
    const customFieldDefinitions: CustomFieldDefinition[] = (projectSettings?.testCases?.customFields || []).filter((f: CustomFieldDefinition) => !f.deleted);
    const visibleCustomFieldIds: string[] = projectSettings?.testCases?.table?.visibleCustomFieldIds || [];
    const hiddenColumns: HiddenDefaultColumns = projectSettings?.testCases?.table?.hiddenDefaultColumns || {};

    // Ensure projects are loaded when this page is visited directly
    useEffect(() => {
        fetchProjects?.();
        clearSearchQuery(); // Clear search when entering
        return () => clearSearchQuery(); // Clear search when leaving
    }, [fetchProjects, clearSearchQuery]);
    
    // Handle testCaseId URL parameter for direct links
    useEffect(() => {
        const testCaseId = searchParams.get('testCaseId');
        
        // Skip if no testCaseId or already processed this ID
        if (!testCaseId || processedTestCaseIdRef.current === testCaseId) {
            return;
        }
        
        // Mark as processed immediately to prevent double-fetching in Strict Mode
        processedTestCaseIdRef.current = testCaseId;
        
        const loadTestCaseFromUrl = async () => {
            try {
                // Fetch the test case from API
                const testCaseResponse = await getTestCase(testCaseId);
                
                // Set up the context (project, suite, area)
                if (testCaseResponse.projectId) {
                    setActiveProject(testCaseResponse.projectId);
                    
                    // Fetch test suites for the project
                    await fetchTestSuites(testCaseResponse.projectId);
                }
                
                if (testCaseResponse.suiteId && testCaseResponse.suite) {
                    setActiveSuiteWithId(testCaseResponse.suiteId, testCaseResponse.suite);
                    
                    // Fetch test cases for the suite
                    await fetchTestCases(testCaseResponse.suiteId);
                }
                
                if (testCaseResponse.area) {
                    setActiveArea(testCaseResponse.area);
                }
                
                // Map the API response to TestCase format and open the view modal
                // Note: steps array is empty as the app uses stepsContent (rich text) instead
                const mappedTestCase: TestCase = {
                    id: testCaseResponse.id,
                    title: testCaseResponse.title,
                    priority: testCaseResponse.priority as Priority,
                    status: testCaseResponse.status as Status,
                    createdAt: testCaseResponse.createdAt,
                    lastModified: testCaseResponse.lastModified,
                    assignedTester: testCaseResponse.assignedTester,
                    steps: [], // Legacy field - app uses stepsContent for rich text steps
                    stepsContent: testCaseResponse.stepsContent,
                    suite: testCaseResponse.suite,
                    suiteId: testCaseResponse.suiteId,
                    area: testCaseResponse.area,
                    expectedResult: testCaseResponse.expectedResult,
                    testDescription: testCaseResponse.testDescription,
                    comments: testCaseResponse.comments,
                    customFields: testCaseResponse.customFields,
                    projectId: testCaseResponse.projectId,
                    order: testCaseResponse.order,
                };
                
                setViewCase(mappedTestCase);
                
                // Clear the URL parameter after loading (optional, keeps URL clean)
                setSearchParams({}, { replace: true });
                
            } catch (error) {
                console.error('Failed to load test case from URL:', error);
                toast.error('Failed to load test case. It may not exist or you may not have access.');
                // Clear the URL parameter on error
                setSearchParams({}, { replace: true });
            }
        };
        
        loadTestCaseFromUrl();
        
    }, [searchParams, setSearchParams, setActiveProject, setActiveSuiteWithId, setActiveArea, fetchTestSuites, fetchTestCases]);

    // Handle suiteId URL parameter for direct links to a suite
    useEffect(() => {
        const suiteId = searchParams.get('suiteId');
        const testCaseId = searchParams.get('testCaseId');
        
        // Skip if no suiteId, already processed, or if testCaseId is present (which handles its own suite context)
        if (!suiteId || testCaseId || processedSuiteIdRef.current === suiteId) {
            return;
        }
        
        // Mark as processed immediately to prevent double-fetching
        processedSuiteIdRef.current = suiteId;
        
        const loadTestSuiteFromUrl = async () => {
            try {
                // Fetch the test suite from API
                const suiteResponse = await getTestSuite(suiteId);
                
                // Set up the context (project, suite)
                if (suiteResponse.projectId) {
                    setActiveProject(suiteResponse.projectId);
                    
                    // Fetch all suites for this project so the dropdown is populated
                    await fetchTestSuites(suiteResponse.projectId);
                    
                    // Set the active suite
                    setActiveSuiteWithId(suiteResponse.id, suiteResponse.name);
                }
                
                // Clear the URL parameter
                setSearchParams({}, { replace: true });
                
                toast.success(`Loaded suite: ${suiteResponse.name}`);
            } catch (error) {
                console.error('Failed to load test suite from URL:', error);
                toast.error('Failed to load test suite. It may not exist or you may not have access.');
                setSearchParams({}, { replace: true });
            }
        };
        
        loadTestSuiteFromUrl();
        
    }, [searchParams, setSearchParams, setActiveProject, setActiveSuiteWithId, fetchTestSuites, fetchTestCases]);

    // Fetch test suites when project is active
    useEffect(() => {
        // Prevent race condition: if there is a suiteId or testCaseId in the URL,
        // do not fetch data based on the old activeProject. Let the URL handler update the context first.
        if (searchParams.get('suiteId') || searchParams.get('testCaseId')) return;

        if (activeProject) {
            fetchTestSuites(activeProject);
        }
    }, [activeProject, fetchTestSuites, searchParams]);

    // Fetch test cases based on suite or project selection
    useEffect(() => {
        // Prevent race condition: if there is a suiteId or testCaseId in the URL,
        // do not fetch data based on the old activeSuiteId/activeProject.
        if (searchParams.get('suiteId') || searchParams.get('testCaseId')) return;

        if (activeSuiteId) {
            setProjectCasesHasMore(false);
            setProjectCasesOffset(0);
            setProjectCasesTotal(0);

            if (requiresFullSuiteDataset) {
                setSuiteCasesHasMore(false);
                setSuiteCasesOffset(0);
                setSuiteCasesTotal(0);
                fetchTestCases(activeSuiteId);
            } else {
                loadSuiteCases(true, 0);
            }
        } else if (activeProject) {
            setSuiteCasesHasMore(false);
            setSuiteCasesOffset(0);
            setSuiteCasesTotal(0);
            // If no suite is selected but project is, fetch cases in pages
            loadProjectCases(true, 0);
        }
    }, [
        activeArea,
        activeProject,
        activeSuiteId,
        fetchTestCases,
        fetchTestCasesByProject,
        loadProjectCases,
        loadSuiteCases,
        requiresFullSuiteDataset,
        searchParams,
    ]);

    const handleLoadMoreSuiteCases = useCallback(() => {
        if (!activeSuiteId || !suiteCasesHasMore || isSuiteCasesLoading || isSuiteCasesLoadingMore) {
            return;
        }

        loadSuiteCases(false, suiteCasesOffset);
    }, [activeSuiteId, isSuiteCasesLoading, isSuiteCasesLoadingMore, loadSuiteCases, suiteCasesHasMore, suiteCasesOffset]);

    const handleLoadMoreProjectCases = useCallback(() => {
        if (activeSuiteId || !projectCasesHasMore || isProjectCasesLoading || isProjectCasesLoadingMore) {
            return;
        }

        loadProjectCases(false, projectCasesOffset);
    }, [activeSuiteId, isProjectCasesLoading, isProjectCasesLoadingMore, loadProjectCases, projectCasesHasMore, projectCasesOffset]);

    useEffect(() => {
        if (activeSuiteId || !projectCasesHasMore || isProjectCasesLoading || isProjectCasesLoadingMore) {
            return;
        }

        const sentinel = projectCasesSentinelRef.current;
        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first?.isIntersecting) {
                    handleLoadMoreProjectCases();
                }
            },
            {
                root: projectCasesScrollContainerRef.current,
                rootMargin: '200px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [activeSuiteId, handleLoadMoreProjectCases, isProjectCasesLoading, isProjectCasesLoadingMore, projectCasesHasMore]);

    useEffect(() => {
        if (!activeSuiteId || requiresFullSuiteDataset || !suiteCasesHasMore || isSuiteCasesLoading || isSuiteCasesLoadingMore) {
            return;
        }

        const sentinel = suiteCasesSentinelRef.current;
        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first?.isIntersecting) {
                    handleLoadMoreSuiteCases();
                }
            },
            {
                root: projectCasesScrollContainerRef.current,
                rootMargin: '200px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [
        activeSuiteId,
        handleLoadMoreSuiteCases,
        isSuiteCasesLoading,
        isSuiteCasesLoadingMore,
        requiresFullSuiteDataset,
        suiteCasesHasMore,
    ]);

    // Open modal if navigation state asked for it (from toolbar quick-add)
    useEffect(() => {
        try {
            const open = (location.state as { openNewCase?: boolean } | null)?.openNewCase;
            if (open) {
                const newCase: TestCase = {
                    id: `new-${Date.now()}`,
                    title: '',
                    priority: Priority.Medium,
                    status: Status.Draft,
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    assignedTester: {
                        id: 'u-current',
                        name: 'You',
                        avatar: 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
                    },
                    suite: activeSuite || '',
                    area: activeArea || '',
                    steps: [],
                    projectId: activeProject || '',
                };

                setSelectedCase(newCase);

                // clear navigation state so it doesn't reopen on refresh/back
                navigate(location.pathname, { replace: true, state: {} });
            }
        } catch {
            // ignore
        }
    }, [location, navigate, activeProject, activeSuite, activeArea]);

    const handleRowClick = useCallback((item: TestCase) => {
        if (isListEditMode) return;
        // Row click opens view-only modal
        setViewCase(item);
    }, [isListEditMode]);

    const handleViewClick = useCallback((item: TestCase) => {
        // View button opens edit modal
        setSelectedCase(item);
    }, []);

    const handleCloneClick = useCallback(async (item: TestCase) => {
        try {
            await cloneTestCase(item.id);
            toast.success('Test case cloned successfully');
        } catch (error) {
            toast.error('Failed to clone test case');
            console.error('Clone error:', error);
        }
    }, [cloneTestCase]);

    const handleEditFromView = useCallback((item: TestCase) => {
        // Close view modal and open edit modal
        setViewCase(null);
        setSelectedCase(item);
    }, []);

    const handleInlineUpdate = useCallback((caseId: string, field: keyof TestCase, value: string | boolean | number | Status | Priority) => {
        updateTestCase(caseId, { [field]: value } as UpdateTestCaseRequest);
    }, [updateTestCase]);

    const handleStatusChange = useCallback((caseId: string, status: Status) => {
        updateTestCase(caseId, { status: status });
    }, [updateTestCase]);

    const allSuiteTags = useMemo(
        () => Array.from(new Set(testSuites.flatMap(suite => suite.tags || []))).sort(),
        [testSuites]
    );

    const hasSuitesWithNoTags = useMemo(
        () => testSuites.some(suite => !suite.tags || suite.tags.length === 0),
        [testSuites]
    );

    const activeSuiteTagFilterCount = selectedSuiteTags.length + (includeSuitesWithNoTags ? 1 : 0);
    const isSuiteTagFilterModeOn = activeSuiteTagFilterCount > 0;

    const filteredSuitesForBreadcrumb = useMemo(() => {
        if (!isSuiteTagFilterModeOn) {
            return testSuites;
        }

        return testSuites.filter(suite => {
            const suiteHasNoTags = !suite.tags || suite.tags.length === 0;
            const matchesSelectedTags =
                selectedSuiteTags.length === 0 ||
                selectedSuiteTags.every(tag => suite.tags?.includes(tag));

            if (includeSuitesWithNoTags) {
                return selectedSuiteTags.length === 0
                    ? suiteHasNoTags
                    : (matchesSelectedTags || suiteHasNoTags);
            }

            return matchesSelectedTags;
        });
    }, [testSuites, selectedSuiteTags, includeSuitesWithNoTags, isSuiteTagFilterModeOn]);

    // Memoize the filtered & searched test cases to avoid re-computing on every render
    const displayedCases = useMemo(() => {
        let cases = activeArea
            ? testCases.filter(tc => tc.area === activeArea)
            : testCases;

        // Apply client-side filters
        if (filters.status.length > 0) {
            cases = cases.filter(tc => filters.status.includes(tc.status));
        }

        if (filters.priority.length > 0) {
            cases = cases.filter(tc => filters.priority.includes(tc.priority));
        }

        if (filters.dateRange.start) {
            const startDate = new Date(filters.dateRange.start);
            startDate.setHours(0, 0, 0, 0);
            const startTime = startDate.getTime();
            cases = cases.filter(tc => new Date(tc.lastModified).getTime() >= startTime);
        }

        if (filters.dateRange.end) {
            const endDate = new Date(filters.dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            const endTime = endDate.getTime();
            cases = cases.filter(tc => new Date(tc.lastModified).getTime() <= endTime);
        }

        if (filters.createdAtRange?.start) {
            const startDate = new Date(filters.createdAtRange.start);
            startDate.setHours(0, 0, 0, 0);
            const startTime = startDate.getTime();
            cases = cases.filter(tc => new Date(tc.createdAt).getTime() >= startTime);
        }

        if (filters.createdAtRange?.end) {
            const endDate = new Date(filters.createdAtRange.end);
            endDate.setHours(23, 59, 59, 999);
            const endTime = endDate.getTime();
            cases = cases.filter(tc => new Date(tc.createdAt).getTime() <= endTime);
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            cases = cases.filter(tc =>
                tc.title.toLowerCase().includes(query) ||
                tc.id.toLowerCase().includes(query) ||
                (tc.area && tc.area.toLowerCase().includes(query))
            );
        }

        return cases;
    }, [testCases, activeArea, filters, searchQuery]);

    // Client-side pagination for status-filtered suite view
    const isStatusFilterActive = filters.status.length > 0 && !!activeSuiteId;

    const paginatedDisplayedCases = useMemo(() => {
        if (isStatusFilterActive) {
            return displayedCases.slice(0, statusFilterVisibleCount);
        }
        return displayedCases;
    }, [displayedCases, isStatusFilterActive, statusFilterVisibleCount]);

    const statusFilterHasMore = isStatusFilterActive && statusFilterVisibleCount < displayedCases.length;

    // Reset visible count when status filter or active suite changes
    useEffect(() => {
        setStatusFilterVisibleCount(STATUS_FILTER_PAGE_SIZE);
    }, [filters.status, activeSuiteId]);

    // IntersectionObserver for status-filter sentinel
    useEffect(() => {
        if (!statusFilterHasMore) return;

        const sentinel = statusFilterSentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setStatusFilterVisibleCount(prev => prev + STATUS_FILTER_PAGE_SIZE);
                }
            },
            {
                root: projectCasesScrollContainerRef.current,
                rootMargin: '200px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [statusFilterHasMore]);

    const handleSelectAll = useCallback((selectAll: boolean) => {
        if (selectAll) {
            selectAllTestCases(displayedCases.map(tc => tc.id));
        } else {
            clearSelection();
        }
    }, [displayedCases, selectAllTestCases, clearSelection]);

    const handleSaveCase = async (updatedCase: TestCase): Promise<TestCase | void> => {
        const exists = testCases.find(c => c.id === updatedCase.id);
        if (exists) {
            await updateTestCase(updatedCase.id, {
                title: updatedCase.title,
                priority: updatedCase.priority,
                status: updatedCase.status,
                area: updatedCase.area,
                expectedResult: updatedCase.expectedResult,
                testDescription: updatedCase.testDescription,
                stepsContent: updatedCase.stepsContent,
                comments: updatedCase.comments,
                customFields: updatedCase.customFields,
            });
            // Don't close modal - auto-save should keep it open
            return;
        }

        // New case: attempt to create via API if we can resolve a suite id
        // Find a suite matching the selected suite name within the selected project
        const suite = testSuites.find(s => s.name === updatedCase.suite && s.projectId === updatedCase.projectId);
        if (!suite) {
            throw new Error('Please select a Test Suite for the new case before saving.');
        }

        const createdCase = await createTestCase(suite.id, {
            title: updatedCase.title,
            priority: updatedCase.priority,
            status: updatedCase.status,
            area: updatedCase.area,
            expectedResult: updatedCase.expectedResult,
            testDescription: updatedCase.testDescription,
            stepsContent: updatedCase.stepsContent,
            comments: updatedCase.comments,
            customFields: updatedCase.customFields,
        });

        // Return the created case so the modal can update its state with the real ID
        return createdCase;
    };

    // Handle drag-and-drop reordering of test cases
    const handleReorder = async (reorderedCases: TestCase[]) => {
        if (!activeSuiteId) {
            toast.error('Reordering is only available within a specific suite');
            return;
        }

        try {
            const orderedIds = reorderedCases.map(tc => tc.id);
            await reorderTestCases(activeSuiteId, orderedIds);
            // Refetch to get updated order from server
            fetchTestCases(activeSuiteId);
        } catch (error) {
            toast.error('Failed to save new order');
            console.error('Reorder error:', error);
        }
    };

    const handleAddGeneratedCases = async (cases: TestCase[]) => {
        // We need to save these cases to the backend
        // Iterate and create each one
        // Note: createTestCase expects a suiteId.
        if (!activeSuiteId) return;

        for (const testCase of cases) {
            // Format steps into a readable HTML list for the editor
            const stepsHtml = testCase.steps && testCase.steps.length > 0
                ? `<ol>${testCase.steps.map(s => `<li><strong>${escapeHtml(s.action)}</strong> - <em>${escapeHtml(s.expectedResult)}</em></li>`).join('')}</ol>`
                : '';

            await createTestCase(activeSuiteId, {
                title: testCase.title,
                priority: testCase.priority,
                status: testCase.status,
                area: testCase.area,
                expectedResult: (testCase.steps && testCase.steps.length > 0) ? testCase.steps[testCase.steps.length - 1].expectedResult : '',
                testDescription: testCase.testDescription || '',
                stepsContent: stepsHtml,
                comments: '',
            });
        }
        toast.success(`Added ${cases.length} test cases`);
    };

    const handleExportTestCases = (columns: ExportColumn[], format: 'csv' | 'xlsx') => {
        try {
            const projectName = projects.find(p => p.id === activeProject)?.name;
            const suiteName = activeSuite;
            const suiteTagsBySuiteId = testSuites.reduce<Record<string, string[]>>((acc, suite) => {
                if (suite.tags && suite.tags.length > 0) {
                    acc[suite.id] = suite.tags;
                }
                return acc;
            }, {});
            const suiteTagsBySuiteName = testSuites.reduce<Record<string, string[]>>((acc, suite) => {
                if (suite.tags && suite.tags.length > 0) {
                    acc[suite.name] = suite.tags;
                }
                return acc;
            }, {});
            const exportOptions = { columns, suiteTagsBySuiteId, suiteTagsBySuiteName };

            if (format === 'xlsx') {
                exportTestCasesToXLSX(
                    displayedCases,
                    exportOptions,
                    customFieldDefinitions,
                    projectName,
                    suiteName || undefined
                );
            } else {
                exportTestCasesToCSV(
                    displayedCases,
                    exportOptions,
                    customFieldDefinitions,
                    projectName,
                    suiteName || undefined
                );
            }

            toast.success(`Exported ${displayedCases.length} test case${displayedCases.length !== 1 ? 's' : ''} to ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to export test cases');
        }
    };

    const handleImportTestCases = useCallback(async (
        testCases: CreateTestCaseWithSuiteRequest[],
        skipDuplicates: boolean,
        createMissingSuites: boolean
    ) => {
        if (!activeProject) {
            throw new Error('No project selected');
        }

        try {
            const result = await bulkImportTestCasesWithSuite(activeProject, {
                testCases,
                skipDuplicates,
                createMissingSuites,
                defaultSuiteId: activeSuiteId || undefined,
            });

            // Refresh test suites in case new ones were created
            await fetchTestSuites(activeProject);

            // Refresh test cases if we have an active suite
            if (activeSuiteId) {
                await fetchTestCases(activeSuiteId);
            } else {
                await loadProjectCases(true, 0);
            }

            return result;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }, [activeProject, activeSuiteId, fetchTestSuites, fetchTestCases, loadProjectCases]);

    if (!activeProject && !selectedCase) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test cases"
            />
        );
    }

    return (
        <div className="flex flex-col h-auto sm:h-full bg-white dark:bg-gray-900">
            {/* Context Breadcrumb with Project & Suite selectors */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:justify-between bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 sm:sticky sm:top-0 sm:z-20">
                <ContextBreadcrumb 
                    className="border-b-0"
                    showSuiteSelector={true} 
                    filteredSuites={filteredSuitesForBreadcrumb.map(suite => ({ id: suite.id, name: suite.name }))}
                    rightContent={
                        activeProject && projectUsers.length > 0 ? (
                            <ProjectPresenceIndicator users={projectUsers} maxDisplay={4} />
                        ) : null
                    }
                    beforeToggle={allSuiteTags.length > 0 || hasSuitesWithNoTags ? (
                        <div className="relative" ref={suiteTagFilterRef}>
                            <button
                                onClick={() => setIsSuiteTagFilterOpen(!isSuiteTagFilterOpen)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors shadow-sm dark:shadow-none ${
                                    activeSuiteTagFilterCount > 0
                                        ? 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }`}
                            >
                                <Tag size={14} />
                                <span className="hidden sm:inline">Suite Tags</span>
                                {activeSuiteTagFilterCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                                        {activeSuiteTagFilterCount}
                                    </span>
                                )}
                                <ChevronDown size={13} className={`text-gray-400 transition-transform ${isSuiteTagFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSuiteTagFilterOpen && (
                                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                                    <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filter Suite Menu</p>
                                        {activeSuiteTagFilterCount > 0 && (
                                            <button
                                                onClick={() => {
                                                    setSelectedSuiteTags([]);
                                                    setIncludeSuitesWithNoTags(false);
                                                }}
                                                className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                            >
                                                <X size={11} /> Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-52 overflow-y-auto">
                                        {hasSuitesWithNoTags && (
                                            <button
                                                onClick={() => setIncludeSuitesWithNoTags(prev => !prev)}
                                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                                    includeSuitesWithNoTags
                                                        ? 'bg-blue-50 dark:bg-blue-900/30'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                    No Tags
                                                </span>
                                                {includeSuitesWithNoTags && (
                                                    <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                                )}
                                            </button>
                                        )}
                                        {allSuiteTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() =>
                                                    setSelectedSuiteTags(prev =>
                                                        prev.includes(tag) ? prev.filter(currentTag => currentTag !== tag) : [...prev, tag]
                                                    )
                                                }
                                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                                    selectedSuiteTags.includes(tag)
                                                        ? 'bg-blue-50 dark:bg-blue-900/30'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}>
                                                    <Tag className="h-2.5 w-2.5 opacity-70" />
                                                    {tag}
                                                </span>
                                                {selectedSuiteTags.includes(tag) && (
                                                    <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : undefined}
                />
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto px-4 sm:px-6">
                    {/* Sorting controls - Desktop only, next to Generate AI button */}
                    {activeProject && activeSuiteId && sortInfo && (
                        <div className="hidden sm:flex items-center gap-2">
                            {sortInfo.sortMode === 'custom' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full border border-blue-200">
                                    <GripVertical className="h-3 w-3" />
                                    Custom Order
                                </span>
                            ) : (
                                <>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-full border border-purple-200">
                                        {sortInfo.sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                        Sorted by {sortInfo.sortField.charAt(0).toUpperCase() + sortInfo.sortField.slice(1)}
                                    </span>
                                    <button
                                        onClick={sortInfo.resetToCustomOrder}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-md border border-gray-300 transition-colors"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Reset to Custom Order
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    {activeProject && activeSuiteId && (
                        <button
                            onClick={() => setIsGeminiModalOpen(true)}
                            className="flex items-center justify-center sm:justify-start space-x-2 px-3 py-2 sm:py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-md hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm w-full sm:w-auto flex-shrink-0"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Generate with AI</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Test Case Table */}
            <div ref={projectCasesScrollContainerRef} className="flex-1 sm:overflow-auto">
                <TestCaseTable
                    data={paginatedDisplayedCases}
                    onRowClick={handleRowClick}
                    onViewClick={handleViewClick}
                    onCloneClick={handleCloneClick}
                    isEditMode={isListEditMode}
                    onUpdate={handleInlineUpdate}
                    onStatusChange={handleStatusChange}
                    enableReorder={!!activeSuiteId}
                    onReorder={activeSuiteId ? handleReorder : undefined}
                    // Selection props
                    isSelectionMode={isSelectionMode}
                    selectedIds={selectedTestCaseIds}
                    onToggleSelection={toggleTestCaseSelection}
                    onSelectAll={handleSelectAll}
                    // Custom fields and visibility props
                    customFieldDefinitions={customFieldDefinitions}
                    visibleCustomFieldIds={visibleCustomFieldIds}
                    hiddenColumns={hiddenColumns}
                    // Sorting controls in header (desktop only)
                    showSortControlsInHeader={true}
                    onSortInfoChange={setSortInfo}
                    activeArea={activeArea}
                    activeSuiteId={activeSuiteId}
                    loading={isProjectCasesLoading || isSuiteCasesLoading}
                />
                {!activeSuiteId && activeProject && (
                    <div ref={projectCasesSentinelRef} className="flex justify-center py-3">
                        {isProjectCasesLoading ? (
                            <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading test cases...
                            </div>
                        ) : (projectCasesHasMore && isProjectCasesLoadingMore) ? (
                            <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading more test cases...
                            </div>
                        ) : null}
                    </div>
                )}
                {!activeSuiteId && activeProject && (
                    <div className="flex justify-end px-4 pb-3">
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                            Loaded {Math.min(projectCasesOffset, displayedCases.length)} / {projectCasesTotal || displayedCases.length} test cases
                        </div>
                    </div>
                )}
                {activeSuiteId && !requiresFullSuiteDataset && (
                    <div ref={suiteCasesSentinelRef} className="flex justify-center py-3">
                        {isSuiteCasesLoading ? (
                            <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading test cases...
                            </div>
                        ) : (suiteCasesHasMore && isSuiteCasesLoadingMore) ? (
                            <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading more test cases...
                            </div>
                        ) : null}
                    </div>
                )}
                {activeSuiteId && !requiresFullSuiteDataset && (
                    <div className="flex justify-end px-4 pb-3">
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                            Loaded {Math.min(suiteCasesOffset, displayedCases.length)} / {suiteCasesTotal || displayedCases.length} test cases
                        </div>
                    </div>
                )}
                {isStatusFilterActive && (
                    <div ref={statusFilterSentinelRef} className="flex justify-center py-3">
                        {statusFilterHasMore && (
                            <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading more test cases...
                            </div>
                        )}
                    </div>
                )}
                {isStatusFilterActive && (
                    <div className="flex justify-end px-4 pb-3">
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                            Showing {paginatedDisplayedCases.length} / {displayedCases.length} test cases
                        </div>
                    </div>
                )}
            </div>
            {viewCase && (
                <TestCaseViewModal
                    testCase={viewCase}
                    testCases={displayedCases}
                    onClose={() => setViewCase(null)}
                    onEdit={handleEditFromView}
                    onUpdate={(updatedCase) => {
                        updateTestCase(updatedCase.id, {
                            title: updatedCase.title,
                            priority: updatedCase.priority,
                            status: updatedCase.status,
                            area: updatedCase.area,
                            expectedResult: updatedCase.expectedResult,
                            stepsContent: updatedCase.stepsContent,
                            comments: updatedCase.comments,
                            customFields: updatedCase.customFields,
                        });
                        setViewCase(prev => prev ? { ...prev, ...updatedCase } : updatedCase); // Update local state to reflect changes
                    }}
                    onNavigate={idx => setViewCase(displayedCases[idx])}
                />
            )}
            {selectedCase && (
                <TestCaseModal
                    testCase={selectedCase}
                    availableAreas={uniqueAreas}
                    onClose={() => setSelectedCase(null)}
                    onSave={handleSaveCase}
                    onBack={(updatedCase) => {
                        // Close editor and reopen view modal with updated values
                        setSelectedCase(null);
                        setViewCase(updatedCase);
                    }}
                />
            )}
            {isFilterModalOpen && <FilterModal />}
            {isGeminiModalOpen && activeProject && activeSuiteId && (
                <GeminiGenerationModal
                    onClose={() => setIsGeminiModalOpen(false)}
                    onAddCases={handleAddGeneratedCases}
                    projectContext={projects.find(p => p.id === activeProject)?.name || activeProject || ''}
                    suiteContext={activeSuite || activeSuiteId}
                    projectId={activeProject}
                    suiteId={activeSuiteId}
                    existingTestCases={displayedCases.map(tc => tc.title)}
                />
            )}
            {isExportModalOpen && (
                <ExportTestCasesModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    onExport={handleExportTestCases}
                    customFieldDefinitions={customFieldDefinitions}
                    visibleCustomFieldIds={visibleCustomFieldIds}
                    hiddenColumns={hiddenColumns}
                    testCaseCount={displayedCases.length}
                />
            )}
            {isImportModalOpen && activeProject && (
                <ImportTestCasesModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleImportTestCases}
                    customFieldDefinitions={customFieldDefinitions}
                    projectMembers={
                        projects
                            .find((p) => p.id === activeProject)
                            ?.members.map((m) => ({ id: m.id, name: m.name })) || []
                    }
                    availableSuites={testSuites.map((s) => ({ id: s.id, name: s.name }))}
                    defaultSuiteId={activeSuiteId || undefined}
                />
            )}
        </div>
    );
};

export default TestCasesPage;
