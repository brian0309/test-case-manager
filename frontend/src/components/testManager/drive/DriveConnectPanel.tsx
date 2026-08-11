import React, { useState } from "react";
import toast from "react-hot-toast";
import { getDriveAuthUrl } from "../../../services/googleDriveApi";

interface DriveConnectPanelProps {
  compact?: boolean;
}

/**
 * Panel shown when a project has video evidence enabled but the current user
 * has not connected Google Drive yet. Initiates the Drive OAuth flow.
 */
const DriveConnectPanel: React.FC<DriveConnectPanelProps> = ({ compact }) => {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await getDriveAuthUrl();
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start Google Drive connection");
      setConnecting(false);
    }
  };

  return (
    <div className={`rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-center ${compact ? "" : "py-8"}`}>
      <svg
        className="mx-auto mb-2 h-8 w-8 text-gray-400"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 1.608 20.39 15H15.6L12 9.216 8.4 15H3.61L12 1.608Zm7.2 17.784a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Zm-14.4 0a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Zm3.6-2.4h7.2l-3.6 6.192L8.4 16.992Z" />
      </svg>
      {!compact && <p className="mb-1 text-sm font-medium text-gray-700">Video evidence uses Google Drive</p>}
      <p className="mb-3 text-xs text-gray-500">
        Connect your Google account so captured videos can be stored privately in your own Drive.
      </p>
      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {connecting ? "Redirecting…" : "Connect Google Drive"}
      </button>
    </div>
  );
};

export default DriveConnectPanel;