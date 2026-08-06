/**
 * Ticket API Service
 * Handles all API calls for bug/issue ticket management
 */

import axios, { AxiosError } from "axios";
import { API_URL } from "../utils/api";
import {
  ApiResponse,
  ApiErrorResponse,
  PaginationMeta,
  TicketResponse,
  TicketListResponse,
  CreateTicketRequest,
  UpdateTicketRequest,
  ReturnReason,
} from "../types/api/testManager.api";

// Configure axios to send credentials with all requests
axios.defaults.withCredentials = true;

// Helper to extract error message
const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || "An unexpected error occurred";
};

export interface PaginatedTicketsResult {
  items: TicketListResponse[];
  meta: PaginationMeta;
}

// ============================================================================
// TICKET API
// ============================================================================

/**
 * Create a new ticket
 */
export const createTicket = async (
  projectId: string,
  data: CreateTicketRequest
): Promise<TicketResponse> => {
  try {
    const response = await axios.post<ApiResponse<TicketResponse>>(
      `${API_URL}/projects/${projectId}/tickets`,
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
 * Get all tickets for a project
 */
export const getTickets = async (
  projectId: string
): Promise<TicketListResponse[]> => {
  try {
    const response = await axios.get<ApiResponse<TicketListResponse[]>>(
      `${API_URL}/projects/${projectId}/tickets`
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get paginated tickets for a project
 */
export const getTicketsPaginated = async (
  projectId: string,
  params: { limit: number; offset: number }
): Promise<PaginatedTicketsResult> => {
  try {
    const response = await axios.get<ApiResponse<TicketListResponse[]>>(
      `${API_URL}/projects/${projectId}/tickets`,
      { params }
    );

    const fallbackMeta: PaginationMeta = {
      total: response.data.data?.length || 0,
      limit: params.limit,
      offset: params.offset,
      hasMore: false,
    };

    return {
      items: response.data.data || [],
      meta: response.data.meta || fallbackMeta,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get a single ticket by ID (requires projectId)
 */
export const getTicket = async (
  projectId: string,
  id: string
): Promise<TicketResponse> => {
  try {
    const response = await axios.get<ApiResponse<TicketResponse>>(
      `${API_URL}/projects/${projectId}/tickets/${id}`
    );
    if (!response.data.data) {
      throw new Error("Ticket not found");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get a single ticket by ID directly (without projectId).
 * The backend derives projectId from the ticket document for access control.
 */
export const getTicketById = async (
  id: string
): Promise<TicketResponse> => {
  try {
    const response = await axios.get<ApiResponse<TicketResponse>>(
      `${API_URL}/tickets/${id}`
    );
    if (!response.data.data) {
      throw new Error("Ticket not found");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Update a ticket
 */
export const updateTicket = async (
  projectId: string,
  id: string,
  data: UpdateTicketRequest
): Promise<TicketResponse> => {
  try {
    const response = await axios.put<ApiResponse<TicketResponse>>(
      `${API_URL}/projects/${projectId}/tickets/${id}`,
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
 * Delete a ticket
 */
export const deleteTicket = async (
  projectId: string,
  id: string
): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/projects/${projectId}/tickets/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get tickets linked to a specific test run
 */
export const getTicketsByRun = async (
  projectId: string,
  runId: string
): Promise<TicketListResponse[]> => {
  try {
    const response = await axios.get<ApiResponse<TicketListResponse[]>>(
      `${API_URL}/projects/${projectId}/tickets/by-run/${runId}`
    );
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get tickets linked to a specific test run with pagination
 */
export const getTicketsByRunPaginated = async (
  projectId: string,
  runId: string,
  params: { limit: number; offset: number }
): Promise<PaginatedTicketsResult> => {
  try {
    const response = await axios.get<ApiResponse<TicketListResponse[]>>(
      `${API_URL}/projects/${projectId}/tickets/by-run/${runId}`,
      { params }
    );

    const fallbackMeta: PaginationMeta = {
      total: response.data.data?.length || 0,
      limit: params.limit,
      offset: params.offset,
      hasMore: false,
    };

    return {
      items: response.data.data || [],
      meta: response.data.meta || fallbackMeta,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Mark a ticket as reproduced by an engineer. Records firstReproducedAt.
 */
export const markTicketReproduced = async (
  projectId: string,
  id: string
): Promise<TicketResponse> => {
  try {
    const response = await axios.post<ApiResponse<TicketResponse>>(
      `${API_URL}/projects/${projectId}/tickets/${id}/reproduced`
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
 * Flag a ticket as returned for missing context (with a reason).
 */
export const returnTicketForInfo = async (
  projectId: string,
  id: string,
  reason: ReturnReason
): Promise<TicketResponse> => {
  try {
    const response = await axios.post<ApiResponse<TicketResponse>>(
      `${API_URL}/projects/${projectId}/tickets/${id}/return-for-info`,
      { reason }
    );
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// Export all API functions as a namespace for convenience
export const ticketApi = {
  createTicket,
  getTickets,
  getTicketsPaginated,
  getTicket,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketsByRun,
  getTicketsByRunPaginated,
  markTicketReproduced,
  returnTicketForInfo,
};
