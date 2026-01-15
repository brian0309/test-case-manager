import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewMode, TestCase, Project, TestSuite, Priority, Status, Tester, HistoryEntry } from '../types/testManager';
import * as testManagerApi from '../services/testManagerApi';
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
} from '../types/api/testManager.api';

export interface TestCaseFilters {
    status: Status[];
    priority: Priority[];
    dateRange: {
        start: string | null;
        end: string | null;
    };
}

const initialFilters: TestCaseFilters = {
    status: [],
    priority: [],
    dateRange: { start: null, end: null },
};

// Helper to convert API response to frontend types
const mapProjectResponse = (p: ProjectResponse): Project => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    color: p.color,
    ownerId: p.ownerId,
    members: p.members,
    stats: p.stats,
    updatedAt: p.updatedAt,
});

const mapTestCaseResponse = (tc: TestCaseResponse): TestCase => ({
    id: tc.id,
    title: tc.title,
    priority: tc.priority as Priority,
    status: tc.status as Status,
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
    projectId: s.projectId,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
});

interface TestManagerStore {
    // State
    viewMode: ViewMode;
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
    projectSettings: Record<string, any>;

    // Filter State
    isFilterModalOpen: boolean;
    filters: TestCaseFilters;

    // View actions
    setViewMode: (mode: ViewMode) => void;
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

    // Project actions
    fetchProjects: () => Promise<void>;
    createProject: (data: CreateProjectRequest) => Promise<Project>;
    updateProject: (id: string, data: UpdateProjectRequest) => Promise<Project>;
    deleteProject: (id: string) => Promise<void>;
    addProjectMember: (projectId: string, email: string) => Promise<Project>;
    removeProjectMember: (projectId: string, memberId: string) => Promise<Project>;
    
    // Project Settings actions
    fetchProjectSettings: (projectId: string) => Promise<any>;
    updateProjectSettings: (projectId: string, settings: any) => Promise<any>;
    getProjectSettings: (projectId: string) => any;

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
    setTestCases: (cases: TestCase[]) => void;
    setTestSuites: (suites: TestSuite[]) => void;
    addTestCase: (testCase: TestCase) => void;
    updateTestCaseLocal: (testCase: TestCase) => void;
    deleteTestCaseLocal: (id: string) => void;
    setProjects: (projects: Project[]) => void;
    addProject: (project: Project) => void;
}

