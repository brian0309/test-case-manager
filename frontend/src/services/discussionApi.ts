/**
 * Discussion API Service
 * Handles all API calls for test case discussions
 */

import axios, { AxiosError } from "axios";
import { API_URL } from "../utils/api";
import { Discussion, DiscussionMessage } from "../types/testManager";

// Configure axios to send credentials with all requests
axios.defaults.withCredentials = true;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ApiErrorResponse {
  success: false;
  message: string;
}

// Helper to extract error message
const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || "An unexpected error occurred";
};

/**
 * Get all discussions for a test case
 */
export const getDiscussions = async (testCaseId: string): Promise<Discussion> => {
  try {
    const response = await axios.get<ApiResponse<Discussion>>(
      `${API_URL}/testcase/${testCaseId}/discussions`
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
 * Create a new message in a test case discussion
 */
export const createMessage = async (
  testCaseId: string,
  content: string,
  imageUrl?: string
): Promise<DiscussionMessage> => {
  try {
    const response = await axios.post<ApiResponse<DiscussionMessage>>(
      `${API_URL}/testcase/${testCaseId}/discussions`,
      {
        content,
        imageUrl,
        messageType: imageUrl ? "image" : "text",
      }
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
 * Delete a message from a test case discussion
 */
export const deleteMessage = async (
  testCaseId: string,
  messageId: string
): Promise<void> => {
  try {
    await axios.delete(
      `${API_URL}/testcase/${testCaseId}/discussions/${messageId}`
    );
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
