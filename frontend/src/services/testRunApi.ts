/**
 * Test Run API Service
 * Handles all API calls for test run management
 */

import axios, { AxiosError } from "axios";
import { API_URL } from "../utils/api";
import {
  ApiResponse,
  ApiErrorResponse,
  TestRunResponse,
  TestRunListResponse,
  CreateTestRunRequest,
  UpdateTestRunRequest,
  UpdateRunItemRequest,
  ReorderRunItemsRequest,
  ReorderTestCasesRequest,
  TestCaseResponse,
} from "../types/api/testManager.api";

// Configure axios to send credentials with all requests
axios.defaults.withCredentials = true;

// Helper to extract error message
const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || "An unexpected error occurred";
};

// ============================================================================
// TEST RUN API
// ============================================================================

/**
 * Create a new test run
 */
export const createTestRun = async (
  projectId: string,
  data: CreateTestRunRequest
): Promise<TestRunResponse> => {
  try {
    const response = await axios.post<ApiResponse<TestRunResponse>>(
      `${API_URL}/projects/${projectId}/runs`,
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
 * Get all test runs for a project
 */
export const getTestRuns = async (
  projectId: string
): Promise<TestRunListResponse[]> => {
  try {
    const response = await axios.get<ApiResponse<TestRunListResponse[]>>(
      `${API_URL}/projects/${projectId}/runs`
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get a single test run by ID
 */
export const getTestRun = async (id: string): Promise<TestRunResponse> => {
  try {
    const response = await axios.get<ApiResponse<TestRunResponse>>(
      `${API_URL}/runs/${id}`
    );
    if (!response.data.data) {
      throw new Error("Test run not found");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Update a test run
 */
export const updateTestRun = async (
  id: string,
  data: UpdateTestRunRequest
): Promise<TestRunResponse> => {
  try {
    const response = await axios.put<ApiResponse<TestRunResponse>>(
      `${API_URL}/runs/${id}`,
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
 * Delete a test run
 */
export const deleteTestRun = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/runs/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Update a run item (execute a test case)
 */
export const updateRunItem = async (
  runId: string,
  itemId: string,
  data: UpdateRunItemRequest
): Promise<TestRunResponse> => {
  try {
    const response = await axios.patch<ApiResponse<TestRunResponse>>(
      `${API_URL}/runs/${runId}/items/${itemId}`,
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
 * Reorder items in a test run
 */
export const reorderRunItems = async (
  runId: string,
  data: ReorderRunItemsRequest
): Promise<TestRunResponse> => {
  try {
    const response = await axios.patch<ApiResponse<TestRunResponse>>(
      `${API_URL}/runs/${runId}/reorder`,
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
 * Clone a test run
 */
export const cloneTestRun = async (
  id: string,
  title?: string
): Promise<TestRunResponse> => {
  try {
    const response = await axios.post<ApiResponse<TestRunResponse>>(
      `${API_URL}/runs/${id}/clone`,
      { title }
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
 * Complete a test run
 */
export const completeTestRun = async (id: string): Promise<TestRunResponse> => {
  try {
    const response = await axios.post<ApiResponse<TestRunResponse>>(
      `${API_URL}/runs/${id}/complete`
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
 * Reorder test cases in a suite
 */
export const reorderTestCases = async (
  suiteId: string,
  data: ReorderTestCasesRequest
): Promise<TestCaseResponse[]> => {
  try {
    const response = await axios.patch<ApiResponse<TestCaseResponse[]>>(
      `${API_URL}/suites/${suiteId}/cases/reorder`,
      data
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get all unique tags for a project
 */
export const getTagsByProject = async (
  projectId: string
): Promise<string[]> => {
  try {
    const response = await axios.get<ApiResponse<string[]>>(
      `${API_URL}/projects/${projectId}/runs/tags`
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ============================================================================
// TEST RUN GROUP API
// ============================================================================

import {
  TestRunGroupResponse,
  CreateTestRunGroupRequest,
  UpdateTestRunGroupRequest,
} from "../types/api/testManager.api";

/**
 * Create a new test run group
 */
export const createTestRunGroup = async (
  projectId: string,
  data: CreateTestRunGroupRequest
): Promise<TestRunGroupResponse> => {
  try {
    const response = await axios.post<ApiResponse<TestRunGroupResponse>>(
      `${API_URL}/projects/${projectId}/run-groups`,
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
 * Get all test run groups for a project
 */
export const getTestRunGroups = async (
  projectId: string
): Promise<TestRunGroupResponse[]> => {
  try {
    const response = await axios.get<ApiResponse<TestRunGroupResponse[]>>(
      `${API_URL}/projects/${projectId}/run-groups`
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get a single test run group by ID
 */
export const getTestRunGroup = async (id: string): Promise<TestRunGroupResponse> => {
  try {
    const response = await axios.get<ApiResponse<TestRunGroupResponse>>(
      `${API_URL}/run-groups/${id}`
    );
    if (!response.data.data) {
      throw new Error("Test run group not found");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Update a test run group
 */
export const updateTestRunGroup = async (
  id: string,
  data: UpdateTestRunGroupRequest
): Promise<TestRunGroupResponse> => {
  try {
    const response = await axios.put<ApiResponse<TestRunGroupResponse>>(
      `${API_URL}/run-groups/${id}`,
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
 * Delete a test run group
 */
export const deleteTestRunGroup = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/run-groups/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// Export all API functions as a namespace for convenience
export const testRunApi = {
  createTestRun,
  getTestRuns,
  getTestRun,
  updateTestRun,
  deleteTestRun,
  updateRunItem,
  reorderRunItems,
  cloneTestRun,
  completeTestRun,
  reorderTestCases,
  getTagsByProject,
  // Test Run Groups
  createTestRunGroup,
  getTestRunGroups,
  getTestRunGroup,
  updateTestRunGroup,
  deleteTestRunGroup,
};

