import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { TokenPayload } from "../types/auth.types.js";

// Extend Socket type to include userId and user info
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

// Track users in each project room
interface ProjectUser {
  id: string;
  name: string;
  avatar?: string;
  socketId: string;
}

// Map of projectId -> Map of socketId -> user info
const projectUsersMap = new Map<string, Map<string, ProjectUser>>();

// Socket event types for type safety
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

  // Collaborative Editing Events (real-time as user types)
  "testcase:editing": {
    testCaseId: string;
    suiteId: string;
    projectId: string;
    userId: string;
    userName: string;
    field: string;
    value: any;
  };
  "testcase:presence": {
    testCaseId: string;
    projectId: string;
    users: Array<{ id: string; name: string; avatar?: string }>;
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

  // Test Run Events
  "testrun:created": { testRun: any; projectId: string };
  "testrun:updated": { testRun: any; projectId: string };
  "testrun:deleted": { testRunId: string; projectId: string };
  "testrun:item-updated": { 
    testRunId: string; 
    itemId: string; 
    status: string; 
    actualResult?: string;
    resultsSummary: any;
    projectId: string;
  };

  // Project Events
  "project:updated": { project: any; projectId: string };
  "project:settings-updated": { settings: any; projectId: string };
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
    message: any;
    testCaseId: string;
    projectId: string;
  };
  "discussion:updated": {
    message: any;
    testCaseId: string;
    projectId: string;
  };
  "discussion:deleted": {
    messageId: string;
    testCaseId: string;
    projectId: string;
  };
}

