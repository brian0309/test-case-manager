import { Types } from "mongoose";
import { Ticket } from "../../../models/ticket.model.js";
import { TestRun } from "../../../models/testRun.model.js";
import { Project } from "../../../models/project.model.js";
import { User } from "../../../models/user.model.js";
import { VideoEvidence } from "../../../models/videoEvidence.model.js";
import {
  hasProjectAccess,
  isProjectOwner,
} from "../../testCase/services/project.service.js";
import {
  DriveServiceError,
  DriveUploadSession,
  VIDEO_CONSTRAINTS,
  VIDEO_ERRORS,
} from "../types/drive.types.js";
import {
  createDrivePermission,
  createResumableUploadSession,
  deleteDriveFile,
  ensureProjectFolder,
  ensureRootFolder,
  getDriveFileMedia,
  getDriveFileMetadata,
  listRecentProjectFiles,
} from "./driveApi.service.js";
import { getDriveAccessToken } from "./driveOAuth.service.js";
import {
  decryptRefreshToken,
  getEncryptedDriveToken,
} from "./driveConnection.service.js";
import { IVideoEvidenceDocument } from "../types/videoEvidence.types.js";

interface EvidenceScope {
  ticketId?: string;
  testRunId?: string;
  testRunItemId?: string;
}

type RegisterEvidenceInput = EvidenceScope & {
  driveFileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  webViewLink?: string;
};

interface VideoEvidenceResponse {
  id: string;
  projectId: string;
  ticketId?: string;
  testRunId?: string;
  testRunItemId?: string;
  provider: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  webViewLink?: string;
  uploadedBy: { id: string; name: string };
  createdAt: string;
}

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);

/**
 * Reads the videoEvidence project setting; throws when disabled.
 */
const requireVideoEvidenceEnabled = async (
  projectId: string,
  userId: string
): Promise<{ publicLinks: boolean; projectName: string }> => {
  const hasAccess = await hasProjectAccess(projectId, userId);
  if (!hasAccess) {
    throw new DriveServiceError(404, VIDEO_ERRORS.NOT_FOUND);
  }

  const project = await Project.findById(projectId)
    .select("settings name")
    .lean();

  const enabled = project?.settings?.videoEvidence?.enabled === true;
  if (!enabled) {
    throw new DriveServiceError(403, VIDEO_ERRORS.NOT_ENABLED);
  }

  return {
    publicLinks: project.settings?.videoEvidence?.publicLinks === true,
    projectName: project?.name || "Project",
  };
};

/**
 * Validates that exactly one evidence scope exists and belongs to the project.
 */
const validateScope = async (
  projectId: string,
  scope: EvidenceScope
): Promise<EvidenceScope> => {
  const hasTicket = Boolean(scope.ticketId);
  const hasRun =
    Boolean(scope.testRunId) && Boolean(scope.testRunItemId);

  if (hasTicket && hasRun) {
    throw new DriveServiceError(400, VIDEO_ERRORS.MISSING_SCOPE);
  }

  if (hasTicket) {
    const ticket = await Ticket.findOne({
      _id: scope.ticketId,
      projectId: toObjectId(projectId),
    }).select("_id");
    if (!ticket) {
      throw new DriveServiceError(404, VIDEO_ERRORS.INVALID_SCOPE_TARGET);
    }
    return { ticketId: scope.ticketId };
  }

  if (hasRun) {
    const run = await TestRun.findOne({
      _id: scope.testRunId,
      projectId: toObjectId(projectId),
    }).select("items");
    if (!run) {
      throw new DriveServiceError(404, VIDEO_ERRORS.INVALID_SCOPE_TARGET);
    }
    const itemExists = run.items.some(
      (item) => item._id?.toString() === scope.testRunItemId
    );
    if (!itemExists) {
      throw new DriveServiceError(404, VIDEO_ERRORS.INVALID_SCOPE_TARGET);
    }
    return { testRunId: scope.testRunId, testRunItemId: scope.testRunItemId };
  }

  throw new DriveServiceError(400, VIDEO_ERRORS.MISSING_SCOPE);
};

const validateVideoFile = (mimeType: string, fileSize: number): void => {
  if (!VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new DriveServiceError(400, VIDEO_ERRORS.INVALID_FILE_TYPE);
  }
  if (fileSize > VIDEO_CONSTRAINTS.MAX_FILE_SIZE || fileSize <= 0) {
    throw new DriveServiceError(400, VIDEO_ERRORS.FILE_TOO_LARGE);
  }
};

const sanitizeFileName = (filename: string): string => {
  const clean = filename
    .replace(/[^a-zA-Z0-9._\u00C0-\u024F-]/g, "_")
    .substring(0, 200);
  return clean || "recording.mp4";
};

/**
 * Ensures the user's Drive folder hierarchy for this project exists.
 * Folder ids are cached on the user document.
 */
