/**
 * Custom hook for real-time test case updates
 * Manages socket subscriptions and store updates
 */

import { useEffect, useCallback, useRef } from "react";
import { socketService, SocketEvents } from "../services/socket";
import { useTestManagerStore } from "../store/testManagerStore";
import { Status } from "../types/testManager";

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
    testCases,
    setTestSuites,
    testSuites,
    activeTestCaseId,
    setActiveTestCaseId,
    activeSuiteId,
    setActiveSuiteId,
  } = useTestManagerStore();

  // Track if we've set up listeners to prevent duplicates
  const listenersSetup = useRef(false);

  // Handler for test case created
  const handleTestCaseCreated = useCallback(
    (data: SocketEvents["testcase:created"]) => {
      console.log("[Realtime] Test case created:", data);
      
      // Only update if it's for the current suite we're viewing
      if (activeSuiteId === data.suiteId) {
        setTestCases([...testCases, data.testCase]);
      }
    },
    [activeSuiteId, testCases, setTestCases]
  );

  // Handler for test case updated
  const handleTestCaseUpdated = useCallback(
    (data: SocketEvents["testcase:updated"]) => {
      console.log("[Realtime] Test case updated:", data);
      
      setTestCases(
        testCases.map((tc) =>
          tc.id === data.testCase.id ? data.testCase : tc
        )
      );
    },
    [testCases, setTestCases]
  );

  // Handler for test case deleted
  const handleTestCaseDeleted = useCallback(
    (data: SocketEvents["testcase:deleted"]) => {
      console.log("[Realtime] Test case deleted:", data);
      
      setTestCases(testCases.filter((tc) => tc.id !== data.testCaseId));
      
      // If the deleted test case was active, clear selection
      if (activeTestCaseId === data.testCaseId) {
        setActiveTestCaseId(null);
      }
    },
    [testCases, setTestCases, activeTestCaseId, setActiveTestCaseId]
  );

  // Handler for test cases reordered
  const handleTestCasesReordered = useCallback(
    (data: SocketEvents["testcase:reordered"]) => {
      console.log("[Realtime] Test cases reordered:", data);
      
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
      console.log("[Realtime] Test cases bulk deleted:", data);
      
      const deletedSet = new Set(data.testCaseIds);
      setTestCases(testCases.filter((tc) => !deletedSet.has(tc.id)));
      
      // If the active test case was deleted, clear selection
      if (activeTestCaseId && deletedSet.has(activeTestCaseId)) {
        setActiveTestCaseId(null);
      }
    },
    [testCases, setTestCases, activeTestCaseId, setActiveTestCaseId]
  );

  // Handler for bulk status updated
  const handleTestCasesBulkStatusUpdated = useCallback(
    (data: SocketEvents["testcase:bulk-status-updated"]) => {
      console.log("[Realtime] Test cases bulk status updated:", data);
      
      const updatedSet = new Set(data.testCaseIds);
      setTestCases(
        testCases.map((tc) =>
          updatedSet.has(tc.id) ? { ...tc, status: data.status as Status } : tc
        )
      );
    },
    [testCases, setTestCases]
  );

  // Handler for test case cloned
  const handleTestCaseCloned = useCallback(
    (data: SocketEvents["testcase:cloned"]) => {
      console.log("[Realtime] Test case cloned:", data);
      
      // Only update if it's for the current suite we're viewing
      if (activeSuiteId === data.suiteId) {
        setTestCases([...testCases, data.testCase]);
      }
    },
    [activeSuiteId, testCases, setTestCases]
  );

  // Handler for bulk imported
  const handleTestCasesBulkImported = useCallback(
    (data: SocketEvents["testcase:bulk-imported"]) => {
      console.log("[Realtime] Test cases bulk imported:", data);
      
      // Only update if it's for the current suite we're viewing
      if (activeSuiteId === data.suiteId) {
        setTestCases([...testCases, ...data.testCases]);
      }
    },
    [activeSuiteId, testCases, setTestCases]
  );

  // Handler for test suite created
  const handleTestSuiteCreated = useCallback(
    (data: SocketEvents["testsuite:created"]) => {
      console.log("[Realtime] Test suite created:", data);
      
      setTestSuites([...testSuites, data.suite]);
    },
    [testSuites, setTestSuites]
  );

  // Handler for test suite updated
  const handleTestSuiteUpdated = useCallback(
    (data: SocketEvents["testsuite:updated"]) => {
      console.log("[Realtime] Test suite updated:", data);
      
      setTestSuites(
        testSuites.map((s) =>
          s.id === data.suite.id ? data.suite : s
        )
      );
    },
    [testSuites, setTestSuites]
  );

  // Handler for test suite deleted
  const handleTestSuiteDeleted = useCallback(
    (data: SocketEvents["testsuite:deleted"]) => {
      console.log("[Realtime] Test suite deleted:", data);
      
      setTestSuites(testSuites.filter((s) => s.id !== data.suiteId));
      
      // If the deleted suite was active, clear selection
      if (activeSuiteId === data.suiteId) {
        setActiveSuiteId(null);
        setTestCases([]);
        setActiveTestCaseId(null);
      }
    },
    [testSuites, setTestSuites, activeSuiteId, setActiveSuiteId, setTestCases, setActiveTestCaseId]
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
  ]);

  // Join/leave project room when projectId changes
  useEffect(() => {
    if (projectId && socketService.isConnected()) {
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
    if (suiteId && socketService.isConnected()) {
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
