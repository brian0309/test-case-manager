/**
 * Custom hook for collaborative test case editing
 * Enables real-time field updates between multiple users editing the same test case
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { socketService, SocketEvents } from "../services/socket";
import { useAuthStore } from "../store/authStore";
import { TestCase } from "../types/testManager";

interface CollaboratingUser {
  id: string;
  name: string;
  avatar?: string;
}

interface UseCollaborativeEditingOptions {
  /** The test case being edited */
  testCase: TestCase | null;
  /** Callback to update the local test case state */
  onFieldUpdate: (field: string, value: any) => void;
  /** Debounce delay in ms for emitting field changes (default: 300ms) */
  debounceMs?: number;
}

interface UseCollaborativeEditingReturn {
  /** List of users currently editing this test case */
  collaboratingUsers: CollaboratingUser[];
  /** Emit a field change to other collaborators (debounced) */
  emitFieldChange: (field: string, value: any) => void;
  /** Field currently being edited by another user */
  remoteEditingField: { field: string; userName: string } | null;
  /** Whether collaborative editing is active */
  isCollaborating: boolean;
}

export function useCollaborativeEditing({
  testCase,
  onFieldUpdate,
  debounceMs = 300,
}: UseCollaborativeEditingOptions): UseCollaborativeEditingReturn {
  const { user } = useAuthStore();
  const [collaboratingUsers, setCollaboratingUsers] = useState<CollaboratingUser[]>([]);
  const [remoteEditingField, setRemoteEditingField] = useState<{ field: string; userName: string } | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);

  // Track debounce timers for each field
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Track the last emitted value to avoid duplicate emissions
  const lastEmittedValues = useRef<Map<string, any>>(new Map());
  // Clear remote editing indicator after a delay
  const remoteEditingTimer = useRef<NodeJS.Timeout | null>(null);

  const testCaseId = testCase?.id;
  const projectId = testCase?.projectId;
  const suiteId = testCase?.suiteId;

  // Join the test case editing room when opening
  useEffect(() => {
    if (!testCaseId || !projectId || !user || testCaseId.startsWith("new-")) {
      return;
    }

    // Connect to socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Join the test case editing room
    socketService.joinTestCase(testCaseId, projectId, {
      id: user._id,
      name: user.name,
      avatar: undefined, // Could add avatar support later
    });

    setIsCollaborating(true);

    // Cleanup: leave the room when unmounting
    return () => {
      socketService.leaveTestCase(testCaseId, projectId, user._id);
      setIsCollaborating(false);
      setCollaboratingUsers([]);
      setRemoteEditingField(null);
    };
  }, [testCaseId, projectId, user]);

  // Handle incoming editing events from other users
  useEffect(() => {
    if (!testCaseId || testCaseId.startsWith("new-")) {
      return;
    }

    const handleRemoteEdit = (data: SocketEvents["testcase:editing"]) => {
      // Only process if it's for this test case and not from us
      if (data.testCaseId !== testCaseId || data.userId === user?._id) {
        return;
      }

      console.log("[Collab] Remote edit received:", data.field, "from", data.userName);

      // Update the local state with the remote change
      onFieldUpdate(data.field, data.value);

      // Show indicator of who is editing what field
      setRemoteEditingField({ field: data.field, userName: data.userName });

      // Clear the indicator after 2 seconds
      if (remoteEditingTimer.current) {
        clearTimeout(remoteEditingTimer.current);
      }
      remoteEditingTimer.current = setTimeout(() => {
        setRemoteEditingField(null);
      }, 2000);
    };

    const handleUserJoined = (data: SocketEvents["testcase:user-joined"]) => {
      if (data.testCaseId !== testCaseId || data.user.id === user?._id) {
        return;
      }

      console.log("[Collab] User joined:", data.user.name);
      setCollaboratingUsers((prev) => {
        // Don't add if already in the list
        if (prev.some((u) => u.id === data.user.id)) {
          return prev;
        }
        return [...prev, data.user];
      });
    };

    const handleUserLeft = (data: SocketEvents["testcase:user-left"]) => {
      if (data.testCaseId !== testCaseId) {
        return;
      }

      console.log("[Collab] User left:", data.userId);
      setCollaboratingUsers((prev) => prev.filter((u) => u.id !== data.userId));
    };

    // Subscribe to events
    socketService.on("testcase:editing", handleRemoteEdit);
    socketService.on("testcase:user-joined", handleUserJoined);
    socketService.on("testcase:user-left", handleUserLeft);

    return () => {
      socketService.off("testcase:editing", handleRemoteEdit);
      socketService.off("testcase:user-joined", handleUserJoined);
      socketService.off("testcase:user-left", handleUserLeft);

      if (remoteEditingTimer.current) {
        clearTimeout(remoteEditingTimer.current);
      }
    };
  }, [testCaseId, user?._id, onFieldUpdate]);

  // Debounced emit function for field changes
  const emitFieldChange = useCallback(
    (field: string, value: any) => {
      if (!testCaseId || !projectId || !suiteId || !user || testCaseId.startsWith("new-")) {
        return;
      }

      // Skip if value hasn't changed
      const lastValue = lastEmittedValues.current.get(field);
      if (JSON.stringify(lastValue) === JSON.stringify(value)) {
        return;
      }

      // Clear existing debounce timer for this field
      const existingTimer = debounceTimers.current.get(field);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new debounce timer
      const timer = setTimeout(() => {
        socketService.emitFieldEdit({
          testCaseId,
          suiteId,
          projectId,
          userId: user._id,
          userName: user.name,
          field,
          value,
        });

        lastEmittedValues.current.set(field, value);
        debounceTimers.current.delete(field);
      }, debounceMs);

      debounceTimers.current.set(field, timer);
    },
    [testCaseId, projectId, suiteId, user, debounceMs]
  );

  // Cleanup all debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();
    };
  }, []);

  return {
    collaboratingUsers,
    emitFieldChange,
    remoteEditingField,
    isCollaborating,
  };
}
