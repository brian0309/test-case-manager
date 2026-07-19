import axios from "axios";
import { API_URL } from "../utils/api";
import type {
  DiscussionAttachment,
  DiscussionMessage,
  DiscussionMessageFixState,
} from "./discussionApi";

// Configure axios to send credentials with all requests
axios.defaults.withCredentials = true;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface DeleteDiscussionMessageResponse {
  id: string;
}

/**
 * Get all discussion messages for a ticket
 */
export const fetchTicketDiscussionMessages = async (
  ticketId: string
): Promise<DiscussionMessage[]> => {
  const response = await axios.get<ApiResponse<DiscussionMessage[]>>(
    `${API_URL}/tickets/${ticketId}/discussions`,
    { withCredentials: true }
  );
  return response.data.data ?? [];
};

/**
 * Create a new discussion message for a ticket
 */
export const sendTicketDiscussionMessage = async (
  ticketId: string,
  projectId: string,
  body: string,
  attachments: DiscussionAttachment[] = []
): Promise<DiscussionMessage> => {
  const response = await axios.post<ApiResponse<DiscussionMessage>>(
    `${API_URL}/tickets/${ticketId}/discussions`,
    { body, projectId, attachments },
    { withCredentials: true }
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to send message");
  }
  return response.data.data;
};

export const updateTicketDiscussionMessageFixState = async (
  ticketId: string,
  messageId: string,
  projectId: string,
  fixState: DiscussionMessageFixState
): Promise<DiscussionMessage> => {
  const response = await axios.patch<ApiResponse<DiscussionMessage>>(
    `${API_URL}/tickets/${ticketId}/discussions/${messageId}/fix-state`,
    { projectId, fixState },
    { withCredentials: true }
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to update message");
  }
  return response.data.data;
};

export const deleteTicketDiscussionMessage = async (
  ticketId: string,
  messageId: string
): Promise<string> => {
  const response = await axios.delete<ApiResponse<DeleteDiscussionMessageResponse>>(
    `${API_URL}/tickets/${ticketId}/discussions/${messageId}`,
    { withCredentials: true }
  );

  if (!response.data.data?.id) {
    throw new Error(response.data.message || 'Failed to delete message');
  }

  return response.data.data.id;
};