const ensureProjectFolders = async (
  userId: string,
  projectId: string,
  projectName: string,
  accessToken: string
): Promise<string> => {
  const user = await User.findById(userId).select("googleDrive.folders").lean();
  const folders = (user?.googleDrive?.folders as Record<string, string>) || {};

  const rootId = await ensureRootFolder(accessToken, folders["__root__"]);
  const projectFolderId =
    folders[projectId] ||
    (await ensureProjectFolder(accessToken, rootId, projectName));

  await User.findByIdAndUpdate(userId, {
    $set: {
      "googleDrive.folders.__root__": rootId,
      [`googleDrive.folders.${projectId}`]: projectFolderId,
    },
  });

  return projectFolderId;
};

/**
 * Creates a resumable upload session. The browser uploads the file directly
 * to Drive using the returned session URI; no video bytes pass through us.
 */
export const createUploadSession = async (
  projectId: string,
  userId: string,
  data: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    ticketId?: string;
    testRunId?: string;
    testRunItemId?: string;
  }
): Promise<DriveUploadSession> => {
  const { projectName } = await requireVideoEvidenceEnabled(projectId, userId);

  const fileName = sanitizeFileName(data.fileName);
  validateVideoFile(data.mimeType, data.fileSize);

  await validateScope(projectId, data);

  const encryptedToken = await getEncryptedDriveToken(userId);
  if (!encryptedToken) {
    throw new DriveServiceError(403, VIDEO_ERRORS.NOT_CONNECTED);
  }

  const accessToken = await getDriveAccessToken(
    userId,
    decryptRefreshToken,
    async () => encryptedToken
  );

  const projectFolderId = await ensureProjectFolders(
    userId,
    projectId,
    projectName,
    accessToken
  );

  const sessionUri = await createResumableUploadSession(accessToken, {
    name: fileName,
    mimeType: data.mimeType,
    parents: [projectFolderId],
  });

  return {
    sessionUri,
    accessToken,
    expiresIn: VIDEO_CONSTRAINTS.UPLOAD_SESSION_EXPIRY_SECONDS,
  };
};

/**
 * Locates the file the browser just uploaded to the project's Drive folder.
 * Used when Google's final upload response was lost (CORS/redirect stalls):
 * the backend re-queries Drive for the newest matching file instead of
 * leaving the UI stuck at 100%.
 */
export const resolveUploadedFileId = async (
  projectId: string,
  userId: string,
  data: { fileName: string; mimeType: string; fileSize: number }
): Promise<{ driveFileId: string; webViewLink?: string }> => {
  const { projectName } = await requireVideoEvidenceEnabled(projectId, userId);

  const fileName = sanitizeFileName(data.fileName);
  validateVideoFile(data.mimeType, data.fileSize);

  const encryptedToken = await getEncryptedDriveToken(userId);
  if (!encryptedToken) {
    throw new DriveServiceError(403, VIDEO_ERRORS.NOT_CONNECTED);
  }

  const accessToken = await getDriveAccessToken(
    userId,
    decryptRefreshToken,
    async () => encryptedToken
  );

  const projectFolderId = await ensureProjectFolders(
    userId,
    projectId,
    projectName,
    accessToken
  );

  const candidates = await listRecentProjectFiles(
    accessToken,
    projectFolderId,
    fileName,
    data.mimeType
  );

  const match = candidates.find(
    (file) =>
      file.appProperties?.app === "test-case-manager" &&
      file.owners?.some((owner) => owner.me) &&
      parseInt(file.size || "0", 10) === data.fileSize
  );

  if (!match) {
    throw new DriveServiceError(404, VIDEO_ERRORS.UPLOAD_NOT_FOUND);
  }

  return { driveFileId: match.id, webViewLink: match.webViewLink };
};

const formatEvidence = async (
  evidence: IVideoEvidenceDocument
): Promise<VideoEvidenceResponse> => {
  const uploader = await User.findById(evidence.uploadedBy).select("name");

  return {
    id: evidence._id.toString(),
    projectId: evidence.projectId.toString(),
    ticketId: evidence.ticketId?.toString(),
    testRunId: evidence.testRunId?.toString(),
    testRunItemId: evidence.testRunItemId,
    provider: evidence.provider,
    driveFileId: evidence.driveFileId,
    fileName: evidence.fileName,
    mimeType: evidence.mimeType,
    fileSize: evidence.fileSize,
    webViewLink: evidence.webViewLink,
    uploadedBy: { id: evidence.uploadedBy.toString(), name: uploader?.name || "Unknown" },
    createdAt: evidence.createdAt?.toISOString() || new Date().toISOString(),
  };
};

/**
 * Registers evidence after the browser finished uploading to Drive.
 * Verifies the Drive file was created through this application before
 * storing its metadata (prevents arbitrary driveFileId injection).
 */
