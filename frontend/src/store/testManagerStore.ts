import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';
import { ViewMode, TestCase, Project, TestSuite, Priority, Status, Tester, HistoryEntry, ProjectSettings, Ticket, TicketStatus as TicketStatusEnum, TicketPriority as TicketPriorityEnum, TicketSeverity as TicketSeverityEnum, TicketAttachment, ReturnReason as ReturnReasonEnum, FailureType as FailureTypeEnum } from '../types/testManager';
import * as testManagerApi from '../services/testManagerApi';
import * as ticketApi from '../services/ticketApi';
import {
    ProjectResponse,
    TestSuiteResponse,
    TestCaseResponse,
    CreateProjectRequest,
    UpdateProjectRequest,
    CreateTestSuiteRequest,
    UpdateTestSuiteRequest,
    CreateTestCaseRequest,
    UpdateTestCaseRequest,
    TicketListResponse,
    CreateTicketRequest,
    UpdateTicketRequest,
} from '../types/api/testManager.api';

// Request deduplication to prevent duplicate concurrent API calls
const pendingRequests = new Map<string, Promise<unknown>>();

const deduplicateRequest = async <T>(
    key: string,
    requestFn: () => Promise<T>
): Promise<T> => {
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key) as Promise<T>;
    }
    const promise = requestFn().finally(() => pendingRequests.delete(key));
    pendingRequests.set(key, promise);
    return promise;
};

export interface TestCaseFilters {
    status: Status[];
    priority: Priority[];
    dateRange: {
        start: string | null;
        end: string | null;
    };
    createdAtRange: {
        start: string | null;
        end: string | null;
    };
}

const initialFilters: TestCaseFilters = {
    status: [],
    priority: [],
    dateRange: { start: null, end: null },
    createdAtRange: { start: null, end: null },
};

// Helper to convert API response to frontend types
export const mapProjectResponse = (p: ProjectResponse): Project => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    color: p.color,
    ownerId: p.ownerId,
    members: p.members,
    stats: p.stats,
    updatedAt: p.updatedAt,
});

export const mapTestCaseResponse = (tc: TestCaseResponse): TestCase => ({
    id: tc.id,
    title: tc.title,
    priority: tc.priority as Priority,
    status: tc.status as Status,
    createdAt: tc.createdAt,
    lastModified: tc.lastModified,
    assignedTester: tc.assignedTester as Tester,
    steps: [], // Not used anymore, stepsContent is used
    stepsContent: tc.stepsContent,
    suite: tc.suite,
    suiteId: tc.suiteId,
    area: tc.area,
    expectedResult: tc.expectedResult,
    testDescription: tc.testDescription,
    comments: tc.comments,
    customFields: tc.customFields,
    history: tc.history?.map(h => ({
        id: h.id,
        timestamp: h.timestamp,
        user: h.user as Tester,
        snapshot: h.snapshot as Partial<TestCase>,
        changedFields: h.changedFields,
    })) as HistoryEntry[],
    projectId: tc.projectId,
    order: tc.order,
});

const mapTestSuiteResponse = (s: TestSuiteResponse): TestSuite => ({
    id: s.id,
    name: s.name,
    description: s.description,
    tags: s.tags || [],
    projectId: s.projectId,
    caseCount: s.caseCount,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
});

export const mapTicketResponse = (t: TicketListResponse): Ticket => ({
    id: t.id,
    title: t.title,
    description: t.description,
    projectId: t.projectId,
    status: t.status as TicketStatusEnum,
    priority: t.priority as unknown as TicketPriorityEnum,
    severity: t.severity as unknown as TicketSeverityEnum,
    assignedTo: t.assignedTo as Tester | undefined,
    createdBy: t.createdBy as Tester,
    relatedRunId: t.relatedRunId,
    relatedRunItemId: t.relatedRunItemId,
    failureType: t.failureType as FailureTypeEnum | undefined,
    team: t.team,
    environment: t.environment,
    buildVersion: t.buildVersion,
    failureAt: t.failureAt,
    firstReproducedAt: t.firstReproducedAt,
    returnedCount: t.returnedCount ?? 0,
    lastReturnedAt: t.lastReturnedAt,
    lastReturnReason: t.lastReturnReason as ReturnReasonEnum | undefined,
    divergence: t.divergence,
    attachments: [],
    tags: t.tags || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
});

const PROJECTS_PAGE_SIZE = 20;

const UNKNOWN_TESTER: Tester = {
    id: 'unknown',
    name: 'Unassigned',
    avatar: '',
};

interface TestManagerStore {
    // State
    viewMode: ViewMode;
    isRunDetailViewOpen: boolean;
    activeSuite: string | null;
    activeSuiteId: string | null;
    activeProject: string | null;
    activeArea: string | null;
    activeTestCaseId: string | null;
    testCases: TestCase[];
    projects: Project[];
    testSuites: TestSuite[];
    isLoading: boolean;
    error: string | null;
    projectSettings: Record<string, ProjectSettings>;

