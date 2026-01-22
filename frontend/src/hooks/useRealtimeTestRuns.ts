import { useEffect, useCallback, useRef } from 'react';
import { socketService, SocketEvents } from '../services/socket';
import { TestRun, TestRunListItem } from '../types/testManager';

interface UseRealtimeTestRunsOptions {
    projectId: string | null;
    setTestRuns: React.Dispatch<React.SetStateAction<TestRunListItem[]>>;
    setExecuteRun?: React.Dispatch<React.SetStateAction<TestRun | null>>;
}

export const useRealtimeTestRuns = ({
    projectId,
    setTestRuns,
    setExecuteRun
}: UseRealtimeTestRunsOptions) => {
    // Track if listeners are set up
    const listenersSetup = useRef(false);

    const handleTestRunCreated = useCallback((data: SocketEvents['testrun:created']) => {
        // Convert TestRun to TestRunListItem (simplified mapping)
        const newItem: TestRunListItem = {
            id: data.testRun.id,
            title: data.testRun.title,
            description: data.testRun.description,
            projectId: data.testRun.projectId,
            suiteId: data.testRun.suiteId,
            suiteName: data.testRun.suiteName,
            status: data.testRun.status,
            environment: data.testRun.environment,
            tags: data.testRun.tags,
            itemCount: data.testRun.items.length,
            createdBy: data.testRun.createdBy,
            startedAt: data.testRun.startedAt,
            completedAt: data.testRun.completedAt,
            resultsSummary: data.testRun.resultsSummary,
            groupId: data.testRun.groupId,
            createdAt: data.testRun.createdAt,
            updatedAt: data.testRun.updatedAt,
        };

        setTestRuns(prev => [newItem, ...prev]);
    }, [setTestRuns]);

    const handleTestRunUpdated = useCallback((data: SocketEvents['testrun:updated']) => {
        setTestRuns(prev => prev.map(run => {
            if (run.id === data.testRun.id) {
                // Update list item properties
                return {
                    ...run,
                    title: data.testRun.title,
                    description: data.testRun.description,
                    status: data.testRun.status,
                    resultsSummary: data.testRun.resultsSummary,
                    updatedAt: data.testRun.updatedAt,
                    startedAt: data.testRun.startedAt,
                    completedAt: data.testRun.completedAt,
                    groupId: data.testRun.groupId,
                    // Update other fields as necessary
                };
            }
            return run;
        }));

        if (setExecuteRun) {
            setExecuteRun(prev => {
                if (prev && prev.id === data.testRun.id) {
                    return data.testRun;
                }
                return prev;
            });
        }
    }, [setTestRuns, setExecuteRun]);

    const handleTestRunDeleted = useCallback((data: SocketEvents['testrun:deleted']) => {
        setTestRuns(prev => prev.filter(run => run.id !== data.testRunId));
        
        if (setExecuteRun) {
            setExecuteRun(prev => {
                if (prev && prev.id === data.testRunId) {
                    return null; // Close modal if run is deleted
                }
                return prev;
            });
        }
    }, [setTestRuns, setExecuteRun]);

    const handleTestRunItemUpdated = useCallback((data: SocketEvents['testrun:item-updated']) => {
        // We only need to update the executeRun state here, 
        // as the list view updates come via testrun:updated (which contains summary stats)
        // However, we might want to update stats optimistically in the list view if we wanted to be very granular.
        // But for now, relying on testrun:updated for list stats is safer.
        
        if (setExecuteRun) {
            setExecuteRun(prev => {
                if (prev && prev.id === data.testRunId) {
                    const newItems = prev.items.map(item => {
                        if (item.id === data.itemId) {
                            return {
                                ...item,
                                status: data.status,
                                actualResult: data.actualResult || item.actualResult
                            };
                        }
                        return item;
                    });
                    
                    return {
                        ...prev,
                        items: newItems,
                        resultsSummary: data.resultsSummary
                    };
                }
                return prev;
            });
        }
    }, [setExecuteRun]);

    useEffect(() => {
        if (!projectId) return;

        // Ensure socket connection
        if (!socketService.isConnected()) {
            socketService.connect();
        }
        
        // Join project room
        socketService.joinProject(projectId);

        if (!listenersSetup.current) {
            socketService.on('testrun:created', handleTestRunCreated);
            socketService.on('testrun:updated', handleTestRunUpdated);
            socketService.on('testrun:deleted', handleTestRunDeleted);
            socketService.on('testrun:item-updated', handleTestRunItemUpdated);
            listenersSetup.current = true;
        }

        return () => {
            if (listenersSetup.current) {
                socketService.off('testrun:created', handleTestRunCreated);
                socketService.off('testrun:updated', handleTestRunUpdated);
                socketService.off('testrun:deleted', handleTestRunDeleted);
                socketService.off('testrun:item-updated', handleTestRunItemUpdated);
                listenersSetup.current = false;
            }
            // We don't leave project here as it might be used by other components
        };
    }, [projectId, handleTestRunCreated, handleTestRunUpdated, handleTestRunDeleted, handleTestRunItemUpdated]);
};