export const registerVideoEvidence = async (
  projectId: string,
  userId: string,
  data: RegisterEvidenceInput
): Promise<VideoEvidenceResponse> => {
  const { publicLinks } = await requireVideoEvidenceEnabled(projectId, userId);

  validateVideoFile(data.mimeType, data.fileSize);

  const scope = await validateScope(projectId, data);

  const encryptedToken = await getEncryptedDriveToken(userId);
  if (!encryptedToken) {
    throw new DriveServiceError(403, VIDEO_ERRORS.NOT_CONNECTED);
  }

  const accessToken = await getDriveAccessToken(
    userId,
    decryptRefreshToken,
    async () => encryptedToken
  );

  const metadata = await getDriveFileMetadata(accessToken, data.driveFileId);
  const isOwnedByApp =
    metadata.appProperties?.app === "test-case-manager" &&
    metadata.owners?.some((owner) => owner.me);
  if (!isOwnedByApp) {
    throw new DriveServiceError(403, VIDEO_ERRORS.FORBIDDEN);
  }

  if (!VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(metadata.mimeType)) {
    throw new DriveServiceError(400, VIDEO_ERRORS.INVALID_FILE_TYPE);
  }

  let webViewLink = metadata.webViewLink;

  if (publicLinks) {
    await createDrivePermission(accessToken, data.driveFileId, {
      role: "reader",
      type: "anyone",
      allowFileDiscovery: false,
    });
    const refreshed = await getDriveFileMetadata(accessToken, data.driveFileId);
    webViewLink = refreshed.webViewLink || webViewLink;
  }

  const evidence = new VideoEvidence({
    projectId: toObjectId(projectId),
    uploadedBy: toObjectId(userId),
    provider: "google_drive" as const,
    driveFileId: data.driveFileId,
    fileName: sanitizeFileName(data.fileName),
    mimeType: metadata.mimeType,
    fileSize: parseInt(metadata.size || String(data.fileSize), 10) || data.fileSize,
    webViewLink,
    ...(scope.ticketId ? { ticketId: toObjectId(scope.ticketId) } : {}),
    ...(scope.testRunId ? { testRunId: toObjectId(scope.testRunId) } : {}),
    ...(scope.testRunItemId ? { testRunItemId: scope.testRunItemId } : {}),
  });

  try {
    await evidence.save();
  } catch (error: unknown) {
    if ((error as { code?: number })?.code === 11000) {
      throw new DriveServiceError(409, "This video was already registered");
    }
    throw error;
  }

  return formatEvidence(evidence);
};

/**
 * Lists evidence for a ticket, run, or run item.
 */
export const listVideoEvidence = async (
  projectId: string,
  userId: string,
  query: EvidenceScope
): Promise<VideoEvidenceResponse[]> => {
  await requireVideoEvidenceEnabled(projectId, userId);

  const filter: Record<string, unknown> = {
    projectId: toObjectId(projectId),
  };

  if (query.ticketId) filter.ticketId = query.ticketId;
  if (query.testRunId) filter.testRunId = query.testRunId;
  if (query.testRunItemId) filter.testRunItemId = query.testRunItemId;

  const rows = await VideoEvidence.find(filter).sort({ createdAt: -1 });
  return Promise.all(rows.map((row) => formatEvidence(row)));
};

/**
 * Deletes evidence. Only the uploader or the project owner may delete it.
 */
export const deleteVideoEvidence = async (
  projectId: string,
  userId: string,
  evidenceId: string
): Promise<void> => {
  await requireVideoEvidenceEnabled(projectId, userId);

  const evidence = await VideoEvidence.findById(evidenceId);
  if (!evidence || evidence.projectId.toString() !== projectId) {
    throw new DriveServiceError(404, VIDEO_ERRORS.NOT_FOUND);
  }

  const isUploader = evidence.uploadedBy.toString() === userId;
  const isOwner = await isProjectOwner(projectId, userId);
  if (!isUploader && !isOwner) {
    throw new DriveServiceError(403, VIDEO_ERRORS.FORBIDDEN);
  }

  if (isUploader) {
    const encryptedToken = await getEncryptedDriveToken(userId);
    if (encryptedToken) {
      const accessToken = await getDriveAccessToken(
        userId,
        decryptRefreshToken,
        async () => encryptedToken
      );
      await deleteDriveFile(accessToken, evidence.driveFileId);
    }
  }

  await VideoEvidence.deleteOne({ _id: evidence._id });
};

export interface StreamResult {
  upstream: Response;
  mimeType: string;
}

/**
 * Streams the video from the uploader's Drive for an authorized project member.
 */
export const getEvidenceStream = async (
  projectId: string,
  userId: string,
  evidenceId: string,
  range?: string
): Promise<StreamResult> => {
  await requireVideoEvidenceEnabled(projectId, userId);

  const evidence = await VideoEvidence.findById(evidenceId);
  if (!evidence || evidence.projectId.toString() !== projectId) {
    throw new DriveServiceError(404, VIDEO_ERRORS.NOT_FOUND);
  }

  const encryptedToken = await getEncryptedDriveToken(
    evidence.uploadedBy.toString()
  );
  if (!encryptedToken) {
    throw new DriveServiceError(409, VIDEO_ERRORS.UPLOADER_DISCONNECTED);
  }

  const accessToken = await getDriveAccessToken(
    evidence.uploadedBy.toString(),
    decryptRefreshToken,
    async () => encryptedToken
  );

  const upstream = await getDriveFileMedia(accessToken, evidence.driveFileId, range);
  if (!upstream) {
    throw new DriveServiceError(404, VIDEO_ERRORS.DRIVE_FILE_MISSING);
  }

  return { upstream, mimeType: evidence.mimeType };
};