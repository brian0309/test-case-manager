/**
 * Custom hook for collaborative ticket editing
 * Enables real-time field updates between multiple users viewing the same ticket
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { socketService, SocketEvents } from "../services/socket";
import { useAuthStore } from "../store/authStore";
import { Ticket } from "../types/testManager";

interface CollaboratingUser {
  id: string;
  name: string;
  avatar?: string;
}

// Define a union type for field values
type FieldValue = string | number | boolean | null;

interface UseTicketCollaborativeEditingOptions {
  /** The ticket being viewed/edited */
  ticket: Ticket | null;
  /** Callback to update the local ticket state (live preview of remote edits) */
  onFieldUpdate: (field: string, value: FieldValue) => void;
  /** Debounce delay in ms for emitting field changes (default: 300ms) */
  debounceMs?: number;
}

interface UseTicketCollaborativeEditingReturn {
  /** List of users currently viewing this ticket */
  collaboratingUsers: CollaboratingUser[];
  /** Emit a field change to other collaborators (debounced) */
  emitFieldChange: (field: string, value: FieldValue) => void;
  /** Field currently being edited by another user */
  remoteEditingField: { field: string; userName: string } | null;
  /** Whether collaborative editing is active */
  isCollaborating: boolean;
}

export function useTicketCollaborativeEditing({
  ticket,
  onFieldUpdate,
  debounceMs = 300,
}: UseTicketCollaborativeEditingOptions): UseTicketCollaborativeEditingReturn {
  const { user } = useAuthStore();
  const [collaboratingUsers, setCollaboratingUsers] = useState<CollaboratingUser[]>([]);
  const [remoteEditingField, setRemoteEditingField] = useState<{ field: string; userName: string } | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);

  // Track debounce timers for each field
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Track the last emitted value to avoid duplicate emissions
  const lastEmittedValues = useRef<Map<string, FieldValue>>(new Map());
  // Clear remote editing indicator after a delay
  const remoteEditingTimer = useRef<NodeJS.Timeout | null>(null);

  const ticketId = ticket?.id;
  const projectId = ticket?.projectId;

  // Join the ticket editing room when opening
  useEffect(() => {
    if (!ticketId || !projectId || !user || ticketId.startsWith("new-")) {
      return;
    }

    // Connect to socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Join the ticket editing room
    socketService.joinTicket(ticketId, projectId, {
      id: user._id,
      name: user.name,
      avatar: user.profilePicture ?? undefined,
    });

    setIsCollaborating(true);

    // Cleanup: leave the room when unmounting
    return () => {
      socketService.leaveTicket(ticketId, projectId, user._id);
      setIsCollaborating(false);
      setCollaboratingUsers([]);
      setRemoteEditingField(null);
    };
  }, [ticketId, projectId, user]);

  // Handle incoming editing events from other users
  useEffect(() => {
    if (!ticketId || ticketId.startsWith("new-")) {
      return;
    }

    const handleRemoteEdit = (data: SocketEvents["ticket:editing"]) => {
      // Only process if it's for this ticket; server excludes the sender socket (socketManager)
      if (data.ticketId !== ticketId) {
        return;
      }

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

    const handleUserJoined = (data: SocketEvents["ticket:user-joined"]) => {
      if (data.ticketId !== ticketId || data.user.id === user?._id) {
        return;
      }

      setCollaboratingUsers((prev) => {
        // Don't add if already in the list
        if (prev.some((u) => u.id === data.user.id)) {
          return prev;
        }
        return [...prev, data.user];
      });
    };

    const handleUserLeft = (data: SocketEvents["ticket:user-left"]) => {
      if (data.ticketId !== ticketId) {
        return;
      }

      setCollaboratingUsers((prev) => prev.filter((u) => u.id !== data.userId));
    };

    const handlePresence = (data: SocketEvents["ticket:presence"]) => {
      if (data.ticketId !== ticketId) {
        return;
      }

      // The server sends all users in the room, including this client
      setCollaboratingUsers(
        data.users.filter((u) => u.id !== user?._id)
      );
    };

    // Subscribe to events
    socketService.on("ticket:editing", handleRemoteEdit);
    socketService.on("ticket:user-joined", handleUserJoined);
    socketService.on("ticket:user-left", handleUserLeft);
    socketService.on("ticket:presence", handlePresence);

    return () => {
      socketService.off("ticket:editing", handleRemoteEdit);
      socketService.off("ticket:user-joined", handleUserJoined);
      socketService.off("ticket:user-left", handleUserLeft);
      socketService.off("ticket:presence", handlePresence);

      if (remoteEditingTimer.current) {
        clearTimeout(remoteEditingTimer.current);
      }
    };
  }, [ticketId, user?._id, onFieldUpdate]);

  // Debounced emit function for field changes
  const emitFieldChange = useCallback(
    (field: string, value: FieldValue) => {
      if (!ticketId || !projectId || !user || ticketId.startsWith("new-")) {
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
        socketService.emitTicketFieldEdit({
          ticketId,
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
    [ticketId, projectId, user, debounceMs]
  );

  // Cleanup all debounce timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return {
    collaboratingUsers,
    emitFieldChange,
    remoteEditingField,
    isCollaborating,
  };
}