class SocketManager {
  private io: Server | null = null;
  private static instance: SocketManager;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /**
   * Initialize Socket.io server with authentication
   */
  initialize(httpServer: HttpServer, corsOrigins: string[]): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: corsOrigins,
        credentials: true,
      },
      // Use WebSocket with polling fallback
      transports: ["websocket", "polling"],
    });

    // Authentication middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
          return next(new Error("Authentication required"));
        }

        const parsedCookies = cookie.parse(cookies);
        const token = parsedCookies.token;

        if (!token) {
          return next(new Error("Authentication required"));
        }

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        ) as TokenPayload;

        if (!decoded || !decoded.userId) {
          return next(new Error("Invalid token"));
        }

        socket.userId = decoded.userId;
        next();
      } catch {
        next(new Error("Authentication failed"));
      }
    });

    // Handle connections
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      // Join user-specific room for targeted updates
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }

      // Handle joining project room
      socket.on("join:project", (data: { projectId: string; user?: { id: string; name: string; avatar?: string } }) => {
        const projectId = typeof data === 'string' ? data : data.projectId;
        const user = typeof data === 'object' ? data.user : null;
        
        if (projectId) {
          socket.join(`project:${projectId}`);
          
          // Track user presence if user info provided
          if (user && user.id) {
            if (!projectUsersMap.has(projectId)) {
              projectUsersMap.set(projectId, new Map());
            }
            const projectUsers = projectUsersMap.get(projectId)!;
            const userEntry: ProjectUser = {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              socketId: socket.id,
            };
            projectUsers.set(socket.id, userEntry);
            
            // Store user info on socket for disconnect handling
            socket.data.currentProjectId = projectId;
            socket.data.userId = user.id;
            socket.data.userName = user.name;
            socket.data.userAvatar = user.avatar;
            
            // Broadcast to others that a user joined
            socket.to(`project:${projectId}`).emit("project:user-joined", {
              projectId,
              user: { id: user.id, name: user.name, avatar: user.avatar },
            });
            
            // Send current presence list to the joining user
            const usersArray = Array.from(projectUsers.values()).map(u => ({
              id: u.id,
              name: u.name,
              avatar: u.avatar,
            }));
            socket.emit("project:presence", { projectId, users: usersArray });
          }
        }
      });

      // Handle leaving project room
      socket.on("leave:project", (projectId: string) => {
        if (projectId) {
          socket.leave(`project:${projectId}`);
          
          // Remove user from presence tracking
          const projectUsers = projectUsersMap.get(projectId);
          if (projectUsers) {
            const userEntry = projectUsers.get(socket.id);
            if (userEntry) {
              projectUsers.delete(socket.id);
              
              // Broadcast to others that user left
              socket.to(`project:${projectId}`).emit("project:user-left", {
                projectId,
                userId: userEntry.id,
              });
            }
            
            // Clean up empty project maps
            if (projectUsers.size === 0) {
              projectUsersMap.delete(projectId);
            }
          }
          
          // Clear socket data
          socket.data.currentProjectId = null;
        }
      });

      // Handle joining suite room (for more granular updates)
      socket.on("join:suite", (suiteId: string) => {
        if (suiteId) {
          socket.join(`suite:${suiteId}`);
        }
      });

      // Handle leaving suite room
      socket.on("leave:suite", (suiteId: string) => {
        if (suiteId) {
          socket.leave(`suite:${suiteId}`);
        }
      });

      // =========================================================================
      // COLLABORATIVE EDITING - Join/Leave test case editing room
      // =========================================================================
      
      // Handle joining test case editing room (for collaborative editing)
      socket.on("join:testcase", (data: { testCaseId: string; projectId: string; user: { id: string; name: string; avatar?: string } }) => {
        if (data.testCaseId && data.projectId) {
          const roomName = `testcase:${data.testCaseId}`;
          socket.join(roomName);
          
          // Broadcast to others that a user joined
          socket.to(roomName).emit("testcase:user-joined", {
            testCaseId: data.testCaseId,
            projectId: data.projectId,
            user: data.user,
          });
        }
      });

      // Handle leaving test case editing room
      socket.on("leave:testcase", (data: { testCaseId: string; projectId: string; userId: string }) => {
        if (data.testCaseId) {
          const roomName = `testcase:${data.testCaseId}`;
          socket.leave(roomName);
          
          // Broadcast to others that a user left
          socket.to(roomName).emit("testcase:user-left", {
            testCaseId: data.testCaseId,
            projectId: data.projectId,
            userId: data.userId,
          });
        }
      });

      // Handle real-time field editing (broadcast to other editors)
      socket.on("testcase:editing", (data: {
        testCaseId: string;
        suiteId: string;
        projectId: string;
        userId: string;
        userName: string;
        field: string;
        value: any;
      }) => {
        if (data.testCaseId) {
          const roomName = `testcase:${data.testCaseId}`;
          // Broadcast to everyone EXCEPT the sender
          socket.to(roomName).emit("testcase:editing", data);
        }
      });

      // Handle disconnect
      socket.on("disconnect", (_reason) => {
        // Clean up project presence
        const currentProjectId = socket.data.currentProjectId;
        if (currentProjectId) {
          const projectUsers = projectUsersMap.get(currentProjectId);
          if (projectUsers) {
            const userEntry = projectUsers.get(socket.id);
            if (userEntry) {
              projectUsers.delete(socket.id);
              
              // Broadcast to others that user left
              socket.to(`project:${currentProjectId}`).emit("project:user-left", {
                projectId: currentProjectId,
                userId: userEntry.id,
              });
            }
            
            // Clean up empty project maps
            if (projectUsers.size === 0) {
              projectUsersMap.delete(currentProjectId);
            }
          }
        }
      });
    });

    return this.io;
  }

  /**
   * Get the Socket.io server instance
   */
  getIO(): Server | null {
    return this.io;
  }

  /**
   * Emit event to all users in a project room
   */
  emitToProject<K extends keyof SocketEvents>(
    projectId: string,
    event: K,
    data: SocketEvents[K]
  ): void {
    if (this.io) {
      this.io.to(`project:${projectId}`).emit(event, data);
      console.log(`Emitted ${event} to project:${projectId}`);
    }
  }

  /**
   * Emit event to all users in a suite room
   */
  emitToSuite<K extends keyof SocketEvents>(
    suiteId: string,
    event: K,
    data: SocketEvents[K]
  ): void {
    if (this.io) {
      this.io.to(`suite:${suiteId}`).emit(event, data);
      console.log(`Emitted ${event} to suite:${suiteId}`);
    }
  }

  /**
   * Emit event to a specific user
   */
  emitToUser<K extends keyof SocketEvents>(
    userId: string,
    event: K,
    data: SocketEvents[K]
  ): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Broadcast to all connected clients (use sparingly)
   */
  broadcast<K extends keyof SocketEvents>(event: K, data: SocketEvents[K]): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

