/**
 * Socket.io Client Service
 * Manages real-time connection for live updates across users
 */

import { io, Socket } from "socket.io-client";

// Socket event types matching backend
export interface SocketEvents {
  // Test Case Events
  "testcase:created": { testCase: any; suiteId: string; projectId: string };
  "testcase:updated": { testCase: any; suiteId: string; projectId: string };
  "testcase:deleted": { testCaseId: string; suiteId: string; projectId: string };
  "testcase:reordered": { testCases: any[]; suiteId: string; projectId: string };
  "testcase:bulk-deleted": { testCaseIds: string[]; suiteId: string; projectId: string };
  "testcase:bulk-status-updated": { testCaseIds: string[]; status: string; projectId: string };
  "testcase:cloned": { testCase: any; suiteId: string; projectId: string };
  "testcase:bulk-imported": { testCases: any[]; suiteId: string; projectId: string };

  // Collaborative Editing Events
  "testcase:editing": {
    testCaseId: string;
    suiteId: string;
    projectId: string;
    userId: string;
    userName: string;
    field: string;
    value: any;
  };
  "testcase:user-joined": {
    testCaseId: string;
    projectId: string;
    user: { id: string; name: string; avatar?: string };
  };
  "testcase:user-left": {
    testCaseId: string;
    projectId: string;
    userId: string;
  };

  // Test Suite Events
  "testsuite:created": { suite: any; projectId: string };
  "testsuite:updated": { suite: any; projectId: string };
  "testsuite:deleted": { suiteId: string; projectId: string };

  // Project Events
  "project:updated": { project: any };
  "project:deleted": { projectId: string };
  
  // Project Presence Events
  "project:user-joined": {
    projectId: string;
    user: { id: string; name: string; avatar?: string };
  };
  "project:user-left": {
    projectId: string;
    userId: string;
  };
  "project:presence": {
    projectId: string;
    users: Array<{ id: string; name: string; avatar?: string }>;
  };
}

type EventCallback<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentProjectId: string | null = null;
  private currentSuiteId: string | null = null;

  /**
   * Get socket URL based on environment
   * WebSocket connects to the same origin as the API in most cases
   */
  private getSocketUrl(): string {
    // In development, connect to the backend server directly
    if (import.meta.env.MODE === "development") {
      const devUrl = import.meta.env.VITE_DEV_API_URL || "";
      // Extract base URL (remove /api suffix)
      const baseUrl = devUrl.replace(/\/api$/, "");
      return baseUrl || "http://localhost:5000";
    }

    // In production, use the API URL or same origin
    const apiUrl = import.meta.env.VITE_API_URL || "";
    if (apiUrl) {
      // Extract base URL (remove /api suffix)
      return apiUrl.replace(/\/api$/, "");
    }

    // Same origin - let socket.io auto-detect
    return "";
  }

  /**
   * Connect to the socket server
   */
  connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const socketUrl = this.getSocketUrl();

    console.log("[Socket] Connecting to:", socketUrl || "same-origin");

    this.socket = io(socketUrl, {
      withCredentials: true, // Send cookies for authentication
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      console.log("[Socket] Connected:", this.socket?.id);
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Rejoin rooms if we had them before reconnect
      if (this.currentProjectId) {
        this.joinProject(this.currentProjectId);
      }
      if (this.currentSuiteId) {
        this.joinSuite(this.currentSuiteId);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
      this.isConnecting = false;
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn("[Socket] Max reconnection attempts reached");
      }
    });
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentProjectId = null;
      this.currentSuiteId = null;
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Join a project room to receive updates for that project
   */
  joinProject(projectId: string, user?: { id: string; name: string; avatar?: string }): void {
    if (this.socket?.connected && projectId) {
      // Leave previous project room if different
      if (this.currentProjectId && this.currentProjectId !== projectId) {
        this.leaveProject(this.currentProjectId);
      }

      this.socket.emit("join:project", { projectId, user });
      this.currentProjectId = projectId;
      console.log("[Socket] Joined project:", projectId, user ? `as ${user.name}` : "");
    }
  }

  /**
   * Leave a project room
   */
  leaveProject(projectId: string): void {
    if (this.socket?.connected && projectId) {
      this.socket.emit("leave:project", projectId);
      if (this.currentProjectId === projectId) {
        this.currentProjectId = null;
      }
      console.log("[Socket] Left project:", projectId);
    }
  }

  /**
   * Join a suite room to receive updates for that suite
   */
  joinSuite(suiteId: string): void {
    if (this.socket?.connected && suiteId) {
      // Leave previous suite room if different
      if (this.currentSuiteId && this.currentSuiteId !== suiteId) {
        this.leaveSuite(this.currentSuiteId);
      }

      this.socket.emit("join:suite", suiteId);
      this.currentSuiteId = suiteId;
      console.log("[Socket] Joined suite:", suiteId);
    }
  }

  /**
   * Leave a suite room
   */
  leaveSuite(suiteId: string): void {
    if (this.socket?.connected && suiteId) {
      this.socket.emit("leave:suite", suiteId);
      if (this.currentSuiteId === suiteId) {
        this.currentSuiteId = null;
      }
      console.log("[Socket] Left suite:", suiteId);
    }
  }

  // =========================================================================
  // COLLABORATIVE EDITING - Test Case Room
  // =========================================================================

  /**
   * Join a test case editing room for collaborative editing
   */
  joinTestCase(
    testCaseId: string,
    projectId: string,
    user: { id: string; name: string; avatar?: string }
  ): void {
    if (this.socket?.connected && testCaseId) {
      this.socket.emit("join:testcase", { testCaseId, projectId, user });
      console.log("[Socket] Joined testcase for editing:", testCaseId);
    }
  }

  /**
   * Leave a test case editing room
   */
  leaveTestCase(testCaseId: string, projectId: string, userId: string): void {
    if (this.socket?.connected && testCaseId) {
      this.socket.emit("leave:testcase", { testCaseId, projectId, userId });
      console.log("[Socket] Left testcase:", testCaseId);
    }
  }

  /**
   * Emit a field edit for collaborative editing
   * This broadcasts the change to other users editing the same test case
   */
  emitFieldEdit(data: {
    testCaseId: string;
    suiteId: string;
    projectId: string;
    userId: string;
    userName: string;
    field: string;
    value: any;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit("testcase:editing", data);
    }
  }

  /**
   * Subscribe to a socket event
   */
  on<K extends keyof SocketEvents>(
    event: K,
    callback: EventCallback<SocketEvents[K]>
  ): void {
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  /**
   * Unsubscribe from a socket event
   */
  off<K extends keyof SocketEvents>(
    event: K,
    callback?: EventCallback<SocketEvents[K]>
  ): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as any);
      } else {
        this.socket.off(event);
      }
    }
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Get current suite ID
   */
  getCurrentSuiteId(): string | null {
    return this.currentSuiteId;
  }
}

// Export singleton instance
export const socketService = new SocketService();
