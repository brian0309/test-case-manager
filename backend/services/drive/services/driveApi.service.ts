import {
  DRIVE_APP_PROPERTY,
  DRIVE_FOLDER_MIME_TYPE,
  DriveFileMetadata,
} from "../types/drive.types.js";

const DRIVE_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

export const authHeaders = (accessToken: string): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
});

/** Parses an error response body from the Drive API into a readable message. */
const driveError = async (res: Response, fallback: string): Promise<Error> => {
  let detail = "";
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    detail = body?.error?.message || detail;
  } catch {
    // ignore parse failures
  }
  return new Error(detail || `${fallback} (${res.status})`);
};

/**
 * Fields requested from the file resource in upload responses. Including
 * `fields` in the session-initiation request makes Google return the created
 * file metadata (including the file id) in the browser's final upload response;
 * without it the completion response body is empty.
 */
const UPLOAD_FIELDS = "id,name,mimeType,size,webViewLink,appProperties";

/**
 * Creates a resumable upload session for a new file and returns the session URI.
 * The browser uploads the file bytes directly to this URI.
 */
export const createResumableUploadSession = async (
  accessToken: string,
  file: { name: string; mimeType: string; parents?: string[] }
): Promise<string> => {
  const res = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=resumable&fields=${UPLOAD_FIELDS}`,
    {
      method: "POST",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
        "X-Upload-Content-Type": file.mimeType,
      },
      body: JSON.stringify({
        name: file.name,
        mimeType: file.mimeType,
        parents: file.parents,
        appProperties: DRIVE_APP_PROPERTY,
        description: "Uploaded via Test Case Manager video evidence",
      }),
    }
  );

  const sessionUri = res.headers.get("location");
  if (!res.ok || !sessionUri) {
    throw await driveError(res, "Failed to create upload session");
  }

  return sessionUri;
};

const FILE_FIELDS =
  "id,name,mimeType,size,webViewLink,appProperties,owners(me),createdTime";

export const getDriveFileMetadata = async (
  accessToken: string,
  fileId: string
): Promise<DriveFileMetadata> => {
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?fields=${FILE_FIELDS}`,
    { headers: authHeaders(accessToken) }
  );

  if (!res.ok) {
    throw await driveError(res, "Failed to read video from Google Drive");
  }

  return (await res.json()) as DriveFileMetadata;
};

/**
 * Streams the raw file media from Drive. Returns the upstream fetch Response
 * so the caller can pipe it through Express, forwarding Range requests.
 * Returns null when the file is missing or inaccessible.
 */
export const getDriveFileMedia = async (
  accessToken: string,
  fileId: string,
  range?: string
): Promise<Response | null> => {
  const headers: Record<string, string> = authHeaders(accessToken);
  if (range) {
    headers["Range"] = range;
  }

  const params = new URLSearchParams({ alt: "media" });
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    { headers }
  );

  if (res.status === 404 || res.status === 403) {
    return null;
  }
  if (!res.ok) {
    throw await driveError(res, "Failed to stream video from Google Drive");
  }

  return res;
};

export const deleteDriveFile = async (
  accessToken: string,
  fileId: string
): Promise<void> => {
  const res = await fetch(`${DRIVE_BASE}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  if (!res.ok && res.status !== 404) {
    throw await driveError(res, "Failed to delete video from Google Drive");
  }
};

/**
 * Queries Drive for the most recent non-trashed files in a folder that match
 * the given name and mime type. Used after a direct browser upload when the
 * final Google response was lost: the app locates the file it just created.
 */
export const listRecentProjectFiles = async (
  accessToken: string,
  folderId: string,
  name: string,
  mimeType: string
): Promise<DriveFileMetadata[]> => {
  const escaped = name.replace(/'/g, "\\'");
  const conditions = [
    `name='${escaped}'`,
    `'${folderId}' in parents`,
    `mimeType='${mimeType}'`,
    "trashed=false",
  ];

  const params = new URLSearchParams({
    q: conditions.join(" and "),
    fields: `files(${FILE_FIELDS})`,
    orderBy: "createdTime desc",
    pageSize: "10",
  });

  const res = await fetch(`${DRIVE_BASE}/files?${params.toString()}`, {
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw await driveError(res, "Failed to query Drive for the uploaded file");
  }

  const data = (await res.json()) as { files?: DriveFileMetadata[] };
  return data.files || [];
};

export interface DrivePermissionInput {
  role: "reader";
  type: "anyone";
  allowFileDiscovery?: boolean;
}

export const createDrivePermission = async (
  accessToken: string,
  fileId: string,
  permission: DrivePermissionInput
): Promise<void> => {
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/permissions`,
    {
      method: "POST",
      headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
      body: JSON.stringify({
        role: permission.role,
        type: permission.type,
        allowFileDiscovery: permission.allowFileDiscovery || false,
      }),
    }
  );

  if (!res.ok) {
    throw await driveError(res, "Failed to update video sharing permissions");
  }
};

/** Queries Drive for a folder with the given name under the given parent. */
const findFolderByName = async (
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string | null> => {
  const escaped = name.replace(/'/g, "\\'");
  const conditions = [
    `name='${escaped}'`,
    `mimeType='${DRIVE_FOLDER_MIME_TYPE}'`,
    "trashed=false",
  ];
  if (parentId) {
    conditions.push(`'${parentId}' in parents`);
  }

  const params = new URLSearchParams({
    q: conditions.join(" and "),
    fields: "files(id,name)",
    pageSize: "10",
  });

  const res = await fetch(`${DRIVE_BASE}/files?${params.toString()}`, {
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw await driveError(res, "Failed to query Drive folders");
  }

  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files && data.files.length > 0 ? data.files[0].id : null;
};

const createFolder = async (
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> => {
  const res = await fetch(`${DRIVE_BASE}/files`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      ...(parentId ? { parents: [parentId] } : {}),
      appProperties: DRIVE_APP_PROPERTY,
    }),
  });

  if (!res.ok) {
    throw await driveError(res, "Failed to create Drive folder");
  }

  const data = (await res.json()) as { id: string };
  return data.id;
};

/**
 * Ensures the top-level "Test Case Manager" folder exists for the user.
 * Cached folder id is passed back by callers.
 */
export const ensureRootFolder = async (
  accessToken: string,
  cachedId?: string
): Promise<string> => {
  if (cachedId) {
    return cachedId;
  }
  const name = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || "Test Case Manager";
  const existing = await findFolderByName(accessToken, name);
  if (existing) {
    return existing;
  }
  return createFolder(accessToken, name);
};

/**
 * Ensures the per-project folder exists under the root folder.
 */
export const ensureProjectFolder = async (
  accessToken: string,
  rootFolderId: string,
  projectName: string
): Promise<string> => {
  const existing = await findFolderByName(accessToken, projectName, rootFolderId);
  if (existing) {
    return existing;
  }
  return createFolder(accessToken, projectName, rootFolderId);
};