/**
 * Socket.io Client Service
 * Manages real-time connection for live updates across users
 */

import { io, Socket } from "socket.io-client";
import { TestCase, TestSuite, Project, ProjectSettings, TestRun, RunItemStatus, ResultsSummary, Ticket } from "../types/testManager";

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
  "testcase:presence": {
    testCaseId: string;
    projectId: string;
    users: Array<{ id: string; name: string; avatar?: string }>;
  };

  // Test Suite Events
  "testsuite:created": { suite: TestSuite; projectId: string };
  "testsuite:updated": { suite: TestSuite; projectId: string };
  "testsuite:deleted": { suiteId: string; projectId: string };

  // Ticket Events
  "ticket:created": { ticket: Ticket; projectId: string };
  "ticket:updated": { ticket: Ticket; projectId: string };
  "ticket:deleted": { ticketId: string; projectId: string };

  // Collaborative Editing Events
  "ticket:editing": {
    ticketId: string;
    projectId: string;
    userId: string;
    userName: string;
    field: string;
    value: string | number | boolean | null;
  };
  "ticket:user-joined": {
    ticketId: string;
    projectId: string;
    user: { id: string; name: string; avatar?: string };
  };
  "ticket:user-left": {
    ticketId: string;
    projectId: string;
    userId: string;
  };
  "ticket:presence": {
    ticketId: string;
    projectId: string;
    users: Array<{ id: string; name: string; avatar?: string }>;
  };

  // Test Run Events
  "testrun:created": { testRun: TestRun; projectId: string };
  "testrun:updated": { testRun: TestRun; projectId: string };
  "testrun:deleted": { testRunId: string; projectId: string };
  "testrun:item-updated": { 
    testRunId: string; 
    itemId: string; 
    status: RunItemStatus; 
    actualResult?: string;
    resultsSummary: ResultsSummary;
    projectId: string;
  };

  // Project Events
  "project:updated": { project: Project; projectId: string };
  "project:settings-updated": { settings: ProjectSettings; projectId: string };
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

  // Discussion Events
  "discussion:created": {
    message: {
      id: string;
      testCaseId?: string;
      ticketId?: string;
      projectId: string;
      user: { id: string; name: string; avatar: string };
      type: "comment" | "system";
      body: string;
      bodyFormat: "plain" | "html";
      fixState?: "fixed" | "not-fixed";
      relatedRunId?: string;
      relatedRunItemId?: string;
      attachments: Array<{ url: string; filename: string; fileSize: number; contentType: string }>;
      createdAt: string;
      updatedAt: string;
    };
    testCaseId?: string;
    ticketId?: string;
    projectId: string;
  };
  "discussion:updated": {
    message: {
      id: string;
      testCaseId?: string;
      ticketId?: string;
      projectId: string;
      user: { id: string; name: string; avatar: string };
      type: "comment" | "system";
      body: string;
      bodyFormat: "plain" | "html";
      fixState?: "fixed" | "not-fixed";
      relatedRunId?: string;
      relatedRunItemId?: string;
      attachments: Array<{ url: string; filename: string; fileSize: number; contentType: string }>;
      createdAt: string;
      updatedAt: string;
    };
    testCaseId?: string;
    ticketId?: string;
    projectId: string;
  };
  "discussion:deleted": {
    messageId: string;
    testCaseId?: string;
    ticketId?: string;
    projectId: string;
  };
}

