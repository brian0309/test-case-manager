import { useTestManagerStore } from '../store/testManagerStore';
import { shallow } from 'zustand/shallow';

/**
 * Custom selector hook for Test Cases page data.
 * Reduces re-renders by only subscribing to needed state slices.
 */
export const useTestCasesPageData = () => useTestManagerStore(
  (state) => ({
    testCases: state.testCases,
    activeSuite: state.activeSuite,
    activeSuiteId: state.activeSuiteId,
    searchQuery: state.searchQuery,
    filters: state.filters,
    viewMode: state.viewMode,
    isLoading: state.isLoading,
    isSelectionMode: state.isSelectionMode,
    selectedTestCaseIds: state.selectedTestCaseIds,
  }),
  shallow
);

/**
 * Custom selector hook for Projects page data.
 * Reduces re-renders by only subscribing to needed state slices.
 */
export const useProjectsData = () => useTestManagerStore(
  (state) => ({
    projects: state.projects,
    activeProject: state.activeProject,
    isLoading: state.isLoading,
  }),
  shallow
);

/**
 * Custom selector hook for Test Suites page data.
 * Reduces re-renders by only subscribing to needed state slices.
 */
export const useTestSuitesData = () => useTestManagerStore(
  (state) => ({
    testSuites: state.testSuites,
    activeProject: state.activeProject,
    activeSuite: state.activeSuite,
    activeSuiteId: state.activeSuiteId,
    isLoading: state.isLoading,
  }),
  shallow
);

/**
 * Custom selector hook for Test Runs page data.
 * Reduces re-renders by only subscribing to needed state slices.
 */
export const useTestRunsData = () => useTestManagerStore(
  (state) => ({
    activeProject: state.activeProject,
    activeSuite: state.activeSuite,
    activeSuiteId: state.activeSuiteId,
    isLoading: state.isLoading,
  }),
  shallow
);

/**
 * Custom selector hook for filter state.
 * Useful for components that only need filter-related state.
 */
export const useFilters = () => useTestManagerStore(
  (state) => ({
    filters: state.filters,
    isFilterModalOpen: state.isFilterModalOpen,
    searchQuery: state.searchQuery,
  }),
  shallow
);

/**
 * Custom selector hook for project settings.
 * @param projectId - The project ID to get settings for
 */
export const useProjectSettings = (projectId: string) => useTestManagerStore(
  (state) => state.projectSettings[projectId] || { testCases: { customFields: [], table: { visibleCustomFieldIds: [] } } }
);

/**
 * Custom selector hook for active project data.
 */
export const useActiveProject = () => useTestManagerStore(
  (state) => ({
    activeProject: state.activeProject,
    projects: state.projects,
    activeProjectData: state.projects.find(p => p.id === state.activeProject) || null,
  }),
  shallow
);

/**
 * Custom selector hook for selection state.
 */
export const useSelection = () => useTestManagerStore(
  (state) => ({
    isSelectionMode: state.isSelectionMode,
    selectedTestCaseIds: state.selectedTestCaseIds,
  }),
  shallow
);

/**
 * Custom selector hook for view state.
 */
export const useViewState = () => useTestManagerStore(
  (state) => ({
    viewMode: state.viewMode,
    activeSuite: state.activeSuite,
    activeSuiteId: state.activeSuiteId,
    activeProject: state.activeProject,
    activeArea: state.activeArea,
    activeTestCaseId: state.activeTestCaseId,
  }),
  shallow
);

/**
 * Custom selector hook for loading and error state.
 */
export const useLoadingState = () => useTestManagerStore(
  (state) => ({
    isLoading: state.isLoading,
    error: state.error,
  }),
  shallow
);
