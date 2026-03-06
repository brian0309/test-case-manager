import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowUpRight,
    RefreshCw,
    ChevronRight,
    ChevronLeft,
    Layers,
    MapPin,
} from 'lucide-react';
import { TestRun, RunItem, RunItemStatus, TestCase, TestSuite } from '../../../types/testManager';
import RichTextEditor from '../../../components/testManager/RichTextEditor';
import { getItemStatusColor } from './testRunUtils';

type OptimisticRunItemOverride = Pick<RunItem, 'status' | 'actualResult'>;

export interface ExecuteRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    testRun: TestRun | null;
    onUpdateItem: (itemId: string, status: RunItemStatus, actualResult?: string) => Promise<void>;
    onRefreshCurrentCase: (caseId: string) => Promise<void>;
    onComplete: () => Promise<void>;
    startIndex?: number;
    itemOrder?: number[];
    availableTestCases?: TestCase[];
    availableSuites?: TestSuite[];
}

const ExecuteRunModal: React.FC<ExecuteRunModalProps> = ({
    isOpen,
    onClose,
    testRun,
    onUpdateItem,
    onRefreshCurrentCase,
    onComplete,
    startIndex = 0,
    itemOrder,
    availableTestCases = [],
    availableSuites = [],
}) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [actualResult, setActualResult] = useState('');
    const [isRefreshingCase, setIsRefreshingCase] = useState(false);
    const [pendingSaveCount, setPendingSaveCount] = useState(0);
    const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, OptimisticRunItemOverride>>({});

    // Reset index when modal opens with a new startIndex
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(startIndex);
        }
    }, [isOpen, startIndex]);

    const orderedIndices = useMemo(() => {
        if (!testRun) return [];
        if (itemOrder && itemOrder.length > 0) {
            return itemOrder.filter((index) => index >= 0 && index < testRun.items.length);
        }
        return testRun.items.map((_, index) => index);
    }, [testRun, itemOrder]);

    const totalItems = orderedIndices.length;
    const activeItemIndex = totalItems > 0 ? orderedIndices[Math.min(currentIndex, totalItems - 1)] : 0;

    const displayedItems = useMemo(() => {
        if (!testRun) return [];

        return testRun.items.map((item) => {
            const override = optimisticOverrides[item.id];
            if (!override) return item;

            return {
                ...item,
                ...override,
            };
        });
    }, [testRun, optimisticOverrides]);

    useEffect(() => {
        if (currentIndex >= totalItems && totalItems > 0) {
            setCurrentIndex(totalItems - 1);
        }
    }, [currentIndex, totalItems]);

    useEffect(() => {
        if (displayedItems[activeItemIndex]) {
            setActualResult(displayedItems[activeItemIndex].actualResult || '');
        }
    }, [displayedItems, activeItemIndex]);

    useEffect(() => {
        if (!testRun) {
            setOptimisticOverrides({});
            return;
        }

        setOptimisticOverrides((currentOverrides) => {
            const nextOverrides = { ...currentOverrides };
            let hasChanges = false;

            testRun.items.forEach((item) => {
                const override = currentOverrides[item.id];
                if (!override) return;

                if (
                    item.status === override.status &&
                    (item.actualResult || '') === (override.actualResult || '')
                ) {
                    delete nextOverrides[item.id];
                    hasChanges = true;
                }
            });

            return hasChanges ? nextOverrides : currentOverrides;
        });
    }, [testRun]);

    const suiteNameById = useMemo(() => {
        const map = new Map<string, string>();
        availableSuites.forEach((suite) => map.set(suite.id, suite.name));
        return map;
    }, [availableSuites]);

    const testCaseById = useMemo(() => {
        const map = new Map<string, TestCase>();
        availableTestCases.forEach((testCase) => map.set(testCase.id, testCase));
        return map;
    }, [availableTestCases]);

    if (!isOpen || !testRun) return null;

    const currentItem = displayedItems[activeItemIndex];
    const executedCount = displayedItems.filter(i => i.status !== RunItemStatus.NotRun).length;

    const resolvedSuiteName = (() => {
        const itemCase = testCaseById.get(currentItem.caseId);
        if (itemCase?.suiteId) {
            return suiteNameById.get(itemCase.suiteId) || itemCase.suite || testRun.suiteName || '—';
        }
        return itemCase?.suite || testRun.suiteName || '—';
    })();

    const resolvedAreaName = currentItem.caseSnapshot.area || testCaseById.get(currentItem.caseId)?.area || '—';

    const handleStatusUpdate = async (status: RunItemStatus) => {
        const itemId = currentItem.id;
        const previousOverride = optimisticOverrides[itemId];

        setOptimisticOverrides((currentOverrides) => ({
            ...currentOverrides,
            [itemId]: {
                status,
                actualResult,
            },
        }));

        if (currentIndex < totalItems - 1) {
            setCurrentIndex(currentIndex + 1);
        }

        setPendingSaveCount((count) => count + 1);
        try {
            await onUpdateItem(itemId, status, actualResult);
        } catch (error: unknown) {
            setOptimisticOverrides((currentOverrides) => {
                const nextOverrides = { ...currentOverrides };

                if (previousOverride) {
                    nextOverrides[itemId] = previousOverride;
                } else {
                    delete nextOverrides[itemId];
                }

                return nextOverrides;
            });
            toast.error((error as Error).message || 'Failed to update status');
        } finally {
            setPendingSaveCount((count) => Math.max(0, count - 1));
        }
    };

    const handleComplete = async () => {
        try {
            await onComplete();
            toast.success('Test run completed!');
            onClose();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to complete run');
        }
    };

    const handleRefreshCurrentCase = async () => {
        setIsRefreshingCase(true);
        try {
            await onRefreshCurrentCase(currentItem.caseId);
            toast.success('Test case updated');
        } catch {
            // Parent handler already shows the failure toast.
        } finally {
            setIsRefreshingCase(false);
        }
    };

    const sourceTestCaseHref = `/test-manager/cases?testCaseId=${currentItem.caseId}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">{testRun.title}</h2>
                            {pendingSaveCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 sm:text-sm">
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    Saving
                                </span>
                            )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Progress: {executedCount} / {totalItems} ({Math.round((executedCount / totalItems) * 100)}%)
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 dark:bg-gray-700 flex">
                    {orderedIndices.map((itemIndex, idx) => {
                        const item = displayedItems[itemIndex];
                        return (
                        <div
                            key={item.id}
                            className={`flex-1 ${getItemStatusColor(item.status)} ${idx === currentIndex ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                            style={{ cursor: 'pointer' }}
                        />
                        );
                    })}
                </div>

                {/* Current item */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Case {currentIndex + 1} of {totalItems}
                            </span>
                            <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded ${getItemStatusColor(currentItem.status)} text-white`}>
                                {currentItem.status}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 max-w-[70%]">
                            <a
                                href={sourceTestCaseHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-md border border-gray-100 bg-gray-50 p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                                title="Open source test case in new tab"
                                aria-label="Open source test case in new tab"
                            >
                                <ArrowUpRight className="h-4 w-4" />
                            </a>
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 max-w-[180px] sm:max-w-[260px]">
                                <Layers className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                                <span className="truncate">Suite: {resolvedSuiteName}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 max-w-[180px] sm:max-w-[260px]">
                                <MapPin className="w-3.5 h-3.5 text-green-500 dark:text-green-400 flex-shrink-0" />
                                <span className="truncate">Area: {resolvedAreaName}</span>
                            </span>
                            <button
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 active:bg-gray-100 dark:active:bg-gray-700 rounded"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setCurrentIndex(Math.min(totalItems - 1, currentIndex + 1))}
                                disabled={currentIndex === totalItems - 1}
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 active:bg-gray-100 dark:active:bg-gray-700 rounded"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
                        <h3 className="min-w-0 flex-1 text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg">
                            {currentItem.caseSnapshot.title}
                        </h3>
                        <button
                            onClick={handleRefreshCurrentCase}
                            disabled={isRefreshingCase}
                            className="inline-flex items-center justify-center p-1 text-gray-400 transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-500 dark:hover:text-blue-400"
                            title="Reload latest test case data"
                            aria-label="Reload latest test case data"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshingCase ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {currentItem.caseSnapshot.testDescription && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{currentItem.caseSnapshot.testDescription}</p>
                        </div>
                    )}

                    {currentItem.caseSnapshot.stepsContent && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Steps</h4>
                            <RichTextEditor
                                content={currentItem.caseSnapshot.stepsContent}
                                onChange={() => {}}
                                editable={false}
                            />
                        </div>
                    )}

                    {currentItem.caseSnapshot.expectedResult && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Result</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{currentItem.caseSnapshot.expectedResult}</p>
                        </div>
                    )}

                    <div className="mb-0">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actual Result / Notes</h4>
                        <RichTextEditor
                            content={actualResult}
                            onChange={setActualResult}
                            placeholder="Enter actual result or notes..."
                            editable={true}
                        />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-t border-gray-100 dark:border-gray-700">
                    {/* Mobile: Stacked layout */}
                    <div className="sm:hidden flex flex-col gap-3">
                        {/* Status buttons grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Passed)}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-green-600 rounded-lg active:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Pass
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Failed)}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-red-600 rounded-lg active:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Fail
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Blocked)}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-orange-600 rounded-lg active:bg-orange-700 disabled:opacity-50"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Blocked
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Skipped)}
                                className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        {/* Complete button */}
                        <button
                            onClick={handleComplete}
                            disabled={executedCount < totalItems}
                            className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${executedCount < totalItems
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                    : 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 active:bg-blue-50 dark:active:bg-blue-900/30'
                                }`}
                            title={executedCount < totalItems ? "Please complete all test cases before finishing the run" : ""}
                        >
                            Complete Run
                        </button>
                    </div>

                    {/* Desktop: Horizontal layout */}
                    <div className="hidden sm:flex items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Passed)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Pass
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Failed)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Fail
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Blocked)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Blocked
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Skipped)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        <button
                            onClick={handleComplete}
                            disabled={executedCount < totalItems}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${executedCount < totalItems
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                    : 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 active:bg-blue-50 dark:active:bg-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                }`}
                            title={executedCount < totalItems ? "Please complete all test cases before finishing the run" : ""}
                        >
                            Complete Run
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecuteRunModal;