    // Filter State
    isFilterModalOpen: boolean;
    filters: TestCaseFilters;

    // View actions
    setViewMode: (mode: ViewMode) => void;
    setRunDetailViewOpen: (isOpen: boolean) => void;
    setActiveSuite: (suite: string | null) => void;
    setActiveSuiteId: (suiteId: string | null) => void;
    setActiveTestCaseId: (testCaseId: string | null) => void;
    setActiveProject: (projectId: string | null) => void;
    setActiveArea: (area: string | null) => void;
    setActiveSuiteWithId: (suiteId: string, suiteName: string) => void;
    clearActiveContext: () => void;
    clearError: () => void;

    // Filter Actions
    setFilters: (filters: Partial<TestCaseFilters>) => void;
    toggleFilterModal: (isOpen?: boolean) => void;
    clearFilters: () => void;

    // Search State
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    clearSearchQuery: () => void;

    // Export callback
    onExportTestCases: (() => void) | null;
    setExportTestCasesCallback: (callback: (() => void) | null) => void;

    // Import callback
    onImportTestCases: (() => void) | null;
    setImportTestCasesCallback: (callback: (() => void) | null) => void;

    // Project pagination state
    projectsHasMore: boolean;
    projectsOffset: number;
    projectsTotal: number;
    isProjectsLoadingMore: boolean;

    // Project actions
    fetchProjects: () => Promise<void>;
    fetchMoreProjects: () => Promise<void>;
    createProject: (data: CreateProjectRequest) => Promise<Project>;
    updateProject: (id: string, data: UpdateProjectRequest) => Promise<Project>;
    deleteProject: (id: string) => Promise<void>;
    addProjectMember: (projectId: string, email: string) => Promise<Project>;
    removeProjectMember: (projectId: string, memberId: string) => Promise<Project>;
    
    // Project Settings actions
    fetchProjectSettings: (projectId: string) => Promise<ProjectSettings>;
    updateProjectSettings: (projectId: string, settings: ProjectSettings) => Promise<ProjectSettings>;
    getProjectSettings: (projectId: string) => ProjectSettings;

    // Test Suite actions
    fetchTestSuites: (projectId: string) => Promise<void>;
    createTestSuite: (projectId: string, data: CreateTestSuiteRequest) => Promise<TestSuite>;
    updateTestSuite: (id: string, data: UpdateTestSuiteRequest) => Promise<TestSuite>;
    deleteTestSuite: (id: string) => Promise<void>;

    // Test Case actions
    fetchTestCases: (suiteId: string) => Promise<void>;
    fetchTestCasesByProject: (projectId: string) => Promise<void>;
    createTestCase: (suiteId: string, data: CreateTestCaseRequest) => Promise<TestCase>;
    updateTestCase: (id: string, data: UpdateTestCaseRequest) => Promise<TestCase>;
    cloneTestCase: (id: string) => Promise<TestCase>;
    deleteTestCase: (id: string) => Promise<void>;
    bulkUpdateStatus: (ids: string[], status: Status) => Promise<void>;

    // Selection State
    isSelectionMode: boolean;
    selectedTestCaseIds: string[];

    // Selection Actions
    setSelectionMode: (enabled: boolean) => void;
    toggleTestCaseSelection: (id: string) => void;
    selectAllTestCases: (ids: string[]) => void;
    clearSelection: () => void;
    bulkDeleteTestCases: (ids: string[]) => Promise<void>;

    // Legacy local state actions (for optimistic updates)
    // Support both direct values and functional updaters for proper deduplication
    setTestCases: (casesOrUpdater: TestCase[] | ((current: TestCase[]) => TestCase[])) => void;
    setTestSuites: (suitesOrUpdater: TestSuite[] | ((current: TestSuite[]) => TestSuite[])) => void;
    addTestCase: (testCase: TestCase) => void;
    updateTestCaseLocal: (testCase: TestCase) => void;
    deleteTestCaseLocal: (id: string) => void;
    updateProjectLocal: (project: Project) => void;
    updateProjectSettingsLocal: (projectId: string, settings: ProjectSettings) => void;
    deleteProjectLocal: (projectId: string) => void;
    setProjects: (projects: Project[]) => void;
    addProject: (project: Project) => void;

    // Ticket State
    tickets: Ticket[];
    ticketsTotal: number;
    isTicketDetailViewOpen: boolean;
    activeTicket: Ticket | null;
    ticketView: 'list' | 'kanban';