export const useTestManagerStore = create<TestManagerStore>()(
    persist(
        (set, get) => ({
            // Initial state
            viewMode: 'projects' as ViewMode,
            activeSuite: null as string | null,
            activeSuiteId: null as string | null,
            activeProject: null as string | null,
            activeArea: null as string | null,
            activeTestCaseId: null as string | null,
            testCases: [] as TestCase[],
            projects: [] as Project[],
            testSuites: [] as TestSuite[],
            isLoading: false,
            error: null as string | null,
            projectSettings: {} as Record<string, any>,

            // Filter State
            isFilterModalOpen: false,
            filters: initialFilters,

            // View actions
            setViewMode: (mode) => set({ viewMode: mode }),
            setActiveSuite: (suite) => set({ activeSuite: suite }),
            setActiveSuiteId: (suiteId) => set({ activeSuiteId: suiteId }),
            setActiveTestCaseId: (testCaseId) => set({ activeTestCaseId: testCaseId }),
            setActiveProject: (projectId) => set({ activeProject: projectId, testSuites: [], testCases: [], activeArea: null }),
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
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            // =========================================================================
            // PROJECT ACTIONS
            // =========================================================================
            fetchProjects: async () => {
                set({ error: null });
                try {
                    const response = await testManagerApi.getProjects();
                    const projects = response.map(mapProjectResponse);
                    set({ projects });
                } catch (error: any) {
                    set({ error: error.message });
                }
            },

            createProject: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await testManagerApi.createProject(data);
                    const project = mapProjectResponse(response);
                    set((state) => ({
                        projects: [project, ...state.projects],
                        isLoading: false,
                    }));
                    return project;
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            updateProject: async (id, data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await testManagerApi.updateProject(id, data);
                    const project = mapProjectResponse(response);
                    set((state) => ({
                        projects: state.projects.map((p) => (p.id === id ? project : p)),
                        isLoading: false,
                    }));
                    return project;
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            deleteProject: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    await testManagerApi.deleteProject(id);
                    set((state) => ({
                        projects: state.projects.filter((p) => p.id !== id),
                        isLoading: false,
                    }));
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
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
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
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
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            // =========================================================================
            // PROJECT SETTINGS ACTIONS
            // =========================================================================
            fetchProjectSettings: async (projectId) => {
                try {
                    const settings = await testManagerApi.getProjectSettings(projectId);
                    set((state) => ({
                        projectSettings: { ...state.projectSettings, [projectId]: settings }
                    }));
                    return settings;
                } catch (error: any) {
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
                } catch (error: any) {
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
                set({ error: null });
                try {
                    const response = await testManagerApi.getTestSuites(projectId);
                    const testSuites = response.map(mapTestSuiteResponse);
                    set({ testSuites });
                } catch (error: any) {
                    set({ error: error.message });
                }
            },

            createTestSuite: async (projectId: string, data: any) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await testManagerApi.createTestSuite(projectId, data);
                    const suite = mapTestSuiteResponse(response);
                    set((state) => ({
                        testSuites: [suite, ...state.testSuites],
                        isLoading: false,
                    }));
                    return suite;
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            updateTestSuite: async (id: string, data: any) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await testManagerApi.updateTestSuite(id, data);
                    const suite = mapTestSuiteResponse(response);
                    set((state) => ({
                        testSuites: state.testSuites.map((s) => (s.id === id ? suite : s)),
                        isLoading: false,
                    }));
                    return suite;
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            deleteTestSuite: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    await testManagerApi.deleteTestSuite(id);
                    set((state) => ({
                        testSuites: state.testSuites.filter((s) => s.id !== id),
                        isLoading: false,
                    }));
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            // =========================================================================
            // TEST CASE ACTIONS
            // =========================================================================
            fetchTestCases: async (suiteId: string) => {
                set({ error: null });
                try {
                    const response = await testManagerApi.getTestCases(suiteId);
                    const testCases = response.map(mapTestCaseResponse);
                    set({ testCases });
                } catch (error: any) {
                    set({ error: error.message });
                }
            },

            fetchTestCasesByProject: async (projectId: string) => {
                set({ error: null });
                try {
                    const response = await testManagerApi.getTestCasesByProject(projectId);
                    const testCases = response.map(mapTestCaseResponse);
                    set({ testCases });
                } catch (error: any) {
                    set({ error: error.message });
                }
            },

            createTestCase: async (suiteId: string, data: any) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await testManagerApi.createTestCase(suiteId, data);
                    const testCase = mapTestCaseResponse(response);
                    set((state) => ({
                        testCases: [testCase, ...state.testCases],
                        isLoading: false,
                    }));
                    return testCase;
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            updateTestCase: async (id: string, data: any) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await testManagerApi.updateTestCase(id, data);
                    const testCase = mapTestCaseResponse(response);
                    set((state) => ({
                        testCases: state.testCases.map((tc) => (tc.id === id ? testCase : tc)),
                        isLoading: false,
                    }));
                    return testCase;
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
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
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            deleteTestCase: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    await testManagerApi.deleteTestCase(id);
                    set((state) => ({
                        testCases: state.testCases.filter((tc) => tc.id !== id),
                        isLoading: false,
                    }));
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            bulkUpdateStatus: async (ids: string[], status: any) => {
                set({ isLoading: true, error: null });
                try {
                    await testManagerApi.bulkUpdateStatus(ids, status);
                    set((state) => ({
                        testCases: state.testCases.map((tc) =>
                            ids.includes(tc.id) ? { ...tc, status } : tc
                        ),
                        isLoading: false,
                    }));
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    throw error;
                }
            },

            // =========================================================================
            // LOCAL STATE ACTIONS (for optimistic updates and legacy support)
            // =========================================================================
            setTestCases: (cases: any) => set({ testCases: cases }),
            setTestSuites: (suites: any) => set({ testSuites: suites }),
            addTestCase: (testCase: any) => set((state) => ({ testCases: [testCase, ...state.testCases] })),
            updateTestCaseLocal: (updatedCase: any) => set((state) => ({
                testCases: state.testCases.map((c) => (c.id === updatedCase.id ? updatedCase : c)),
            })),
            deleteTestCaseLocal: (id: string) => set((state) => ({
                testCases: state.testCases.filter((c) => c.id !== id),
            })),
            setProjects: (projects: any) => set({ projects }),
            addProject: (project: any) => set((state) => ({ projects: [project, ...state.projects] })),
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
            }),
        }
    )
);