// Export singleton instance
export const socketManager = SocketManager.getInstance();

// Export helper functions for easy use in controllers
export const emitTestCaseCreated = (
  projectId: string,
  suiteId: string,
  testCase: any
) => {
  socketManager.emitToProject(projectId, "testcase:created", {
    testCase,
    suiteId,
    projectId,
  });
};

export const emitTestCaseUpdated = (
  projectId: string,
  suiteId: string,
  testCase: any
) => {
  socketManager.emitToProject(projectId, "testcase:updated", {
    testCase,
    suiteId,
    projectId,
  });
};

export const emitTestCaseDeleted = (
  projectId: string,
  suiteId: string,
  testCaseId: string
) => {
  socketManager.emitToProject(projectId, "testcase:deleted", {
    testCaseId,
    suiteId,
    projectId,
  });
};

export const emitTestCasesReordered = (
  projectId: string,
  suiteId: string,
  testCases: any[]
) => {
  socketManager.emitToProject(projectId, "testcase:reordered", {
    testCases,
    suiteId,
    projectId,
  });
};

export const emitTestCasesBulkDeleted = (
  projectId: string,
  suiteId: string,
  testCaseIds: string[]
) => {
  socketManager.emitToProject(projectId, "testcase:bulk-deleted", {
    testCaseIds,
    suiteId,
    projectId,
  });
};

export const emitTestCasesBulkStatusUpdated = (
  projectId: string,
  testCaseIds: string[],
  status: string
) => {
  socketManager.emitToProject(projectId, "testcase:bulk-status-updated", {
    testCaseIds,
    status,
    projectId,
  });
};

export const emitTestCaseCloned = (
  projectId: string,
  suiteId: string,
  testCase: any
) => {
  socketManager.emitToProject(projectId, "testcase:cloned", {
    testCase,
    suiteId,
    projectId,
  });
};

export const emitTestCasesBulkImported = (
  projectId: string,
  suiteId: string,
  testCases: any[]
) => {
  socketManager.emitToProject(projectId, "testcase:bulk-imported", {
    testCases,
    suiteId,
    projectId,
  });
};

export const emitTestSuiteCreated = (projectId: string, suite: any) => {
  socketManager.emitToProject(projectId, "testsuite:created", {
    suite,
    projectId,
  });
};

export const emitTestSuiteUpdated = (projectId: string, suite: any) => {
  socketManager.emitToProject(projectId, "testsuite:updated", {
    suite,
    projectId,
  });
};

export const emitTestSuiteDeleted = (projectId: string, suiteId: string) => {
  socketManager.emitToProject(projectId, "testsuite:deleted", {
    suiteId,
    projectId,
  });
};

export const emitTestRunCreated = (projectId: string, testRun: any) => {
  socketManager.emitToProject(projectId, "testrun:created", {
    testRun,
    projectId,
  });
};

export const emitTestRunUpdated = (projectId: string, testRun: any) => {
  socketManager.emitToProject(projectId, "testrun:updated", {
    testRun,
    projectId,
  });
};

export const emitTestRunDeleted = (projectId: string, testRunId: string) => {
  socketManager.emitToProject(projectId, "testrun:deleted", {
    testRunId,
    projectId,
  });
};

export const emitTestRunItemUpdated = (
  projectId: string, 
  testRunId: string, 
  itemId: string, 
  status: string, 
  resultsSummary: any,
  actualResult?: string
) => {
  socketManager.emitToProject(projectId, "testrun:item-updated", {
    testRunId,
    itemId,
    status,
    actualResult,
    resultsSummary,
    projectId,
  });
};

export const emitProjectUpdated = (projectId: string, project: any) => {
  socketManager.emitToProject(projectId, "project:updated", {
    project,
    projectId,
  });
};

export const emitProjectSettingsUpdated = (projectId: string, settings: any) => {
  socketManager.emitToProject(projectId, "project:settings-updated", {
    settings,
    projectId,
  });
};

export const emitProjectDeleted = (projectId: string) => {
  socketManager.emitToProject(projectId, "project:deleted", {
    projectId,
  });
};
