/**
 * Custom hook for real-time ticket updates
 * Manages socket subscriptions and store updates
 */

import { useEffect, useRef } from "react";
import { socketService, SocketEvents } from "../services/socket";
import { useTestManagerStore } from "../store/testManagerStore";

interface UseRealtimeTicketsOptions {
  /** Project ID to subscribe to */
  projectId: string | null;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
}

/**
 * Hook to subscribe to real-time ticket updates
 * Automatically updates the Zustand store when events are received
 */
export function useRealtimeTickets({
  projectId,
  autoConnect = true,
}: UseRealtimeTicketsOptions) {
  const {
    applyRemoteTicketCreate,
    applyRemoteTicketUpdate,
    removeTicketLocal,
    setTicketsTotal,
  } = useTestManagerStore();

  // Track if we've set up listeners to prevent duplicates
  const listenersSetup = useRef(false);

  // Handler for ticket created
  const handleTicketCreated = useRef((data: SocketEvents["ticket:created"]) => {
    applyRemoteTicketCreate(data.ticket);
  });

  // Handler for ticket updated
  const handleTicketUpdated = useRef((data: SocketEvents["ticket:updated"]) => {
    applyRemoteTicketUpdate(data.ticket);
  });

  // Handler for ticket deleted
  const handleTicketDeleted = useRef((data: SocketEvents["ticket:deleted"]) => {
    removeTicketLocal(data.ticketId);
  });

  // Connect to socket and set up listeners
  useEffect(() => {
    if (!autoConnect) return;

    // Connect to socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Set up event listeners (only once)
    if (!listenersSetup.current) {
      socketService.on("ticket:created", handleTicketCreated.current);
      socketService.on("ticket:updated", handleTicketUpdated.current);
      socketService.on("ticket:deleted", handleTicketDeleted.current);
      listenersSetup.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (listenersSetup.current) {
        socketService.off("ticket:created");
        socketService.off("ticket:updated");
        socketService.off("ticket:deleted");
        listenersSetup.current = false;
      }
    };
  }, [autoConnect]);

  // Join/leave project room when projectId changes
  useEffect(() => {
    if (projectId) {
      socketService.joinProject(projectId);
    }

    return () => {
      if (projectId) {
        socketService.leaveProject(projectId);
      }
    };
  }, [projectId]);

  // Reset the total counter when the project changes so the count
  // reflects the paginated fetch rather than stale realtime deltas
  useEffect(() => {
    setTicketsTotal(0);
  }, [projectId, setTicketsTotal]);

  return {
    isConnected: socketService.isConnected(),
    connect: () => socketService.connect(),
    disconnect: () => socketService.disconnect(),
  };
}
