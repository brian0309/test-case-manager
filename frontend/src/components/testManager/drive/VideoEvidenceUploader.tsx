import React, { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  createUploadSession,
  registerVideoEvidence,
  resolveUploadedFile,
  EvidenceScopeParams,
} from "../../../services/googleDriveApi";
import { VideoEvidence } from "../../../types/testManager";
import { validateVideoFile } from "../../../utils/videoEvidence";

interface VideoEvidenceUploaderProps {
  projectId: string;
  scope: EvidenceScopeParams;
  maxSizeMB: number;
  onUploaded: (evidence: VideoEvidence) => void;
}

type UploadStatus =
  | "idle"
  | "preparing"
  | "uploading"
  | "registering"
  | "recovering"
  | "done";

/**
 * How long to wait for Google's final upload response after the browser has
 * sent all bytes before treating the upload as complete (the response can be
 * lost on some CORS redirects) and recovering the file id via the backend.
 */
const RESPONSE_GRACE_MS = 10_000;

const RECOVER_ATTEMPTS = 3;
const RECOVER_RETRY_DELAY_MS = 2_500;

/**
 * Drag-and-drop uploader that streams a video directly to Google Drive.
 * The backend approves the upload (resumable session + scope guard), then the
 * browser PUTs bytes straight to Google (no proxy). Progress is tracked via XHR.
 */
const VideoEvidenceUploader: React.FC<VideoEvidenceUploaderProps> = ({
  projectId,
  scope,
  maxSizeMB,
  onUploaded,
}) => {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<VideoEvidence | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const sessionRef = useRef<{ sessionUri: string; accessToken: string } | null>(null);
  const fileRef = useRef<File | null>(null);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    sessionRef.current = null;
    fileRef.current = null;
    setStatus("idle");
    setProgress(0);
    setError(null);
    setUploaded(null);
    cancelledRef.current = false;
  }, []);

  const performUpload = useCallback(
    async (file: File) => {
      const invalid = validateVideoFile(file, maxSizeMB);
      if (invalid) {
        setError(invalid);
        return;
      }

      setStatus("preparing");
      setProgress(0);
      setError(null);
      setUploaded(null);
      cancelledRef.current = false;

      let session;
      try {
        session = await createUploadSession(projectId, {
          fileName: file.name,
          mimeType: file.type || "video/mp4",
          fileSize: file.size,
          ...scope,
        });
      } catch (err) {
        setStatus("idle");
        setError(err instanceof Error ? err.message : "Failed to prepare upload");
        return;
      }
      sessionRef.current = { ...session };

      setStatus("uploading");

      let driveFileId: string | undefined;
      let uploadError: string | null = null;

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;
          xhr.open("PUT", session.sessionUri);
          xhr.setRequestHeader("Authorization", `Bearer ${session.accessToken}`);
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setProgress(Math.round((e.loaded / e.total) * 100));
          };

          let responseGraceTimer: ReturnType<typeof setTimeout> | null = null;
          let requestDone = false;

          const settle = () => {
            if (requestDone) return;
            requestDone = true;
            if (responseGraceTimer) {
              clearTimeout(responseGraceTimer);
              responseGraceTimer = null;
            }
          };

          xhr.upload.onload = () => {
            responseGraceTimer = setTimeout(() => {
              // Bytes were sent but Google never sent a final response.
              // Treat the upload as complete — recovery will find the id.
              settle();
              resolve();
            }, RESPONSE_GRACE_MS);
          };

          xhr.onload = () => {
            settle();
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const raw = xhr.responseText;
                if (raw) {
                  const parsed = JSON.parse(raw) as Record<string, unknown>;
                  if (typeof parsed?.id === "string") {
                    driveFileId = parsed.id;
                  }
                }
              } catch {
                driveFileId = undefined;
              }
              resolve();
            } else {
              reject(new Error(`Upload failed (HTTP ${xhr.status})`));
            }
          };

          xhr.onerror = () => {
            settle();
            reject(new Error("Upload failed due to a network error"));
          };

          xhr.onabort = () => {
            settle();
            reject(new Error("Upload cancelled"));
          };

          xhr.send(file);
        });
      } catch (err) {
        if (cancelledRef.current) {
          setStatus("idle");
          return;
        }
        uploadError = err instanceof Error ? err.message : "Upload failed";
      }

      if (cancelledRef.current) {
        setStatus("idle");
        return;
      }

      if (!driveFileId) {
        // Google stored the bytes but the browser never received the final
        // response (or it omitted the file id). Locate the file via the backend.
        setStatus("recovering");
        for (let attempt = 0; attempt < RECOVER_ATTEMPTS; attempt++) {
          if (cancelledRef.current) break;
          try {
            const resolved = await resolveUploadedFile(projectId, {
              fileName: file.name,
              mimeType: file.type || "video/mp4",
              fileSize: file.size,
            });
            if (resolved.driveFileId) {
              driveFileId = resolved.driveFileId;
              break;
            }
          } catch {
            // Drive search can lag a moment after upload; retry.
          }
          if (attempt < RECOVER_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, RECOVER_RETRY_DELAY_MS));
          }
        }
      }

      if (cancelledRef.current) {
        setStatus("idle");
        return;
      }

      if (!driveFileId) {
        setStatus("idle");
        setError(
          uploadError ||
            "Upload completed but the file could not be located in Google Drive"
        );
        return;
      }

      try {
        const evidence = await registerVideoEvidence(projectId, {
          driveFileId,
          fileName: file.name,
          mimeType: file.type || "video/mp4",
          fileSize: file.size,
          ...scope,
        });
        setUploaded(evidence);
        setStatus("done");
        toast.success("Video uploaded");
        onUploaded(evidence);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to register the upload");
        setStatus("idle");
      }
    },
    [projectId, scope, maxSizeMB, onUploaded]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const file = files[0];
      if (!file) return;
      fileRef.current = file;
      void performUpload(file);
    },
    [performUpload]
  );

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    xhrRef.current?.abort();
    reset();
    toast("Upload cancelled", { icon: "ℹ️" });
  }, [reset]);

  if (uploaded || status === "done") {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="truncate">
          {uploaded?.fileName ?? "Video uploaded"}
          <button
            type="button"
            onClick={reset}
            className="ml-2 font-medium text-blue-600 hover:text-blue-800"
          >
            Remove
          </button>
        </span>
      </div>
    );
  }

  if (status === "preparing") {
    return <p className="text-xs text-gray-500">Preparing upload…</p>;
  }

  if (status === "registering") {
    return <p className="text-xs text-gray-500">Finalizing upload…</p>;
  }

  if (status === "recovering") {
    return <p className="text-xs text-gray-500">Locating upload in Drive…</p>;
  }

  if (status === "uploading") {
    return (
      <div className="w-full">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="truncate text-gray-600">{fileRef.current?.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{progress}%</span>
            <button
              type="button"
              onClick={cancelUpload}
              className="font-medium text-red-600 hover:text-red-800"
            >
              Cancel
            </button>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-gray-400">Uploading directly to Google Drive…</p>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-md border border-dashed p-3 text-center text-xs transition-colors ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400"
        }`}
      >
        <p className="text-gray-600">
          Drag a video here or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-[10px] text-gray-400">MP4 · WebM · MOV — max {maxSizeMB} MB</p>
      </div>
      {error && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => fileRef.current && performUpload(fileRef.current)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mov,.mp4,.webm"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default VideoEvidenceUploader;
