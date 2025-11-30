/**
 * Test Manager API Service
 * Handles all API calls for the test case management feature
 * Uses the same pattern as authStore.ts
 */

import axios, { AxiosError } from "axios";
import { API_URL } from "../utils/api";
import {
  ApiResponse,
  ApiErrorResponse,
  ProjectResponse,
  TestSuiteResponse,
  TestCaseResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  AddMemberRequest,
  CreateTestSuiteRequest,
  UpdateTestSuiteRequest,
  CreateTestCaseRequest,
  UpdateTestCaseRequest,
  Status,
} from "../types/api/testManager.api";

// Configure axios to send credentials with all requests
axios.defaults.withCredentials = true;

// Helper to extract error message
const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || "An unexpected error occurred";
};

// ============================================================================
// PROJECT API
// ============================================================================

/**
 * Create a new project
 */
export const createProject = async (
  data: CreateProjectRequest
): Promise<ProjectResponse> => {
  try {
    const response = await axios.post<ApiResponse<ProjectResponse>>(
      `${API_URL}/projects`,
      data
    );
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get all projects for the current user
 */
export const getProjects = async (): Promise<ProjectResponse[]> => {
  try {
    const response = await axios.get<ApiResponse<ProjectResponse[]>>(
      `${API_URL}/projects`
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get a single project by ID
 */
export const getProject = async (id: string): Promise<ProjectResponse> => {
  try {
    const response = await axios.get<ApiResponse<ProjectResponse>>(
      `${API_URL}/projects/${id}`
    );
    if (!response.data.data) {
      throw new Error("Project not found");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Update a project
 */
export const updateProject = async (
  id: string,
  data: UpdateProjectRequest
): Promise<ProjectResponse> => {
  try {
    const response = await axios.put<ApiResponse<ProjectResponse>>(
      `${API_URL}/projects/${id}`,
      data
    );
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Delete a project
 */
export const deleteProject = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/projects/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Add a member to a project
 */
export const addProjectMember = async (
  projectId: string,
  data: AddMemberRequest
): Promise<ProjectResponse> => {
  try {
    const response = await axios.post<ApiResponse<ProjectResponse>>(
      `${API_URL}/projects/${projectId}/members`,
      data
    );
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Remove a member from a project
 */
export const removeProjectMember = async (
  projectId: string,
  memberId: string
): Promise<ProjectResponse> => {
  try {
    const response = await axios.delete<ApiResponse<ProjectResponse>>(
      `${API_URL}/projects/${projectId}/members/${memberId}`
    );
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ============================================================================
// TEST SUITE API
// ============================================================================

/**
 * Create a new test suite
 */
export const createTestSuite = async (
  projectId: string,
  data: CreateTestSuiteRequest
): Promise<TestSuiteResponse> => {
  try {
    const response = await axios.post<ApiResponse<TestSuiteResponse>>(
      `${API_URL}/projects/${projectId}/suites`,
      data
    );
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get all test suites for a project
 */
export const getTestSuites = async (
  projectId: string
): Promise<TestSuiteResponse[]> => {
  try {
    const response = await axios.get<ApiResponse<TestSuiteResponse[]>>(
      `${API_URL}/projects/${projectId}/suites`
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get a single test suite by ID
 */
export const getTestSuite = async (id: string): Promise<TestSuiteResponse> => {
  try {
    const response = await axios.get<ApiResponse<TestSuiteResponse>>(
      `${API_URL}/suites/${id}`
    );
    if (!response.data.data) {
      throw new Error("Test suite not found");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Update a test suite
 */
export const updateTestSuite = async (
  id: string,
  data: UpdateTestSuiteRequest
): Promise<TestSuiteResponse> => {
  try {
    const response = await axios.put<ApiResponse<TestSuiteResponse>>(
      `${API_URL}/suites/${id}`,
      data
    );
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Delete a test suite
 */
export const deleteTestSuite = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/suites/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ============================================================================
// TEST CASE API
// ============================================================================

/**
 * Create a new test case
 */
export const createTestCase = async (
  suiteId: string,
  data: CreateTestCaseRequest
): Promise<TestCaseResponse> => {
  try {
    const response = await axios.post<ApiResponse<TestCaseResponse>>(
      `${API_URL}/suites/${suiteId}/cases`,
      data
    );
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get all test cases in a suite
 */
export const getTestCases = async (
  suiteId: string
): Promise<TestCaseResponse[]> => {
  try {
    const response = await axios.get<ApiResponse<TestCaseResponse[]>>(
      `${API_URL}/suites/${suiteId}/cases`
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get all test cases in a project
 */
export const getTestCasesByProject = async (
  projectId: string
): Promise<TestCaseResponse[]> => {
  try {
    const response = await axios.get<ApiResponse<TestCaseResponse[]>>(
      `${API_URL}/projects/${projectId}/cases`
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get a single test case by ID
 */
export const getTestCase = async (id: string): Promise<TestCaseResponse> => {
  try {
    const response = await axios.get<ApiResponse<TestCaseResponse>>(
      `${API_URL}/cases/${id}`
    );
    if (!response.data.data) {
      throw new Error("Test case not found");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Update a test case
 */
export const updateTestCase = async (
  id: string,
  data: UpdateTestCaseRequest
): Promise<TestCaseResponse> => {
  try {
    const response = await axios.put<ApiResponse<TestCaseResponse>>(
      `${API_URL}/cases/${id}`,
      data
    );
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Delete a test case
 */
export const deleteTestCase = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/cases/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Bulk update status for multiple test cases
 */
export const bulkUpdateStatus = async (
  testCaseIds: string[],
  status: Status
): Promise<{ updatedCount: number }> => {
  try {
    const response = await axios.patch<
      ApiResponse<{ updatedCount: number }>
    >(`${API_URL}/cases/bulk-status`, {
      testCaseIds,
      status,
    });
    return response.data.data || { updatedCount: 0 };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Bulk delete test cases
 */
export const bulkDeleteTestCases = async (ids: string[]): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/cases/bulk`, {
      data: { ids }
    });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// Export all API functions as a namespace for convenience
export const testManagerApi = {
  // Projects
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  // Test Suites
  createTestSuite,
  getTestSuites,
  getTestSuite,
  updateTestSuite,
  deleteTestSuite,
  // Test Cases
  createTestCase,
  getTestCases,
  getTestCasesByProject,
  getTestCase,
  updateTestCase,
  deleteTestCase,
  bulkUpdateStatus,
  bulkDeleteTestCases,
};
