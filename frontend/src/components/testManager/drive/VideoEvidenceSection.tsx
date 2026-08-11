import React, { useCallback, useEffect, useState } from "react";
import {
  getDriveConnection,
  listVideoEvidence,
  EvidenceScopeParams,
} from "../../../services/googleDriveApi";
import { DriveConnection, VideoEvidence } from "../../../types/testManager";
import DriveConnectPanel from "./DriveConnectPanel";
import VideoEvidenceUploader from "./VideoEvidenceUploader";
import VideoEvidencePlayer from "./VideoEvidencePlayer";

interface VideoEvidenceSectionProps {
  projectId: string;
  enabled: boolean;
  publicLinks: boolean;
  currentUserId: string;
  scope: EvidenceScopeParams;
  maxSizeMB?: number;
  title?: string;
  readOnly?: boolean;
}

/**
 * Main video-evidence block shown on tickets / run items.
 * - Hidden entirely when the project has video evidence disabled.
 * - Prompts the user to connect Google Drive when needed.
 * - Lists existing evidence, allows upload and playback.
 * - readOnly hides upload controls but keeps playback of existing evidence.
 */
const VideoEvidenceSection: React.FC<VideoEvidenceSectionProps> = ({
  projectId,
  enabled,
  publicLinks,
  currentUserId,
  scope,
  maxSizeMB = 1024,
  title = "Video Evidence",
  readOnly = false,
}) => {
  const [connection, setConnection] = useState<DriveConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [evidences, setEvidences] = useState<VideoEvidence[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const [conn, list] = await Promise.all([
        getDriveConnection(),
        listVideoEvidence(projectId, scope),
      ]);
      setConnection(conn);
      setEvidences(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video evidence");
    } finally {
      setLoading(false);
    }
  }, [projectId, scope]);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    void reload();
  }, [enabled, reload]);

  if (!enabled) return null;

  const handleUploaded = (evidence: VideoEvidence) => {
    setEvidences((prev) => [...prev, evidence]);
  };

  const handleDeleted = (evidenceId: string) => {
    setEvidences((prev) => prev.filter((e) => e.id !== evidenceId));
  };

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>

      {loading && <p className="text-xs text-gray-400">Loading…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {!loading && !error && connection && evidences.length === 0 && !readOnly && !connection.connected && (
        <DriveConnectPanel compact />
      )}

      {!loading && !error && evidences.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {evidences.map((evidence) => (
            <VideoEvidencePlayer
              key={evidence.id}
              projectId={projectId}
              evidence={evidence}
              publicLinks={publicLinks}
              currentUserId={currentUserId}
              onDeleted={readOnly ? undefined : handleDeleted}
            />
          ))}
        </div>
      )}

      {!loading && !error && !readOnly && connection?.connected && (
        <VideoEvidenceUploader
          projectId={projectId}
          scope={scope}
          maxSizeMB={maxSizeMB}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
};

export default VideoEvidenceSection;