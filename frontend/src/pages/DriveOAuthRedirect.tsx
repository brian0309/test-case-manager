import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";

/**
 * Landing page after the Google Drive OAuth callback.
 * The backend redirects here with ?success=true after saving the connection.
 */
const DriveOAuthRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    if (success === "true") {
      toast.success("Google Drive connected");
      navigate("/test-manager/projects", { replace: true });
    } else {
      toast.error(
        error ? `Drive connection failed: ${error}` : "Drive connection failed"
      );
      navigate("/test-manager/projects", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Connecting Google Drive...</h2>
        <p className="text-gray-600">Please wait while we finalize your connection.</p>
      </div>
    </div>
  );
};

export default DriveOAuthRedirect;