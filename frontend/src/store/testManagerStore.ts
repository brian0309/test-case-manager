import { create } from 'zustand';
import { ViewMode, TestCase, Project } from '../types/testManager';
import { mockTestCases, mockProjects } from '../utils/mockData';

interface TestManagerStore {
    viewMode: ViewMode;
    activeSuite: string | null;
    testCases: TestCase[];
    projects: Project[];

    setViewMode: (mode: ViewMode) => void;
    setActiveSuite: (suite: string | null) => void;

    // Data Actions
    setTestCases: (cases: TestCase[]) => void;
    addTestCase: (testCase: TestCase) => void;
    updateTestCase: (testCase: TestCase) => void;
    deleteTestCase: (id: string) => void;

    setProjects: (projects: Project[]) => void;
    addProject: (project: Project) => void;
}

export const useTestManagerStore = create<TestManagerStore>((set) => ({
    viewMode: 'projects',
    activeSuite: null,
    testCases: mockTestCases,
    projects: mockProjects,

    setViewMode: (mode) => set({ viewMode: mode }),
    setActiveSuite: (suite) => set({ activeSuite: suite }),

    setTestCases: (cases) => set({ testCases: cases }),
    addTestCase: (testCase) => set((state) => ({ testCases: [testCase, ...state.testCases] })),
    updateTestCase: (updatedCase) => set((state) => ({
        testCases: state.testCases.map((c) => c.id === updatedCase.id ? updatedCase : c)
    })),
    deleteTestCase: (id) => set((state) => ({
        testCases: state.testCases.filter((c) => c.id !== id)
    })),

    setProjects: (projects) => set({ projects }),
    addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
}));