    // Ticket Actions
    fetchTickets: (projectId: string) => Promise<void>;
    createTicket: (projectId: string, data: CreateTicketRequest) => Promise<Ticket>;
    updateTicket: (projectId: string, id: string, data: UpdateTicketRequest) => Promise<Ticket>;
    updateTicketStatus: (projectId: string, id: string, status: TicketStatusEnum) => Promise<Ticket>;
    markTicketReproduced: (projectId: string, id: string) => Promise<Ticket>;
    returnTicketForInfo: (projectId: string, id: string, reason: ReturnReasonEnum) => Promise<Ticket>;
    deleteTicket: (projectId: string, id: string) => Promise<void>;
    setTicketView: (view: 'list' | 'kanban') => void;
    setActiveTicket: (ticket: Ticket | null) => void;
    setTicketDetailViewOpen: (isOpen: boolean) => void;
    setTicketsTotal: (total: number) => void;
    applyRemoteTicketCreate: (ticket: Ticket) => void;
    applyRemoteTicketUpdate: (ticket: Ticket) => void;
    removeTicketLocal: (ticketId: string) => void;
}

export const useTestManagerStore = createWithEqualityFn<TestManagerStore>()(
    persist(
        (set, get) => ({
            // Initial state
            viewMode: 'projects' as ViewMode,
            isRunDetailViewOpen: false,
            activeSuite: null as string | null,
            activeSuiteId: null as string | null,
            activeProject: null as string | null,
            activeArea: null as string | null,
            activeTestCaseId: null as string | null,
            testCases: [] as TestCase[],
            projects: [] as Project[],
            projectsHasMore: false,
            projectsOffset: 0,
            projectsTotal: 0,
            isProjectsLoadingMore: false,
            testSuites: [] as TestSuite[],
            isLoading: false,
            error: null as string | null,
            projectSettings: {} as Record<string, ProjectSettings>,

            // Ticket State
            tickets: [] as Ticket[],
            ticketsTotal: 0,
            isTicketDetailViewOpen: false,
            activeTicket: null as Ticket | null,
            ticketView: 'list' as 'list' | 'kanban',

            // Filter State
            isFilterModalOpen: false,
            filters: initialFilters,

            // View actions
            setViewMode: (mode) => set({ viewMode: mode }),
            setRunDetailViewOpen: (isOpen) => set({ isRunDetailViewOpen: isOpen }),
            setActiveSuite: (suite) => set({ activeSuite: suite }),
            setActiveSuiteId: (suiteId) => set({ activeSuiteId: suiteId }),
            setActiveTestCaseId: (testCaseId) => set({ activeTestCaseId: testCaseId }),
            setActiveProject: (projectId) => set({ activeProject: projectId, testSuites: [], testCases: [], tickets: [], activeArea: null }),
            setActiveArea: (area) => set({ activeArea: area }),
            setActiveSuiteWithId: (suiteId, suiteName) => set({ activeSuiteId: suiteId, activeSuite: suiteName }),
            clearActiveContext: () => set({ activeSuite: null, activeSuiteId: null, activeProject: null, activeArea: null, activeTestCaseId: null }),
            clearError: () => set({ error: null }),

            // Filter Actions
            setFilters: (newFilters) => set((state) => ({
                filters: { ...state.filters, ...newFilters }
            })),
            toggleFilterModal: (isOpen) => set((state) => ({
                isFilterModalOpen: isOpen !== undefined ? isOpen : !state.isFilterModalOpen
            })),
            clearFilters: () => set({ filters: initialFilters }),

            // Search Actions
            searchQuery: '' as string,
            setSearchQuery: (query) => set({ searchQuery: query }),
            clearSearchQuery: () => set({ searchQuery: '' }),

            // Export callback
            onExportTestCases: null,
            setExportTestCasesCallback: (callback) => set({ onExportTestCases: callback }),

            // Import callback
            onImportTestCases: null,
            setImportTestCasesCallback: (callback) => set({ onImportTestCases: callback }),

            // Selection Actions
            isSelectionMode: false,
            selectedTestCaseIds: [] as string[],
            setSelectionMode: (enabled) => set({ isSelectionMode: enabled, selectedTestCaseIds: [] }),
            toggleTestCaseSelection: (id) => set((state) => {
                const isSelected = state.selectedTestCaseIds.includes(id);
                return {
                    selectedTestCaseIds: isSelected
                        ? state.selectedTestCaseIds.filter(tid => tid !== id)
                        : [...state.selectedTestCaseIds, id]
                };
            }),
            selectAllTestCases: (ids) => set({ selectedTestCaseIds: ids }),
            clearSelection: () => set({ selectedTestCaseIds: [] }),
            bulkDeleteTestCases: async (ids) => {
                set({ isLoading: true, error: null });
                try {
                    await testManagerApi.bulkDeleteTestCases(ids);
                    set((state) => ({
                        testCases: state.testCases.filter((tc) => !ids.includes(tc.id)),
                        selectedTestCaseIds: [],
                        isSelectionMode: false,
                        isLoading: false,
                    }));
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },

            // =========================================================================
            // PROJECT ACTIONS
            // =========================================================================
            fetchProjects: async () => {
                try {
                    const result = await deduplicateRequest('projects', async () => {
                        set({ isLoading: true, error: null });
                        const response = await testManagerApi.getProjectsPaginated({
                            limit: PROJECTS_PAGE_SIZE,
                            offset: 0,
                        });
                        return {
                            items: response.items.map(mapProjectResponse),
                            meta: response.meta,
                        };
                    });
                    set({
                        projects: result.items,
                        projectsOffset: result.items.length,
                        projectsTotal: result.meta.total,
                        projectsHasMore: result.meta.hasMore,
                        isLoading: false,
                    });
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                }
            },

            fetchMoreProjects: async () => {
                const { projectsHasMore, isProjectsLoadingMore, projectsOffset } = get();
                if (!projectsHasMore || isProjectsLoadingMore) return;

                set({ isProjectsLoadingMore: true });
                try {
                    const response = await testManagerApi.getProjectsPaginated({
                        limit: PROJECTS_PAGE_SIZE,
                        offset: projectsOffset,
                    });
                    const mapped = response.items.map(mapProjectResponse);

                    set((state) => {
                        const existingIds = new Set(state.projects.map((p) => p.id));
                        const dedupedIncoming = mapped.filter((p) => !existingIds.has(p.id));
                        const totalLoaded = state.projects.length + dedupedIncoming.length;
                        return {
                            projects: [...state.projects, ...dedupedIncoming],
                            projectsOffset: totalLoaded,
                            projectsTotal: response.meta.total,
                            projectsHasMore: response.meta.hasMore && totalLoaded < response.meta.total,
                            isProjectsLoadingMore: false,
                        };
                    });
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isProjectsLoadingMore: false });
                }
            },

            createProject: async (data) => {
                set({ isLoading: true, error: null });
                const previousProjects = get().projects;
                const optimisticProject: Project = {
                    id: `temp-project-${Date.now()}`,
                    name: data.name,
                    description: data.description || '',
                    color: data.color || '#3B82F6',
                    ownerId: '',
                    members: [],
                    stats: {
                        suites: 0,
                        cases: 0,
                        members: 1,
                    },
                    updatedAt: new Date().toISOString(),
                };

                set({ projects: [optimisticProject, ...previousProjects] });

                try {
                    const response = await testManagerApi.createProject(data);
                    const project = mapProjectResponse(response);
                    set((state) => ({
                        projects: state.projects.map((p) =>
                            p.id === optimisticProject.id ? project : p
                        ),
                        isLoading: false,
                    }));
                    return project;
                } catch (error: unknown) {
                    set({
                        projects: previousProjects,
                        error: (error as Error).message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            updateProject: async (id, data) => {
                set({ isLoading: true, error: null });
                const previousProjects = get().projects;
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id
                            ? {
                                ...p,
                                ...data,
                                updatedAt: new Date().toISOString(),
                            }
                            : p
                    ),
                }));

                try {
                    const response = await testManagerApi.updateProject(id, data);
                    const project = mapProjectResponse(response);
                    set((state) => ({
                        projects: state.projects.map((p) => (p.id === id ? project : p)),
                        isLoading: false,
                    }));
                    return project;
                } catch (error: unknown) {
                    set({
                        projects: previousProjects,
                        error: (error as Error).message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            deleteProject: async (id) => {
                set({ isLoading: true, error: null });
                const previousState = get();
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                    activeProject: state.activeProject === id ? null : state.activeProject,
                    activeSuite: state.activeProject === id ? null : state.activeSuite,
                    activeSuiteId: state.activeProject === id ? null : state.activeSuiteId,
                    testSuites: state.activeProject === id ? [] : state.testSuites,
                    testCases: state.activeProject === id ? [] : state.testCases,
                }));

                try {
                    await testManagerApi.deleteProject(id);
                    set({ isLoading: false });
                } catch (error: unknown) {
                    set({
                        projects: previousState.projects,
                        activeProject: previousState.activeProject,
                        activeSuite: previousState.activeSuite,
                        activeSuiteId: previousState.activeSuiteId,
                        testSuites: previousState.testSuites,
                        testCases: previousState.testCases,
                        error: (error as Error).message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            addProjectMember: async (projectId, email) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await testManagerApi.addProjectMember(projectId, { email });
                    const project = mapProjectResponse(response);
                    set((state) => ({
                        projects: state.projects.map((p) => (p.id === projectId ? project : p)),
                        isLoading: false,
                    }));
                    return project;
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },

            removeProjectMember: async (projectId, memberId) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await testManagerApi.removeProjectMember(projectId, memberId);
                    const project = mapProjectResponse(response);
                    set((state) => ({
                        projects: state.projects.map((p) => (p.id === projectId ? project : p)),
                        isLoading: false,
                    }));
                    return project;
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },

            // =========================================================================
            // PROJECT SETTINGS ACTIONS
            // =========================================================================
            fetchProjectSettings: async (projectId) => {
                try {
                    const settings = await deduplicateRequest(`projectSettings:${projectId}`, async () => {
                        const result = await testManagerApi.getProjectSettings(projectId);
                        set((state) => ({
                            projectSettings: { ...state.projectSettings, [projectId]: result }
                        }));
                        return result;
                    });
                    return settings;
                } catch (error: unknown) {
                    console.error('Error fetching project settings:', error);
                    throw error;
                }
            },

            updateProjectSettings: async (projectId, settings) => {
                try {
                    const updatedSettings = await testManagerApi.updateProjectSettings(projectId, settings);
                    set((state) => ({
                        projectSettings: { ...state.projectSettings, [projectId]: updatedSettings }
                    }));
                    return updatedSettings;
                } catch (error: unknown) {
                    console.error('Error updating project settings:', error);
                    throw error;
                }
            },

            getProjectSettings: (projectId: string) => {
                const state = get();
                return state.projectSettings[projectId] || { testCases: { customFields: [], table: { visibleCustomFieldIds: [] } } };
            },

            // =========================================================================
            // TEST SUITE ACTIONS
            // =========================================================================
            fetchTestSuites: async (projectId: string) => {
                try {
                    const testSuites = await deduplicateRequest(`testSuites:${projectId}`, async () => {
                        set({ isLoading: true, error: null });
                        const response = await testManagerApi.getTestSuites(projectId);
                        return response.map(mapTestSuiteResponse);
                    });
                    set({ testSuites, isLoading: false });
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                }
            },

            createTestSuite: async (projectId: string, data: CreateTestSuiteRequest) => {
                set({ isLoading: true, error: null });
                const previousSuites = get().testSuites;
                const nowIso = new Date().toISOString();
                const optimisticSuite: TestSuite = {
                    id: `temp-suite-${Date.now()}`,
                    name: data.name,
                    description: data.description,
                    tags: data.tags || [],
                    projectId,
                    createdAt: nowIso,
                    updatedAt: nowIso,
                };

                set({ testSuites: [optimisticSuite, ...previousSuites] });

                try {
                    const response = await testManagerApi.createTestSuite(projectId, data);
                    const suite = mapTestSuiteResponse(response);
                    set((state) => ({
                        testSuites: state.testSuites.map((s) =>
                            s.id === optimisticSuite.id ? suite : s
                        ),
                        isLoading: false,
                    }));
                    return suite;
                } catch (error: unknown) {
                    set({
                        testSuites: previousSuites,
                        error: (error as Error).message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            updateTestSuite: async (id: string, data: UpdateTestSuiteRequest) => {
                set({ isLoading: true, error: null });
                const previousSuites = get().testSuites;
                set((state) => ({
                    testSuites: state.testSuites.map((s) =>
                        s.id === id
                            ? {
                                ...s,
                                ...data,
                                updatedAt: new Date().toISOString(),
                            }
                            : s
                    ),
                }));

                try {
                    const response = await testManagerApi.updateTestSuite(id, data);
                    const suite = mapTestSuiteResponse(response);
                    set((state) => ({
                        testSuites: state.testSuites.map((s) => (s.id === id ? suite : s)),
                        isLoading: false,
                    }));
                    return suite;
                } catch (error: unknown) {
                    set({
                        testSuites: previousSuites,
                        error: (error as Error).message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            deleteTestSuite: async (id: string) => {
                set({ isLoading: true, error: null });
                const previousSuites = get().testSuites;
                const previousTestCases = get().testCases;
                set((state) => ({
                    testSuites: state.testSuites.filter((s) => s.id !== id),
                    testCases: state.testCases.filter((tc) => tc.suiteId !== id),
                    activeSuiteId: state.activeSuiteId === id ? null : state.activeSuiteId,
                    activeSuite: state.activeSuiteId === id ? null : state.activeSuite,
                }));

                try {
                    await testManagerApi.deleteTestSuite(id);
                    set({ isLoading: false });
                } catch (error: unknown) {
                    set({
                        testSuites: previousSuites,
                        testCases: previousTestCases,
                        error: (error as Error).message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            // =========================================================================
            // TEST CASE ACTIONS
            // =========================================================================
            fetchTestCases: async (suiteId: string) => {
                try {
                    const testCases = await deduplicateRequest(`testCases:${suiteId}`, async () => {
                        set({ isLoading: true, error: null });
                        const response = await testManagerApi.getTestCases(suiteId);
                        return response.map(mapTestCaseResponse);
                    });
                    set({ testCases, isLoading: false });
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                }
            },

            fetchTestCasesByProject: async (projectId: string) => {
                try {
                    const testCases = await deduplicateRequest(`testCasesByProject:${projectId}`, async () => {
                        set({ isLoading: true, error: null });
                        const response = await testManagerApi.getTestCasesByProject(projectId);
                        return response.map(mapTestCaseResponse);
                    });
                    set({ testCases, isLoading: false });
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                }
            },

            createTestCase: async (suiteId: string, data: CreateTestCaseRequest) => {
                set({ isLoading: true, error: null });
                const state = get();
                const previousTestCases = state.testCases;
                const suite = state.testSuites.find((s) => s.id === suiteId);
                const fallbackTester = state.testCases.find((tc) => tc.assignedTester)?.assignedTester || UNKNOWN_TESTER;
                const nowIso = new Date().toISOString();
                const optimisticTestCase: TestCase = {
                    id: `temp-testcase-${Date.now()}`,
                    title: data.title,
                    priority: (data.priority as Priority) || Priority.Medium,
                    status: (data.status as Status) || Status.Draft,
                    createdAt: nowIso,
                    lastModified: nowIso,
                    assignedTester: fallbackTester,
                    steps: [],
                    stepsContent: data.stepsContent,
                    suite: suite?.name || 'Unknown Suite',
                    suiteId,
                    area: data.area,
                    expectedResult: data.expectedResult,
                    testDescription: data.testDescription,
                    comments: data.comments,
                    customFields: data.customFields,
                    history: [],
                    projectId: suite?.projectId || state.activeProject || '',
                    order: state.testCases.length + 1,
                };

                set({
                    testCases: previousTestCases.some((tc) => tc.id === optimisticTestCase.id)
                        ? previousTestCases
                        : [optimisticTestCase, ...previousTestCases],
                });

                try {
                    const response = await testManagerApi.createTestCase(suiteId, data);
                    const testCase = mapTestCaseResponse(response);
                    set((state) => ({
                        testCases: state.testCases
                            .map((tc) => (tc.id === optimisticTestCase.id ? testCase : tc))
                            .filter((tc, index, arr) => arr.findIndex((item) => item.id === tc.id) === index),
                        isLoading: false,
                    }));
                    return testCase;
                } catch (error: unknown) {
                    set({
                        testCases: previousTestCases,
                        error: (error as Error).message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            updateTestCase: async (id: string, data: UpdateTestCaseRequest) => {
                set({ isLoading: true, error: null });
                const previousTestCases = get().testCases;
                set((state) => ({
                    testCases: state.testCases.map((tc) => {
                        if (tc.id !== id) {
                            return tc;
                        }

                        return {
                            ...tc,
                            ...(data.title !== undefined ? { title: data.title } : {}),
                            ...(data.priority !== undefined ? { priority: data.priority as Priority } : {}),
                            ...(data.status !== undefined ? { status: data.status as Status } : {}),
                            ...(data.area !== undefined ? { area: data.area } : {}),
                            ...(data.expectedResult !== undefined ? { expectedResult: data.expectedResult } : {}),
                            ...(data.testDescription !== undefined ? { testDescription: data.testDescription } : {}),
                            ...(data.stepsContent !== undefined ? { stepsContent: data.stepsContent } : {}),
                            ...(data.comments !== undefined ? { comments: data.comments } : {}),
                            ...(data.customFields !== undefined ? { customFields: data.customFields } : {}),
                            lastModified: new Date().toISOString(),
                        };
                    }),
                }));

                try {
                    const response = await testManagerApi.updateTestCase(id, data);
                    const testCase = mapTestCaseResponse(response);
                    set((state) => ({
                        testCases: state.testCases.map((tc) => (tc.id === id ? testCase : tc)),
                        isLoading: false,
                    }));
                    return testCase;
                } catch (error: unknown) {
                    set({
                        testCases: previousTestCases,
                        error: (error as Error).message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            cloneTestCase: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await testManagerApi.cloneTestCase(id);
                    const clonedTestCase = mapTestCaseResponse(response);
                    set((state) => {
                        const originalIndex = state.testCases.findIndex(tc => tc.id === id);
                        const newTestCases = [...state.testCases];
                        newTestCases.splice(originalIndex + 1, 0, clonedTestCase);
                        return {
                            testCases: newTestCases,
                            isLoading: false,
                        };
                    });
                    return clonedTestCase;
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },

            deleteTestCase: async (id: string) => {
                set({ isLoading: true, error: null });
                const previousTestCases = get().testCases;
                set({
                    testCases: previousTestCases.filter((tc) => tc.id !== id),
                });

                try {
                    await testManagerApi.deleteTestCase(id);
                    set({ isLoading: false });
                } catch (error: unknown) {
                    set({
                        testCases: previousTestCases,
                        error: (error as Error).message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            bulkUpdateStatus: async (ids: string[], status: Status) => {
                set({ isLoading: true, error: null });
                try {
                    await testManagerApi.bulkUpdateStatus(ids, status);
                    set((state) => ({
                        testCases: state.testCases.map((tc) =>
                            ids.includes(tc.id) ? { ...tc, status } : tc
                        ),
                        isLoading: false,
                    }));
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },

            // =========================================================================
            // LOCAL STATE ACTIONS (for optimistic updates and legacy support)
            // =========================================================================
            setTestCases: (casesOrUpdater: TestCase[] | ((current: TestCase[]) => TestCase[])) => {
                if (typeof casesOrUpdater === 'function') {
                    set((state) => ({ testCases: casesOrUpdater(state.testCases) }));
                } else {
                    set({ testCases: casesOrUpdater });
                }
            },
            setTestSuites: (suitesOrUpdater: TestSuite[] | ((current: TestSuite[]) => TestSuite[])) => {
                if (typeof suitesOrUpdater === 'function') {
                    set((state) => ({ testSuites: suitesOrUpdater(state.testSuites) }));
                } else {
                    set({ testSuites: suitesOrUpdater });
                }
            },
            addTestCase: (testCase: TestCase) => set((state) => ({ testCases: [testCase, ...state.testCases] })),
            updateTestCaseLocal: (updatedCase: TestCase) => set((state) => ({
                testCases: state.testCases.map((c) => (c.id === updatedCase.id ? updatedCase : c)),
            })),
            deleteTestCaseLocal: (id: string) => set((state) => ({
                testCases: state.testCases.filter((c) => c.id !== id),
            })),
            updateProjectLocal: (project: Project) => set((state) => ({
                projects: state.projects.map((p) => (p.id === project.id ? project : p)),
            })),
            updateProjectSettingsLocal: (projectId: string, settings: ProjectSettings) => set((state) => ({
                projectSettings: { ...state.projectSettings, [projectId]: settings }
            })),
            deleteProjectLocal: (projectId: string) => set((state) => ({
                projects: state.projects.filter((p) => p.id !== projectId),
                // If deleted project was active, clear context
                activeProject: state.activeProject === projectId ? null : state.activeProject,
                activeSuite: state.activeProject === projectId ? null : state.activeSuite,
                activeSuiteId: state.activeProject === projectId ? null : state.activeSuiteId,
                testSuites: state.activeProject === projectId ? [] : state.testSuites,
                testCases: state.activeProject === projectId ? [] : state.testCases,
            })),
            setProjects: (projects: Project[]) => set({ projects }),
            addProject: (project: Project) => set((state) => ({ projects: [project, ...state.projects] })),

            // =========================================================================
            // TICKET ACTIONS
            // =========================================================================
            setActiveTicket: (ticket) => set({ activeTicket: ticket }),
            setTicketDetailViewOpen: (isOpen) => set({ isTicketDetailViewOpen: isOpen }),
            setTicketsTotal: (total) => set({ ticketsTotal: total }),
            fetchTickets: async (projectId) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await ticketApi.getTickets(projectId);
                    set({ tickets: response.map(mapTicketResponse), isLoading: false });
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                }
            },
            createTicket: async (projectId, data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await ticketApi.createTicket(projectId, data);
                    const ticket: Ticket = {
                        id: response.id,
                        title: response.title,
                        description: response.description,
                        projectId: response.projectId,
                        status: response.status as TicketStatusEnum,
                        priority: response.priority as unknown as TicketPriorityEnum,
                        severity: response.severity as unknown as TicketSeverityEnum,
                        assignedTo: response.assignedTo as Tester | undefined,
                        createdBy: response.createdBy as Tester,
                        relatedRunId: response.relatedRunId,
                        relatedRunItemId: response.relatedRunItemId,
                        attachments: response.attachments as TicketAttachment[],
                        tags: response.tags || [],
                        createdAt: response.createdAt,
                        updatedAt: response.updatedAt,
                    };
                    set((state) => ({
                        tickets: [ticket, ...state.tickets],
                        isLoading: false,
                    }));
                    return ticket;
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },
            updateTicket: async (projectId, id, data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await ticketApi.updateTicket(projectId, id, data);
                    const ticket: Ticket = {
                        id: response.id,
                        title: response.title,
                        description: response.description,
                        projectId: response.projectId,
                        status: response.status as TicketStatusEnum,
                        priority: response.priority as unknown as TicketPriorityEnum,
                        severity: response.severity as unknown as TicketSeverityEnum,
                        assignedTo: response.assignedTo as Tester | undefined,
                        createdBy: response.createdBy as Tester,
                        relatedRunId: response.relatedRunId,
                        relatedRunItemId: response.relatedRunItemId,
                        attachments: response.attachments as TicketAttachment[],
                        tags: response.tags || [],
                        createdAt: response.createdAt,
                        updatedAt: response.updatedAt,
                    };
                    set((state) => ({
                        tickets: state.tickets.map((t) => (t.id === id ? ticket : t)),
                        activeTicket: state.activeTicket?.id === id ? ticket : state.activeTicket,
                        isLoading: false,
                    }));
                    return ticket;
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },
            deleteTicket: async (projectId, id) => {
                set({ isLoading: true, error: null });
                try {
                    await ticketApi.deleteTicket(projectId, id);
                    set((state) => ({
                        tickets: state.tickets.filter((t) => t.id !== id),
                        activeTicket: state.activeTicket?.id === id ? null : state.activeTicket,
                        isLoading: false,
                    }));
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },
            updateTicketStatus: async (projectId, id, status) => {
                // Optimistic local update (no page spinner flash for drag-drop)
                const originalStatus = get().tickets.find((t) => t.id === id)?.status;
                set((state) => ({
                    tickets: state.tickets.map((t) =>
                        t.id === id ? { ...t, status } : t
                    ),
                }));
                try {
                    const response = await ticketApi.updateTicket(projectId, id, { status });
                    const ticket: Ticket = {
                        id: response.id,
                        title: response.title,
                        description: response.description,
                        projectId: response.projectId,
                        status: response.status as TicketStatusEnum,
                        priority: response.priority as unknown as TicketPriorityEnum,
                        severity: response.severity as unknown as TicketSeverityEnum,
                        assignedTo: response.assignedTo as Tester | undefined,
                        createdBy: response.createdBy as Tester,
                        relatedRunId: response.relatedRunId,
                        relatedRunItemId: response.relatedRunItemId,
                        attachments: response.attachments as TicketAttachment[],
                        tags: response.tags || [],
                        createdAt: response.createdAt,
                        updatedAt: response.updatedAt,
                    };
                    set((state) => ({
                        tickets: state.tickets.map((t) => (t.id === id ? ticket : t)),
                        activeTicket: state.activeTicket?.id === id ? ticket : state.activeTicket,
                    }));
                    return ticket;
                } catch (error: unknown) {
                    // Roll back to the status the server still has
                    if (originalStatus) {
                        set((state) => ({
                            tickets: state.tickets.map((t) =>
                                t.id === id ? { ...t, status: originalStatus } : t
                            ),
                        }));
                    }
                    set({ error: (error as Error).message });
                    throw error;
                }
            },
            markTicketReproduced: async (projectId, id) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await ticketApi.markTicketReproduced(projectId, id);
                    const ticket: Ticket = {
                        ...mapTicketResponse(response),
                    };
                    set((state) => ({
                        tickets: state.tickets.map((t) => (t.id === id ? ticket : t)),
                        activeTicket: state.activeTicket?.id === id ? ticket : state.activeTicket,
                        isLoading: false,
                    }));
                    return ticket;
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },
            returnTicketForInfo: async (projectId, id, reason) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await ticketApi.returnTicketForInfo(projectId, id, reason);
                    const ticket: Ticket = {
                        ...mapTicketResponse(response),
                    };
                    set((state) => ({
                        tickets: state.tickets.map((t) => (t.id === id ? ticket : t)),
                        activeTicket: state.activeTicket?.id === id ? ticket : state.activeTicket,
                        isLoading: false,
                    }));
                    return ticket;
                } catch (error: unknown) {
                    set({ error: (error as Error).message, isLoading: false });
                    throw error;
                }
            },
            setTicketView: (view) => set({ ticketView: view }),
            // Realtime ticket sync (socket events) - local-only updates
            applyRemoteTicketCreate: (ticket) => set((state) => {
                const exists = state.tickets.some((t) => t.id === ticket.id);
                if (exists) return state;
                return {
                    tickets: [ticket, ...state.tickets],
                    ticketsTotal: state.ticketsTotal + 1,
                };
            }),
            applyRemoteTicketUpdate: (ticket) => set((state) => ({
                tickets: state.tickets.map((t) => (t.id === ticket.id ? ticket : t)),
                activeTicket: state.activeTicket?.id === ticket.id ? ticket : state.activeTicket,
            })),
            removeTicketLocal: (ticketId) => set((state) => ({
                tickets: state.tickets.filter((t) => t.id !== ticketId),
                activeTicket: state.activeTicket?.id === ticketId ? null : state.activeTicket,
                ticketsTotal: Math.max(0, state.ticketsTotal - 1),
            })),
        }),
        {
            name: 'test-manager-storage', // localStorage key
            partialize: (state) => ({
                // Only persist these specific fields - not the full data or loading states
                activeProject: state.activeProject,
                activeArea: state.activeArea,
                activeSuite: state.activeSuite,
                activeSuiteId: state.activeSuiteId,
                viewMode: state.viewMode,
                ticketView: state.ticketView,
            }),
        }
    ),
    Object.is
);
