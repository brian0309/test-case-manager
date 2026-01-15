/**
 * Custom hook for tracking users present in the same project
 * Shows who else is viewing/working on the same project
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { socketService, SocketEvents } from "../services/socket";
import { useAuthStore } from "../store/authStore";

interface ProjectUser {
  id: string;
  name: string;
  avatar?: string;
}

interface UseProjectPresenceOptions {
  /** Project ID to track presence for */
  projectId: string | null;
}

interface UseProjectPresenceReturn {
  /** List of users currently in the project (excluding current user) */
  projectUsers: ProjectUser[];
  /** Whether presence tracking is active */
  isTracking: boolean;
  /** Total count of users (including current user) */
  totalUsers: number;
}

export function useProjectPresence({
  projectId,
}: UseProjectPresenceOptions): UseProjectPresenceReturn {
  const { user } = useAuthStore();
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const previousProjectIdRef = useRef<string | null>(null);

  // Handle initial presence list
  const handlePresence = useCallback(
    (data: SocketEvents["project:presence"]) => {
      if (data.projectId !== projectId) return;

      // Filter out current user from presence list
      const otherUsers = data.users.filter((u) => u.id !== user?._id);
      setProjectUsers(otherUsers);
      console.log("[Presence] Received presence list:", otherUsers.length, "other users");
    },
    [projectId, user?._id]
  );

  // Handle user joined
  const handleUserJoined = useCallback(
    (data: SocketEvents["project:user-joined"]) => {
      if (data.projectId !== projectId) return;
      if (data.user.id === user?._id) return; // Ignore self

      setProjectUsers((prev) => {
        // Don't add duplicates
        if (prev.some((u) => u.id === data.user.id)) {
          return prev;
        }
        console.log("[Presence] User joined:", data.user.name);
        return [...prev, data.user];
      });
    },
    [projectId, user?._id]
  );

  // Handle user left
  const handleUserLeft = useCallback(
    (data: SocketEvents["project:user-left"]) => {
      if (data.projectId !== projectId) return;

      setProjectUsers((prev) => {
        const filtered = prev.filter((u) => u.id !== data.userId);
        if (filtered.length !== prev.length) {
          console.log("[Presence] User left:", data.userId);
        }
        return filtered;
      });
    },
    [projectId]
  );

  useEffect(() => {
    if (!projectId || !user) {
      setProjectUsers([]);
      setIsTracking(false);
      return;
    }

    // Connect socket if needed
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Leave previous project if changed
    if (previousProjectIdRef.current && previousProjectIdRef.current !== projectId) {
      socketService.leaveProject(previousProjectIdRef.current);
      setProjectUsers([]);
    }

    // Join with user info for presence tracking
    socketService.joinProject(projectId, {
      id: user._id,
      name: user.name,
      avatar: undefined, // Could add avatar support later
    });

    previousProjectIdRef.current = projectId;
    setIsTracking(true);

    // Set up event listeners
    socketService.on("project:presence", handlePresence);
    socketService.on("project:user-joined", handleUserJoined);
    socketService.on("project:user-left", handleUserLeft);

    return () => {
      socketService.off("project:presence", handlePresence);
      socketService.off("project:user-joined", handleUserJoined);
      socketService.off("project:user-left", handleUserLeft);
    };
  }, [projectId, user, handlePresence, handleUserJoined, handleUserLeft]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (previousProjectIdRef.current) {
        socketService.leaveProject(previousProjectIdRef.current);
      }
    };
  }, []);

  return {
    projectUsers,
    isTracking,
    totalUsers: projectUsers.length + 1, // Include current user
  };
}
