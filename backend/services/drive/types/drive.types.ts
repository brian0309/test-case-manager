/**
 * Types and constants for the Google Drive video evidence integration.
 */

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export const DRIVE_APP_PROPERTY = { app: "test-case-manager" } as const;

/**
 * File validation constraints for video evidence.
 */
export const VIDEO_CONSTRAINTS = {
  MAX_FILE_SIZE: (parseInt(process.env.VIDEO_EVIDENCE_MAX_SIZE_MB || "1024", 10) || 1024) * 1024 * 1024,
  ALLOWED_MIME_TYPES: ["video/mp4", "video/webm", "video/quicktime"] as string[],
  UPLOAD_SESSION_EXPIRY_SECONDS: 60 * 60, // 1 hour
} as const;

/**
 * Maximum number of upload-session requests per minute per IP.
 */
export const UPLOAD_SESSION_RATE_LIMIT_MAX = 10;

export const VIDEO_ERRORS = {
  NOT_ENABLED: "Video evidence is not enabled for this project",
  NOT_CONNECTED: "Google Drive is not connected",
  UPLOADER_DISCONNECTED: "The uploader has disconnected from Google Drive",
  FILE_TOO_LARGE: "File size exceeds the maximum allowed size",
  INVALID_FILE_TYPE:
    "File type not supported. Please upload an MP4, WebM, or MOV video",
  MISSING_SCOPE: "A ticket or a test run item must be specified",
  INVALID_SCOPE_TARGET: "The linked ticket or test run item was not found",
  NOT_FOUND: "Video evidence not found",
  DRIVE_FILE_MISSING: "This video was deleted or is no longer accessible",
  UPLOAD_NOT_FOUND: "Uploaded file could not be located in Google Drive",
  FORBIDDEN: "You do not have permission to perform this action",
} as const;

export class DriveServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DriveServiceError";
    this.status = status;
  }
}

export interface DriveConnectionInfo {
  connected: boolean;
  googleEmail?: string;
  connectedAt?: string;
}

export interface DriveUploadSession {
  sessionUri: string;
  accessToken: string;
  expiresIn: number;
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  appProperties?: Record<string, string>;
  owners?: { me: boolean }[];
}

export interface CreateVideoEvidenceInput {
  projectId: string;
  uploadedBy: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  webViewLink?: string;
  ticketId?: string;
  testRunId?: string;
  testRunItemId?: string;
}