type EventCallback<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private joinedProjects = new Set<string>();
  private joinedSuites = new Set<string>();
  private joinedTestCases = new Map<string, { projectId: string; user: { id: string; name: string; avatar?: string } }>();
  private joinedTickets = new Map<string, { projectId: string; user: { id: string; name: string; avatar?: string } }>();
  private currentProjectId: string | null = null;
  private currentSuiteId: string | null = null;
  // Store user info so we can resend it on reconnect
  private currentUser: { id: string; name: string; avatar?: string } | null = null;
  // Buffer event listeners registered before the socket is created
  // so they aren't silently lost
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pendingListeners: Array<{ event: string; callback: (...args: any[]) => void }> = [];

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

    // Flush any event listeners that were registered before connect()
    for (const { event, callback } of this.pendingListeners) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on(event, callback as any);
    }
    this.pendingListeners = [];

    this.socket.on("connect", () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Rejoin tracked rooms after reconnect so live updates continue seamlessly.
      this.joinedProjects.forEach((projectId) => {
        this.socket?.emit("join:project", { projectId, user: this.currentUser });
      });

      this.joinedSuites.forEach((suiteId) => {
        this.socket?.emit("join:suite", suiteId);
      });

      this.joinedTestCases.forEach(({ projectId, user }, testCaseId) => {
        this.socket?.emit("join:testcase", { testCaseId, projectId, user });
      });

      this.joinedTickets.forEach(({ projectId, user }, ticketId) => {
        this.socket?.emit("join:ticket", { ticketId, projectId, user });
      });
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
      this.joinedProjects.clear();
      this.joinedSuites.clear();
      this.joinedTestCases.clear();
      this.joinedTickets.clear();
      this.currentProjectId = null;
      this.currentSuiteId = null;
      this.currentUser = null;
      this.pendingListeners = [];
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
    if (!projectId) return;

    // Leave previous project room if different
    if (this.currentProjectId && this.currentProjectId !== projectId) {
      this.leaveProject(this.currentProjectId);
    }

    // Always track the intended project so we can join on (re)connect
    this.currentProjectId = projectId;
    this.joinedProjects.add(projectId);

    // Persist user info so reconnections include presence data
    if (user) {
      this.currentUser = user;
    }

    // Only emit if connected; the on("connect") handler will rejoin otherwise
    if (this.socket?.connected) {
      this.socket.emit("join:project", { projectId, user: user ?? this.currentUser });
    }
  }

  /**
   * Leave a project room
   */
  leaveProject(projectId: string): void {
    if (!projectId) return;

    if (this.socket?.connected) {
      this.socket.emit("leave:project", projectId);
    }
    this.joinedProjects.delete(projectId);
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }
  }

  /**
   * Join a suite room to receive updates for that suite
   */
  joinSuite(suiteId: string): void {
    if (!suiteId) return;

    // Leave previous suite room if different
    if (this.currentSuiteId && this.currentSuiteId !== suiteId) {
      this.leaveSuite(this.currentSuiteId);
    }

    // Always track the intended suite so we can join on (re)connect
    this.currentSuiteId = suiteId;
    this.joinedSuites.add(suiteId);

    // Only emit if connected; the on("connect") handler will rejoin otherwise
    if (this.socket?.connected) {
      this.socket.emit("join:suite", suiteId);
    }
  }

  /**
   * Leave a suite room
   */
  leaveSuite(suiteId: string): void {
    if (!suiteId) return;

    if (this.socket?.connected) {
      this.socket.emit("leave:suite", suiteId);
    }
    this.joinedSuites.delete(suiteId);
    if (this.currentSuiteId === suiteId) {
      this.currentSuiteId = null;
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
    if (!testCaseId) return;

    this.joinedTestCases.set(testCaseId, { projectId, user });

    if (this.socket?.connected) {
      this.socket.emit("join:testcase", { testCaseId, projectId, user });
    }
  }

  /**
   * Leave a test case editing room
   */
  leaveTestCase(testCaseId: string, projectId: string, userId: string): void {
    if (!testCaseId) return;

    this.joinedTestCases.delete(testCaseId);

    if (this.socket?.connected) {
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

  // =========================================================================
  // COLLABORATIVE EDITING - Ticket Room
  // =========================================================================

  /**
   * Join a ticket editing room for collaborative editing
   */
  joinTicket(
    ticketId: string,
    projectId: string,
    user: { id: string; name: string; avatar?: string }
  ): void {
    if (!ticketId) return;

    this.joinedTickets.set(ticketId, { projectId, user });

    if (this.socket?.connected) {
      this.socket.emit("join:ticket", { ticketId, projectId, user });
    }
  }

  /**
   * Leave a ticket editing room
   */
  leaveTicket(ticketId: string, projectId: string, userId: string): void {
    if (!ticketId) return;

    this.joinedTickets.delete(ticketId);

    if (this.socket?.connected) {
      this.socket.emit("leave:ticket", { ticketId, projectId, userId });
    }
  }

  /**
   * Emit a field edit for a ticket (collaborative editing)
   * This broadcasts the change to other users viewing the same ticket
   */
  emitTicketFieldEdit(data: {
    ticketId: string;
    projectId: string;
    userId: string;
    userName: string;
    field: string;
    value: string | number | boolean | null;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit("ticket:editing", data);
    }
  }

  /**
   * Subscribe to a socket event.
   * If the socket hasn't been created yet, the listener is buffered and
   * will be attached once connect() creates the socket instance.
   */
  on<K extends keyof SocketEvents>(
    event: K,
    callback: EventCallback<SocketEvents[K]>
  ): void {
    if (this.socket) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on(event, callback as any);
    } else {
      // Buffer the listener so it isn't silently lost
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.pendingListeners.push({ event, callback: callback as any });
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
    // Also remove from pending listeners if socket isn't created yet
    if (callback) {
      this.pendingListeners = this.pendingListeners.filter(
        (l) => !(l.event === event && l.callback === callback)
      );
    } else {
      this.pendingListeners = this.pendingListeners.filter(
        (l) => l.event !== event
      );
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
