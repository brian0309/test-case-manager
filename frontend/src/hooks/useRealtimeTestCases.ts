/**
 * Custom hook for real-time test case updates
 * Manages socket subscriptions and store updates
 */

import { useEffect, useCallback, useRef } from "react";
import { socketService, SocketEvents } from "../services/socket";
import { useTestManagerStore } from "../store/testManagerStore";
import { Status, TestCase } from "../types/testManager";

interface UseRealtimeTestCasesOptions {
  /** Project ID to subscribe to */
  projectId: string | null;
  /** Optional suite ID for more granular updates */
  suiteId?: string | null;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
}

/**
 * Hook to subscribe to real-time test case updates
 * Automatically updates the Zustand store when events are received
 */
export function useRealtimeTestCases({
  projectId,
  suiteId,
  autoConnect = true,
}: UseRealtimeTestCasesOptions) {
  const {
    setTestCases,
    setTestSuites,
    activeTestCaseId,
    setActiveTestCaseId,
    activeSuiteId,
    setActiveSuiteId,
    updateProjectLocal,
    updateProjectSettingsLocal,
    deleteProjectLocal,
  } = useTestManagerStore();

  // Track if we've set up listeners to prevent duplicates
  const listenersSetup = useRef(false);

  // Batching for testcase:updated events to reduce re-renders
  const pendingUpdates = useRef<Map<string, TestCase>>(new Map());
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingUpdates = useCallback(() => {
    const updates = pendingUpdates.current;
    if (updates.size === 0) return;

    const updatesSnapshot = new Map(updates);
    updates.clear();

    setTestCases((currentCases) =>
      currentCases.map((tc) => updatesSnapshot.get(tc.id) ?? tc)
    );
  }, [setTestCases]);

  // Cleanup batch timer on unmount
  useEffect(() => {
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
        batchTimer.current = null;
      }
    };
  }, []);

  // Handler for project updated
  const handleProjectUpdated = useCallback(
    (data: SocketEvents["project:updated"]) => {
      updateProjectLocal(data.project);
    },
    [updateProjectLocal]
  );

  // Handler for project settings updated
  const handleProjectSettingsUpdated = useCallback(
    (data: SocketEvents["project:settings-updated"]) => {
      updateProjectSettingsLocal(data.projectId, data.settings);
    },
    [updateProjectSettingsLocal]
  );

  // Handler for project deleted
  const handleProjectDeleted = useCallback(
    (data: SocketEvents["project:deleted"]) => {
      deleteProjectLocal(data.projectId);
    },
    [deleteProjectLocal]
  );

  // Handler for test case created
  const handleTestCaseCreated = useCallback(
    (data: SocketEvents["testcase:created"]) => {

      // Only update if it's for the current suite we're viewing
      if (activeSuiteId === data.suiteId) {
        // Use functional update to check against current state (not stale closure)
        setTestCases((currentCases) => {
          const exists = currentCases.some((tc) => tc.id === data.testCase.id);
          if (exists) return currentCases; // No change if duplicate
          return [...currentCases, data.testCase];
        });
      }
    },
    [activeSuiteId, setTestCases]
  );

  // Handler for test case updated (batched to reduce re-renders)
  const handleTestCaseUpdated = useCallback(
    (data: SocketEvents["testcase:updated"]) => {
      pendingUpdates.current.set(data.testCase.id, data.testCase);

      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
      batchTimer.current = setTimeout(() => {
        batchTimer.current = null;
        flushPendingUpdates();
      }, 50);
    },
    [flushPendingUpdates]
  );

  // Handler for test case deleted
  const handleTestCaseDeleted = useCallback(
    (data: SocketEvents["testcase:deleted"]) => {

      setTestCases((currentCases) => currentCases.filter((tc) => tc.id !== data.testCaseId));

      // If the deleted test case was active, clear selection
      if (activeTestCaseId === data.testCaseId) {
        setActiveTestCaseId(null);
      }
    },
    [setTestCases, activeTestCaseId, setActiveTestCaseId]
  );

  // Handler for test cases reordered
  const handleTestCasesReordered = useCallback(
    (data: SocketEvents["testcase:reordered"]) => {

      // Only update if it's for the current suite we're viewing
      if (activeSuiteId === data.suiteId) {
        setTestCases(data.testCases);
      }
    },
    [activeSuiteId, setTestCases]
  );

  // Handler for bulk deleted
  const handleTestCasesBulkDeleted = useCallback(
    (data: SocketEvents["testcase:bulk-deleted"]) => {

      const deletedSet = new Set(data.testCaseIds);
      setTestCases((currentCases) => currentCases.filter((tc) => !deletedSet.has(tc.id)));

      // If the active test case was deleted, clear selection
      if (activeTestCaseId && deletedSet.has(activeTestCaseId)) {
        setActiveTestCaseId(null);
      }
    },
    [setTestCases, activeTestCaseId, setActiveTestCaseId]
  );

  // Handler for bulk status updated
  const handleTestCasesBulkStatusUpdated = useCallback(
    (data: SocketEvents["testcase:bulk-status-updated"]) => {

      const updatedSet = new Set(data.testCaseIds);
      setTestCases((currentCases) =>
        currentCases.map((tc) =>
          updatedSet.has(tc.id) ? { ...tc, status: data.status as Status } : tc
        )
      );
    },
    [setTestCases]
  );

  // Handler for test case cloned
  const handleTestCaseCloned = useCallback(
    (data: SocketEvents["testcase:cloned"]) => {

      // Only update if it's for the current suite we're viewing
      if (activeSuiteId === data.suiteId) {
        // Use functional update to check against current state (not stale closure)
        setTestCases((currentCases) => {
          const exists = currentCases.some((tc) => tc.id === data.testCase.id);
          if (exists) return currentCases; // No change if duplicate
          return [...currentCases, data.testCase];
        });
      }
    },
    [activeSuiteId, setTestCases]
  );

  // Handler for bulk imported
  const handleTestCasesBulkImported = useCallback(
    (data: SocketEvents["testcase:bulk-imported"]) => {

      // Only update if it's for the current suite we're viewing
      if (activeSuiteId === data.suiteId) {
        // Use functional update to check against current state (not stale closure)
        setTestCases((currentCases) => {
          const existingIds = new Set(currentCases.map((tc) => tc.id));
          const newTestCases = data.testCases.filter((tc) => !existingIds.has(tc.id));
          if (newTestCases.length === 0) return currentCases; // No change
          return [...currentCases, ...newTestCases];
        });
      }
    },
    [activeSuiteId, setTestCases]
  );

  // Handler for test suite created
  const handleTestSuiteCreated = useCallback(
    (data: SocketEvents["testsuite:created"]) => {

      // Use functional update to check against current state (not stale closure)
      setTestSuites((currentSuites) => {
        const exists = currentSuites.some((s) => s.id === data.suite.id);
        if (exists) return currentSuites; // No change if duplicate
        return [...currentSuites, data.suite];
      });
    },
    [setTestSuites]
  );

  // Handler for test suite updated
  const handleTestSuiteUpdated = useCallback(
    (data: SocketEvents["testsuite:updated"]) => {

      setTestSuites((currentSuites) =>
        currentSuites.map((s) =>
          s.id === data.suite.id ? data.suite : s
        )
      );
    },
    [setTestSuites]
  );

  // Handler for test suite deleted
  const handleTestSuiteDeleted = useCallback(
    (data: SocketEvents["testsuite:deleted"]) => {

      setTestSuites((currentSuites) => currentSuites.filter((s) => s.id !== data.suiteId));

      // If the deleted suite was active, clear selection
      if (activeSuiteId === data.suiteId) {
        setActiveSuiteId(null);
        setTestCases([]);
        setActiveTestCaseId(null);
      }
    },
    [setTestSuites, activeSuiteId, setActiveSuiteId, setTestCases, setActiveTestCaseId]
  );

  // Connect to socket and set up listeners
  useEffect(() => {
    if (!autoConnect) return;

    // Connect to socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Set up event listeners (only once)
    if (!listenersSetup.current) {
      socketService.on("testcase:created", handleTestCaseCreated);
      socketService.on("testcase:updated", handleTestCaseUpdated);
      socketService.on("testcase:deleted", handleTestCaseDeleted);
      socketService.on("testcase:reordered", handleTestCasesReordered);
      socketService.on("testcase:bulk-deleted", handleTestCasesBulkDeleted);
      socketService.on("testcase:bulk-status-updated", handleTestCasesBulkStatusUpdated);
      socketService.on("testcase:cloned", handleTestCaseCloned);
      socketService.on("testcase:bulk-imported", handleTestCasesBulkImported);
      socketService.on("testsuite:created", handleTestSuiteCreated);
      socketService.on("testsuite:updated", handleTestSuiteUpdated);
      socketService.on("testsuite:deleted", handleTestSuiteDeleted);
      socketService.on("project:updated", handleProjectUpdated);
      socketService.on("project:settings-updated", handleProjectSettingsUpdated);
      socketService.on("project:deleted", handleProjectDeleted);
      listenersSetup.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (listenersSetup.current) {
        socketService.off("testcase:created");
        socketService.off("testcase:updated");
        socketService.off("testcase:deleted");
        socketService.off("testcase:reordered");
        socketService.off("testcase:bulk-deleted");
        socketService.off("testcase:bulk-status-updated");
        socketService.off("testcase:cloned");
        socketService.off("testcase:bulk-imported");
        socketService.off("testsuite:created");
        socketService.off("testsuite:updated");
        socketService.off("testsuite:deleted");
        socketService.off("project:updated");
        socketService.off("project:settings-updated");
        socketService.off("project:deleted");
        listenersSetup.current = false;
      }
    };
  }, [
    autoConnect,
    handleTestCaseCreated,
    handleTestCaseUpdated,
    handleTestCaseDeleted,
    handleTestCasesReordered,
    handleTestCasesBulkDeleted,
    handleTestCasesBulkStatusUpdated,
    handleTestCaseCloned,
    handleTestCasesBulkImported,
    handleTestSuiteCreated,
    handleTestSuiteUpdated,
    handleTestSuiteDeleted,
    handleProjectUpdated,
    handleProjectSettingsUpdated,
    handleProjectDeleted,
  ]);

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

  // Join/leave suite room when suiteId changes
  useEffect(() => {
    if (suiteId) {
      socketService.joinSuite(suiteId);
    }

    return () => {
      if (suiteId) {
        socketService.leaveSuite(suiteId);
      }
    };
  }, [suiteId]);

  return {
    isConnected: socketService.isConnected(),
    connect: () => socketService.connect(),
    disconnect: () => socketService.disconnect(),
  };
}
