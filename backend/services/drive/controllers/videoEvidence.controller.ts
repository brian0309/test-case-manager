import { Request, Response } from "express";
import { Readable } from "stream";
import {
  createUploadSession,
  deleteVideoEvidence,
  getEvidenceStream,
  listVideoEvidence,
  registerVideoEvidence,
  resolveUploadedFileId,
} from "../services/videoEvidence.service.js";
import { DriveServiceError } from "../types/drive.types.js";

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof DriveServiceError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  console.error("Video evidence error:", error);
  res.status(500).json({ success: false, message: "Internal server error" });
};

const param = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : String(value || "");

/**
 * POST /api/projects/:projectId/video-evidence/upload-session
 */
export const createUploadSessionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = param(req.params.projectId);
    const session = await createUploadSession(projectId, req.userId as string, {
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      fileSize: req.body?.fileSize,
      ticketId: req.body?.ticketId,
      testRunId: req.body?.testRunId,
      testRunItemId: req.body?.testRunItemId,
    });
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * POST /api/projects/:projectId/video-evidence
 */
export const registerVideoEvidenceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = param(req.params.projectId);
    const evidence = await registerVideoEvidence(projectId, req.userId as string, {
      driveFileId: req.body?.driveFileId,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      fileSize: req.body?.fileSize,
      ticketId: req.body?.ticketId,
      testRunId: req.body?.testRunId,
      testRunItemId: req.body?.testRunItemId,
    });
    res.status(201).json({ success: true, data: evidence });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * POST /api/projects/:projectId/video-evidence/resolve-upload
 * Re-locates a file the browser already pushed to Drive when Google's final
 * response was lost (upload succeeded, UI stalled at 100%).
 */
export const resolveUploadedFileHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = param(req.params.projectId);
    const result = await resolveUploadedFileId(projectId, req.userId as string, {
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      fileSize: req.body?.fileSize,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * GET /api/projects/:projectId/video-evidence?ticketId=&testRunId=&testRunItemId=
 */
export const listVideoEvidenceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = param(req.params.projectId);
    const rows = await listVideoEvidence(projectId, req.userId as string, {
      ticketId: req.query.ticketId as string | undefined,
      testRunId: req.query.testRunId as string | undefined,
      testRunItemId: req.query.testRunItemId as string | undefined,
    });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * DELETE /api/projects/:projectId/video-evidence/:evidenceId
 */
export const deleteVideoEvidenceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = param(req.params.projectId);
    await deleteVideoEvidence(
      projectId,
      req.userId as string,
      param(req.params.evidenceId)
    );
    res.status(200).json({ success: true, message: "Video evidence deleted" });
  } catch (error) {
    handleError(res, error);
  }
};

const STREAM_FORWARD_HEADERS = [
  "accept-ranges",
  "content-range",
  "content-length",
  "content-type",
  "cache-control",
  "expires",
  "last-modified",
  "etag",
] as const;

/**
 * GET /api/projects/:projectId/video-evidence/:evidenceId/stream
 * Proxies the video bytes from the uploader's Drive with Range support.
 */
export const streamVideoEvidenceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = param(req.params.projectId);
    const range = req.headers.range as string | undefined;

    const { upstream, mimeType } = await getEvidenceStream(
      projectId,
      req.userId as string,
      param(req.params.evidenceId),
      range
    );

    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || mimeType);

    for (const header of STREAM_FORWARD_HEADERS) {
      const value = upstream.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    }

    const body = upstream.body;
    if (!body) {
      res.end();
      return;
    }

    res.on("close", () => {
      if (!res.writableEnded) {
        res.destroy();
      }
    });

    const downStream = Readable.fromWeb(body as never);
    downStream.on("error", () => {
      if (!res.writableEnded) {
        res.destroy();
      }
    });
    downStream.pipe(res);
  } catch (error) {
    handleError(res, error);
  }
};