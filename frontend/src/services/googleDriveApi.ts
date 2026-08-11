/**
 * Google Drive API Service
 * Handles Drive OAuth connection and video evidence operations.
 * Uses API_URL + withCredentials (cookie-based auth) per repo conventions.
 */

import axios, { AxiosError } from "axios";
import { API_URL } from "../utils/api";
import {
  DriveConnection,
  DriveUploadSession,
  VideoEvidence,
} from "../types/testManager";
import { ApiErrorResponse } from "../types/api/testManager.api";

const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || "An unexpected error occurred";
};

// ============================================================================
// DRIVE CONNECTION
// ============================================================================

/**
 * GET /drive/auth/url
 * Returns the Google OAuth URL to connect this user's Drive.
 */
export const getDriveAuthUrl = async (): Promise<string> => {
  try {
    const response = await axios.get<{ success: boolean; url: string }>(
      `${API_URL}/drive/auth/url`,
      { withCredentials: true }
    );
    return response.data.url;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * GET /drive/connection
 * Reports whether the current user has connected Google Drive.
 */
export const getDriveConnection = async (): Promise<DriveConnection> => {
  try {
    const response = await axios.get<{ success: boolean; data: DriveConnection }>(
      `${API_URL}/drive/connection`,
      { withCredentials: true }
    );
    return response.data.data || { connected: false };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * DELETE /drive/connection
 * Revokes the Google authorization and removes stored tokens.
 */
export const disconnectDrive = async (): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/drive/connection`, { withCredentials: true });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ============================================================================
// VIDEO EVIDENCE
// ============================================================================

export interface EvidenceScopeParams {
  ticketId?: string;
  testRunId?: string;
  testRunItemId?: string;
}

export interface CreateUploadSessionParams extends EvidenceScopeParams {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * POST /projects/:projectId/video-evidence/upload-session
 * Backend authorizes a resumable Drive upload; the bytes never pass through us.
 */
export const createUploadSession = async (
  projectId: string,
  params: CreateUploadSessionParams
): Promise<DriveUploadSession> => {
  try {
    const response = await axios.post<{
      success: boolean;
      data: DriveUploadSession;
    }>(`${API_URL}/projects/${projectId}/video-evidence/upload-session`, params, {
      withCredentials: true,
    });
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export interface RegisterEvidenceParams extends EvidenceScopeParams {
  driveFileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * POST /projects/:projectId/video-evidence
 * Registers evidence metadata after the direct upload completes.
 */
export const registerVideoEvidence = async (
  projectId: string,
  params: RegisterEvidenceParams
): Promise<VideoEvidence> => {
  try {
    const response = await axios.post<{
      success: boolean;
      data: VideoEvidence;
    }>(`${API_URL}/projects/${projectId}/video-evidence`, params, {
      withCredentials: true,
    });
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export interface ResolveUploadParams {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * POST /projects/:projectId/video-evidence/resolve-upload
 * Re-locates a file the browser already pushed to Drive when Google's final
 * response was lost. Returns the drive file id so the caller can register it.
 */
export const resolveUploadedFile = async (
  projectId: string,
  params: ResolveUploadParams
): Promise<{ driveFileId: string; webViewLink?: string }> => {
  try {
    const response = await axios.post<{
      success: boolean;
      data: { driveFileId: string; webViewLink?: string };
    }>(`${API_URL}/projects/${projectId}/video-evidence/resolve-upload`, params, {
      withCredentials: true,
    });
    if (!response.data.data) {
      throw new Error("No data returned from server");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * GET /projects/:projectId/video-evidence
 * Lists evidence for a ticket, run, or run item.
 */
export const listVideoEvidence = async (
  projectId: string,
  params: EvidenceScopeParams = {}
): Promise<VideoEvidence[]> => {
  try {
    const response = await axios.get<{
      success: boolean;
      data: VideoEvidence[];
    }>(`${API_URL}/projects/${projectId}/video-evidence`, {
      params: {
        ...(params.ticketId ? { ticketId: params.ticketId } : {}),
        ...(params.testRunId ? { testRunId: params.testRunId } : {}),
        ...(params.testRunItemId ? { testRunItemId: params.testRunItemId } : {}),
      },
      withCredentials: true,
    });
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * DELETE /projects/:projectId/video-evidence/:evidenceId
 */
export const deleteVideoEvidence = async (
  projectId: string,
  evidenceId: string
): Promise<void> => {
  try {
    await axios.delete(
      `${API_URL}/projects/${projectId}/video-evidence/${evidenceId}`,
      { withCredentials: true }
    );
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Absolute URL for the authenticated proxy video stream.
 * The <video> element streams through the backend with Range support.
 */
export const getEvidenceStreamUrl = (
  projectId: string,
  evidenceId: string
): string => {
  return `${API_URL}/projects/${projectId}/video-evidence/${evidenceId}/stream`;
};