# Real-Time Collaborative Editing Architecture

This document describes the WebSocket-based real-time collaboration system implemented in this project using Socket.io.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Event Reference](#event-reference)
- [Room System](#room-system)
- [Authentication](#authentication)
- [Adding Real-Time to New Features](#adding-real-time-to-new-features)

## Overview

The application supports real-time collaborative editing, allowing multiple users to:
- See live updates when others create, edit, or delete test cases and suites
- Collaborate on the same test case with Google Docs-like live typing updates
- See who else is currently viewing/editing a test case

### Key Technologies
- **Socket.io** (v4.x) - WebSocket library with automatic fallback to polling
- **Cookie-based JWT** - Same authentication as REST API
- **Room-based broadcasting** - Scoped event delivery

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Socket Service  │  │ useRealtime Hook │  │ useCollab Hook│ │
│  │  (socket.ts)     │  │ (list updates)   │  │ (field edits) │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                     │         │
│           └─────────────────────┴─────────────────────┘         │
│                                 │                               │
└─────────────────────────────────┼───────────────────────────────┘
                                  │ WebSocket (wss://)
┌─────────────────────────────────┼───────────────────────────────┐
│                        Backend  │                                │
├─────────────────────────────────┼───────────────────────────────┤
│           ┌─────────────────────▼─────────────────────┐         │
│           │         Socket Manager                     │         │
│           │    (backend/socket/socketManager.ts)       │         │
│           │                                            │         │
│           │  • Auth middleware (JWT from cookie)       │         │
│           │  • Room management (project/suite/case)    │         │
│           │  • Event emission helpers                  │         │
│           └─────────────────────┬─────────────────────┘         │
│                                 │                               │
│     ┌───────────────────────────┼───────────────────────────┐   │
│     │                           ▼                           │   │
│     │              Controllers emit events                   │   │
│     │   testCase.controller.ts  │  testSuite.controller.ts  │   │
│     └───────────────────────────┴───────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Implementation

### Socket Manager (`backend/socket/socketManager.ts`)

The central class managing all WebSocket connections:

```typescript
import { socketManager } from './socket/socketManager.js';

// Initialize in index.ts
const httpServer = createServer(app);
socketManager.initialize(httpServer, allowedOrigins);
httpServer.listen(PORT);
```

### Key Methods

| Method | Description |
|--------|-------------|
| `initialize(server, origins)` | Sets up Socket.io with auth middleware |
| `emitToProject(projectId, event, data)` | Broadcast to all users viewing a project |
| `emitToSuite(suiteId, event, data)` | Broadcast to users viewing a specific suite |
| `emitToTestCase(testCaseId, event, data)` | Broadcast to users editing a test case |

### Emitting Events from Controllers

After any CRUD operation, emit the corresponding event:

```typescript
// In controller after successful operation
import { socketManager } from '../../socket/socketManager.js';

// After creating a test case
const testCase = await createTestCase(data);
socketManager.emitToProject(testCase.projectId, 'testcase:created', {
    testCase,
    suiteId: testCase.suiteId,
});
```

## Frontend Implementation

### Socket Service (`frontend/src/services/socket.ts`)

Singleton service managing the WebSocket connection:

```typescript
import { socketService } from '../services/socket';

// Connect (auto-authenticates via cookie)
socketService.connect();

// Join rooms
socketService.joinProject(projectId);
socketService.joinSuite(suiteId);

// Listen to events
socketService.on('testcase:updated', (data) => {
    // Handle update
});
```

### Hooks

#### `useRealtimeTestCases` - List-level updates

Automatically subscribes to create/update/delete events and updates Zustand store:

```typescript
// In a page component
import { useRealtimeTestCases } from '../hooks/useRealtimeTestCases';

function TestCasesPage() {
    useRealtimeTestCases({ projectId, suiteId });
    // Component automatically receives live updates
}
```

#### `useCollaborativeEditing` - Field-level collaboration

Enables Google Docs-style live editing:

```typescript
import { useCollaborativeEditing } from '../hooks/useCollaborativeEditing';

function TestCaseModal({ testCase }) {
    const { 
        collaboratingUsers,    // Array of users editing
        emitFieldChange,       // Function to broadcast field changes
        remoteEditingField,    // Currently edited field by others
        isCollaborating        // Whether collaboration is active
    } = useCollaborativeEditing({
        testCase,
        onFieldUpdate: (field, value) => {
            // Update local state with remote changes
            setLocalCase(prev => ({ ...prev, [field]: value }));
        },
    });

    // Emit changes as user types
    const handleTitleChange = (e) => {
        setTitle(e.target.value);
        emitFieldChange('title', e.target.value);
    };
}
```

## Event Reference

### Test Case Events

| Event | Payload | Description |
|-------|---------|-------------|
| `testcase:created` | `{ testCase, suiteId }` | New test case created |
| `testcase:updated` | `{ testCase, suiteId }` | Test case modified |
| `testcase:deleted` | `{ testCaseId, suiteId, projectId }` | Test case removed |
| `testcase:cloned` | `{ testCase, suiteId }` | Test case duplicated |
| `testcase:reordered` | `{ suiteId, projectId, testCases }` | Order changed |
| `testcase:bulk-created` | `{ testCases, suiteId, projectId }` | Multiple created |
| `testcase:bulk-deleted` | `{ testCaseIds, suiteId, projectId }` | Multiple deleted |
| `testcase:bulk-moved` | `{ testCases, fromSuiteId, toSuiteId, projectId }` | Moved between suites |

### Test Suite Events

| Event | Payload | Description |
|-------|---------|-------------|
| `testsuite:created` | `{ suite, projectId }` | New suite created |
| `testsuite:updated` | `{ suite, projectId }` | Suite modified |
| `testsuite:deleted` | `{ suiteId, projectId }` | Suite removed |

### Collaborative Editing Events

| Event | Payload | Description |
|-------|---------|-------------|
| `testcase:editing` | `{ testCaseId, userId, userName, field, value }` | Field being edited |
| `testcase:user-joined` | `{ testCaseId, userId, userName }` | User started editing |
| `testcase:user-left` | `{ testCaseId, userId }` | User stopped editing |

### Project Presence Events

| Event | Payload | Description |
|-------|---------|-------------|
| `project:user-joined` | `{ projectId, user: { id, name, avatar? } }` | User joined project view |
| `project:user-left` | `{ projectId, userId }` | User left project view |
| `project:presence` | `{ projectId, users: [{ id, name, avatar? }] }` | Current users in project |

## Room System

Users are automatically joined to rooms based on what they're viewing:

```
project:{projectId}     - All users viewing any part of a project (with presence tracking)
suite:{suiteId}         - Users viewing a specific suite's test cases
testcase:{testCaseId}   - Users editing a specific test case
```

### Room Joining Flow

1. **Page Load**: `useProjectPresence` joins project room with user info for presence
2. **Events**: `useRealtimeTestCases` joins project and suite rooms for CRUD events
3. **Open Modal**: `useCollaborativeEditing` joins testcase room for collaborative editing
4. **Close Modal**: User leaves testcase room
5. **Navigate Away**: User leaves all rooms

### Project Presence

The `useProjectPresence` hook tracks who else is viewing the same project:

```typescript
import { useProjectPresence } from '../hooks/useProjectPresence';

function TestCasesPage() {
    const { projectUsers } = useProjectPresence({ projectId });
    
    // projectUsers contains other users viewing this project
    // Use with ProjectPresenceIndicator component
}
```

## Authentication

Socket connections are authenticated using the same JWT cookie as REST API:

```typescript
// Backend auth middleware (in socketManager.ts)
io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const token = cookies.token;
    
    if (!token) return next(new Error('Authentication required'));
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.userId;
    next();
});
```

**Important**: Frontend must connect with `withCredentials: true` to send cookies.

## Adding Real-Time to New Features

### Step 1: Define Events

Add event types to `frontend/src/services/socket.ts`:

```typescript
export interface SocketEvents {
    // Add your new events
    'myfeature:created': { item: MyItem; projectId: string };
    'myfeature:updated': { item: MyItem };
}
```

### Step 2: Emit from Backend Controller

```typescript
import { socketManager } from '../../socket/socketManager.js';

export const createMyItem = async (req, res) => {
    const item = await MyService.create(req.body);
    
    // Emit to relevant room
    socketManager.emitToProject(item.projectId, 'myfeature:created', {
        item,
        projectId: item.projectId,
    });
    
    res.status(201).json(item);
};
```

### Step 3: Subscribe in Frontend

```typescript
useEffect(() => {
    socketService.on('myfeature:created', handleCreated);
    socketService.on('myfeature:updated', handleUpdated);
    
    return () => {
        socketService.off('myfeature:created', handleCreated);
        socketService.off('myfeature:updated', handleUpdated);
    };
}, []);
```

### Step 4: Update Zustand Store

```typescript
const handleCreated = (data) => {
    useMyStore.getState().addItem(data.item);
};
```

## Performance Considerations

1. **Debounce Field Edits**: Use 300ms debounce for typing (already implemented in `useCollaborativeEditing`)
2. **Room Scoping**: Only broadcast to relevant rooms, not all connected users
3. **Cleanup**: Always unsubscribe from events and leave rooms on unmount
4. **Reconnection**: Socket.io handles automatic reconnection with exponential backoff

## Troubleshooting

### Socket Not Connecting
- Check CORS: `allowedOrigins` must include frontend URL
- Verify cookies are being sent (`withCredentials: true`)
- Check browser console for connection errors

### Events Not Received
- Verify user is in the correct room (`joinProject`, `joinSuite`)
- Check event name matches exactly (case-sensitive)
- Ensure `socketService.connect()` was called

### Authentication Failures
- Cookie must be set with correct domain/path
- JWT must not be expired
- `JWT_SECRET` must match between socket auth and REST auth

## Files Reference

| File | Purpose |
|------|---------|
| `backend/socket/socketManager.ts` | Socket.io server setup and event handlers |
| `backend/index.ts` | HTTP server creation and socket initialization |
| `frontend/src/services/socket.ts` | Socket.io client singleton |
| `frontend/src/hooks/useRealtimeTestCases.ts` | Hook for list-level updates |
| `frontend/src/hooks/useCollaborativeEditing.ts` | Hook for collaborative editing |
| `frontend/src/hooks/useProjectPresence.ts` | Hook for project presence tracking |
| `frontend/src/components/testManager/ProjectPresenceIndicator.tsx` | UI for showing online users |
