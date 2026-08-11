import React, { useState } from "react";
import toast from "react-hot-toast";
import { deleteVideoEvidence, getEvidenceStreamUrl } from "../../../services/googleDriveApi";
import { VideoEvidence } from "../../../types/testManager";
import { formatFileSize } from "../../../utils/videoEvidence";

interface VideoEvidencePlayerProps {
  projectId: string;
  evidence: VideoEvidence;
  publicLinks: boolean;
  currentUserId: string;
  onDeleted?: (evidenceId: string) => void;
}

const timeAgo = (iso: string): string => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * Playback widget for a single evidence video. Always streams through the
 * authenticated backend proxy (Range requests, no public link needed). The
 * Drive link is shown only when the file is publicly shared or the viewer is
 * the uploader — Drive's /view page blocks iframe embedding (X-Frame-Options),
 * so playback never uses webViewLink directly.
 */
const VideoEvidencePlayer: React.FC<VideoEvidencePlayerProps> = ({
  projectId,
  evidence,
  publicLinks,
  currentUserId,
  onDeleted,
}) => {
  const [unavailable, setUnavailable] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = currentUserId === evidence.uploadedBy?.id;
  const canOpenOnDrive = Boolean(publicLinks || canDelete);

  const streamUrl = getEvidenceStreamUrl(projectId, evidence.id);

  const handleDelete = async () => {
    if (!window.confirm("Delete this video evidence? This also removes the file from Google Drive.")) return;
    setDeleting(true);
    try {
      await deleteVideoEvidence(projectId, evidence.id);
      toast.success("Video evidence deleted");
      onDeleted?.(evidence.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete evidence");
      setDeleting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-md border border-gray-200">
      <div className="aspect-video bg-black">
        <video
          className="h-full w-full"
          controls
          preload="metadata"
          src={streamUrl}
          onError={() => setUnavailable(true)}
        >
          <track kind="captions" />
        </video>
      </div>

      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-800">{evidence.fileName}</p>
          <p className="text-[10px] text-gray-500">
            {formatFileSize(evidence.fileSize)} · {timeAgo(evidence.createdAt)} · uploaded by{" "}
            {evidence.uploadedBy?.name ?? "Unknown"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canOpenOnDrive && evidence.webViewLink && (
            <a
              href={evidence.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
            >
              Drive
            </a>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-[11px] font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>

      {unavailable && (
        <div className="border-t border-gray-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
          This video is unavailable. The file may have been removed from the uploader's Google Drive.
        </div>
      )}
    </div>
  );
};

export default VideoEvidencePlayer;