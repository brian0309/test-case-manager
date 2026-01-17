/**
 * Socket.io Client Service
 * Manages real-time connection for live updates across users
 */

import { io, Socket } from "socket.io-client";
import { TestCase, TestSuite, Project } from "../types/testManager";

// Socket event types matching backend
export interface SocketEvents {
  // Test Case Events
  "testcase:created": { testCase: TestCase; suiteId: string; projectId: string };
  "testcase:updated": { testCase: TestCase; suiteId: string; projectId: string };
  "testcase:deleted": { testCaseId: string; suiteId: string; projectId: string };
  "testcase:reordered": { testCases: TestCase[]; suiteId: string; projectId: string };
  "testcase:bulk-deleted": { testCaseIds: string[]; suiteId: string; projectId: string };
  "testcase:bulk-status-updated": { testCaseIds: string[]; status: string; projectId: string };
  "testcase:cloned": { testCase: TestCase; suiteId: string; projectId: string };
  "testcase:bulk-imported": { testCases: TestCase[]; suiteId: string; projectId: string };

  // Collaborative Editing Events
  "testcase:editing": {
    testCaseId: string;
    suiteId: string;
    projectId: string;
    userId: string;
    userName: string;
    field: string;
    value: string | number | boolean | null;
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
  "testsuite:created": { suite: TestSuite; projectId: string };
  "testsuite:updated": { suite: TestSuite; projectId: string };
  "testsuite:deleted": { suiteId: string; projectId: string };

  // Project Events
  "project:updated": { project: Project };
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

    this.socket = io(socketUrl, {
      withCredentials: true, // Send cookies for authentication
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
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

    this.socket.on("disconnect", (_reason) => {
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (_error) => {
      this.isConnecting = false;
      this.reconnectAttempts++;
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
    }
  }

  /**
   * Leave a test case editing room
   */
  leaveTestCase(testCaseId: string, projectId: string, userId: string): void {
    if (this.socket?.connected && testCaseId) {
      this.socket.emit("leave:testcase", { testCaseId, projectId, userId });
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
    value: string | number | boolean | null;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
