import axios from "axios";
import { API_URL } from "../utils/api";

// Configure axios to send credentials with all requests
axios.defaults.withCredentials = true;

export interface DiscussionAttachment {
  url: string;
  filename: string;
  fileSize: number;
  contentType: string;
}

export type DiscussionMessageBodyFormat = "plain" | "html";
export type DiscussionMessageFixState = "fixed" | "not-fixed";

export interface DiscussionMessage {
  id: string;
  testCaseId: string;
  projectId: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  type: "comment" | "system";
  body: string;
  bodyFormat: DiscussionMessageBodyFormat;
  fixState?: DiscussionMessageFixState;
  relatedRunId?: string;
  relatedRunItemId?: string;
  attachments: DiscussionAttachment[];
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface DeleteDiscussionMessageResponse {
  id: string;
}

/**
 * Get all discussion messages for a test case
 */
export const fetchDiscussionMessages = async (
  testCaseId: string
): Promise<DiscussionMessage[]> => {
  const response = await axios.get<ApiResponse<DiscussionMessage[]>>(
    `${API_URL}/cases/${testCaseId}/discussions`,
    { withCredentials: true }
  );
  return response.data.data ?? [];
};

/**
 * Create a new discussion message
 */
export const sendDiscussionMessage = async (
  testCaseId: string,
  projectId: string,
  body: string,
  attachments: DiscussionAttachment[] = []
): Promise<DiscussionMessage> => {
  const response = await axios.post<ApiResponse<DiscussionMessage>>(
    `${API_URL}/cases/${testCaseId}/discussions`,
    { body, projectId, attachments },
    { withCredentials: true }
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to send message");
  }
  return response.data.data;
};

export const updateDiscussionMessageFixState = async (
  testCaseId: string,
  messageId: string,
  projectId: string,
  fixState: DiscussionMessageFixState
): Promise<DiscussionMessage> => {
  const response = await axios.patch<ApiResponse<DiscussionMessage>>(
    `${API_URL}/cases/${testCaseId}/discussions/${messageId}/fix-state`,
    { projectId, fixState },
    { withCredentials: true }
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to update message");
  }
  return response.data.data;
};

export const deleteDiscussionMessage = async (
  testCaseId: string,
  messageId: string
): Promise<string> => {
  const response = await axios.delete<ApiResponse<DeleteDiscussionMessageResponse>>(
    `${API_URL}/cases/${testCaseId}/discussions/${messageId}`,
    { withCredentials: true }
  );

  if (!response.data.data?.id) {
    throw new Error(response.data.message || 'Failed to delete message');
  }

  return response.data.data.id;
};
