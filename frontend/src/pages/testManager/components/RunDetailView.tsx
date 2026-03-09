import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import toast from 'react-hot-toast';
import { ArrowLeft, ChevronRight, Eye, Layers, Map as MapIcon, ChevronDown, ChevronUp, Check, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { TestRun, RunItemStatus, RunItem, TestCase, TestSuite } from '../../../types/testManager';
import {
    getRunStatusColor,
    getRunItemStatusBadgeColor,
    getPriorityColor,
    matchesRunItemSearch,
} from './testRunUtils';

export interface RunDetailViewProps {
    testRun: TestRun;
    onBack: () => void;
    onUpdateItem: (itemId: string, status: RunItemStatus, actualResult?: string) => Promise<void>;
    onComplete: () => Promise<void>;
    onOpenExecute: (itemIndex: number, itemOrder?: number[]) => void;
    availableTestCases?: TestCase[];
    availableSuites?: TestSuite[];
    searchQuery?: string;
}

const RunDetailView: React.FC<RunDetailViewProps> = ({
    testRun,
    onBack,
    onUpdateItem,
    onComplete,
    onOpenExecute,
    availableTestCases = [],
    availableSuites = [],
    searchQuery = '',
}) => {
    const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
    const [selectedSuiteFilter, setSelectedSuiteFilter] = useState<string>('all');
    const [selectedRunStatusFilter, setSelectedRunStatusFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<'none' | 'area' | 'priority' | 'runStatus' | 'suite'>('none');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isAreaOpen, setIsAreaOpen] = useState(false);
    const [isSuiteOpen, setIsSuiteOpen] = useState(false);
    const [isRunStatusOpen, setIsRunStatusOpen] = useState(false);
    const areaRef = useRef<HTMLDivElement>(null);
    const suiteRef = useRef<HTMLDivElement>(null);
    const runStatusRef = useRef<HTMLDivElement>(null);

    // Virtualization – desktop table
    const ROW_HEIGHT_ESTIMATE = 52;
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(600);

    // Virtualization – mobile cards
    const mobileScrollRef = useRef<HTMLDivElement>(null);

    const executedCount = testRun.items.filter(i => i.status !== RunItemStatus.NotRun).length;
    const totalItems = testRun.items.length;

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

    const itemSuiteNameByItemId = useMemo(() => {
        const map = new Map<string, string | null>();
        testRun.items.forEach((item) => {
            const snapshotSuiteName = item.caseSnapshot.suiteName?.trim();
            if (snapshotSuiteName) {
                map.set(item.id, snapshotSuiteName);
                return;
            }

            if (item.caseSnapshot.suiteId) {
                const snapshotSuite = suiteNameById.get(item.caseSnapshot.suiteId);
                if (snapshotSuite) {
                    map.set(item.id, snapshotSuite);
                    return;
                }
            }

            const itemCase = testCaseById.get(item.caseId);
            if (itemCase?.suiteId) {
                map.set(item.id, suiteNameById.get(itemCase.suiteId) || itemCase.suite || null);
                return;
            }
            if (itemCase?.suite) {
                map.set(item.id, itemCase.suite);
                return;
            }
            map.set(item.id, testRun.suiteName || null);
        });
        return map;
    }, [testRun.items, testCaseById, suiteNameById, testRun.suiteName]);

    const suiteOptions = useMemo(() => {
        const suites = new Set<string>();
        testRun.items.forEach((item) => {
            const suiteName = itemSuiteNameByItemId.get(item.id) || null;
            if (suiteName) suites.add(suiteName);
        });
        return Array.from(suites).sort((a, b) => a.localeCompare(b));
    }, [testRun.items, itemSuiteNameByItemId]);

    const areaOptions = useMemo(() => {
        const areas = new Set<string>();
        testRun.items.forEach((item) => {
            const area = item.caseSnapshot.area?.trim();
            if (area) areas.add(area);
        });
        return Array.from(areas).sort((a, b) => a.localeCompare(b));
    }, [testRun.items]);

    const runStatusOptions = useMemo(
        () => Object.values(RunItemStatus),
        []
    );

    const filteredItems = useMemo(() => {
        return testRun.items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => {
                const suiteName = itemSuiteNameByItemId.get(item.id) || null;
                const matchesSearch = matchesRunItemSearch(item, searchQuery, suiteName);
                if (!matchesSearch) return false;

                const matchesArea = selectedAreaFilter === 'all' || (item.caseSnapshot.area || '') === selectedAreaFilter;
                if (!matchesArea) return false;

                const matchesRunStatus = selectedRunStatusFilter === 'all' || item.status === selectedRunStatusFilter;
                if (!matchesRunStatus) return false;

                if (selectedSuiteFilter === 'all') return true;
                return suiteName === selectedSuiteFilter;
            });
    }, [testRun.items, searchQuery, selectedAreaFilter, selectedRunStatusFilter, selectedSuiteFilter, itemSuiteNameByItemId]);

    const noResultsMessage = searchQuery.trim()
        ? 'No test cases match the current search or filters.'
        : 'No test cases match the selected filters.';

    const sortedItems = useMemo(() => {
        if (sortField === 'none') return filteredItems;

        const priorityRank: Record<string, number> = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4,
        };

        const statusRank: Record<RunItemStatus, number> = {
            [RunItemStatus.NotRun]: 1,
            [RunItemStatus.Passed]: 2,
            [RunItemStatus.Failed]: 3,
            [RunItemStatus.Blocked]: 4,
            [RunItemStatus.Skipped]: 5,
        };

        return [...filteredItems].sort((left, right) => {
            let compareValue = 0;

            if (sortField === 'area') {
                const leftArea = (left.item.caseSnapshot.area || '').trim();
                const rightArea = (right.item.caseSnapshot.area || '').trim();
                compareValue = leftArea.localeCompare(rightArea);
            } else if (sortField === 'priority') {
                const leftPriority = (left.item.caseSnapshot.priority || '').toLowerCase();
                const rightPriority = (right.item.caseSnapshot.priority || '').toLowerCase();
                const leftValue = priorityRank[leftPriority] ?? 99;
                const rightValue = priorityRank[rightPriority] ?? 99;
                compareValue = leftValue !== rightValue
                    ? leftValue - rightValue
                    : leftPriority.localeCompare(rightPriority);
            } else if (sortField === 'suite') {
                const leftSuite = itemSuiteNameByItemId.get(left.item.id) || '';
                const rightSuite = itemSuiteNameByItemId.get(right.item.id) || '';
                compareValue = leftSuite.localeCompare(rightSuite);
            } else {
                compareValue = statusRank[left.item.status] - statusRank[right.item.status];
            }

            return sortDirection === 'asc' ? compareValue : -compareValue;
        });
    }, [filteredItems, sortField, sortDirection, itemSuiteNameByItemId]);

    const sortedItemOrder = useMemo(() => {
        return sortedItems.map(({ index }) => index);
    }, [sortedItems]);

    // Dynamically size the desktop virtual container to fill available space
    useEffect(() => {
        const el = tableScrollRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const h = entry.contentRect.height;
                if (h > 0) setContainerHeight(h);
            }
        });
        if (el.parentElement) observer.observe(el.parentElement);
        return () => observer.disconnect();
    }, []);

    const rowVirtualizer = useVirtualizer({
        count: sortedItems.length,
        getScrollElement: () => tableScrollRef.current,
        estimateSize: () => ROW_HEIGHT_ESTIMATE,
        overscan: 10,
    });

    const mobileVirtualizer = useVirtualizer({
        count: sortedItems.length,
        getScrollElement: () => mobileScrollRef.current,
        estimateSize: () => 160,
        overscan: 5,
    });

    const handleSortClick = (field: 'area' | 'priority' | 'runStatus' | 'suite') => {
        if (sortField !== field) {
            setSortField(field);
            setSortDirection('asc');
            return;
        }

        if (sortDirection === 'asc') {
            setSortDirection('desc');
            return;
        }

        setSortField('none');
        setSortDirection('asc');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suiteRef.current && !suiteRef.current.contains(event.target as Node)) {
                setIsSuiteOpen(false);
            }
            if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
                setIsAreaOpen(false);
            }
            if (runStatusRef.current && !runStatusRef.current.contains(event.target as Node)) {
                setIsRunStatusOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setSelectedAreaFilter('all');
        setSelectedSuiteFilter('all');
        setSelectedRunStatusFilter('all');
        setSortField('none');
        setSortDirection('asc');
    }, [testRun.id]);

    const handleStatusChange = async (item: RunItem, newStatus: RunItemStatus) => {
        try {
            await onUpdateItem(item.id, newStatus, item.actualResult);
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to update status');
        }
    };

    const handleComplete = async () => {
        try {
            await onComplete();
            toast.success('Test run completed!');
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to complete run');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onBack}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                        title="Back to runs"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{testRun.title}</h2>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative" ref={suiteRef}>
                                    <button
                                        onClick={() => setIsSuiteOpen(!isSuiteOpen)}
                                        title={selectedSuiteFilter === 'all' ? 'All Suites' : selectedSuiteFilter}
                                        className={`flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded-md transition-all ${selectedSuiteFilter !== 'all'
                                            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <Layers size={14} className={selectedSuiteFilter !== 'all' ? 'text-purple-500 dark:text-purple-400 flex-shrink-0' : 'text-gray-400 dark:text-gray-500 flex-shrink-0'} />
                                        <span className="max-w-[120px] truncate">{selectedSuiteFilter === 'all' ? 'All Suites' : selectedSuiteFilter}</span>
                                        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-400 transition-transform flex-shrink-0 ${isSuiteOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isSuiteOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-56 sm:w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filter by Suite</p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setSelectedSuiteFilter('all');
                                                    setIsSuiteOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedSuiteFilter === 'all' ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                <Layers size={14} className={selectedSuiteFilter === 'all' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                                                <span className="flex-1">All Suites</span>
                                                {selectedSuiteFilter === 'all' && <Check size={14} />}
                                            </button>

                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                                            <div className="max-h-64 overflow-y-auto">
                                                {suiteOptions.map((suite) => (
                                                    <button
                                                        key={suite}
                                                        onClick={() => {
                                                            setSelectedSuiteFilter(suite);
                                                            setIsSuiteOpen(false);
                                                        }}
                                                        title={suite}
                                                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedSuiteFilter === suite ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                                    >
                                                        <Layers size={14} className={selectedSuiteFilter === suite ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'} />
                                                        <span className="truncate flex-1">{suite}</span>
                                                        {selectedSuiteFilter === suite && <Check size={14} />}
                                                    </button>
                                                ))}
                                                {suiteOptions.length === 0 && (
                                                    <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">No suites found</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="relative" ref={areaRef}>
                                    <button
                                        onClick={() => setIsAreaOpen(!isAreaOpen)}
                                        title={selectedAreaFilter === 'all' ? 'All Areas' : selectedAreaFilter}
                                        className={`flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded-md transition-all ${selectedAreaFilter !== 'all'
                                            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <MapIcon size={14} className={selectedAreaFilter !== 'all' ? 'text-green-500 dark:text-green-400 flex-shrink-0' : 'text-gray-400 dark:text-gray-500 flex-shrink-0'} />
                                        <span className="max-w-[120px] truncate">{selectedAreaFilter === 'all' ? 'All Areas' : selectedAreaFilter}</span>
                                        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-400 transition-transform flex-shrink-0 ${isAreaOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isAreaOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-56 sm:w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filter by Area</p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setSelectedAreaFilter('all');
                                                    setIsAreaOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedAreaFilter === 'all' ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                <MapIcon size={14} className={selectedAreaFilter === 'all' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                                                <span className="flex-1">All Areas</span>
                                                {selectedAreaFilter === 'all' && <Check size={14} />}
                                            </button>

                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                                            <div className="max-h-64 overflow-y-auto">
                                                {areaOptions.map((area) => (
                                                    <button
                                                        key={area}
                                                        onClick={() => {
                                                            setSelectedAreaFilter(area);
                                                            setIsAreaOpen(false);
                                                        }}
                                                        title={area}
                                                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedAreaFilter === area ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                                    >
                                                        <MapIcon size={14} className={selectedAreaFilter === area ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'} />
                                                        <span className="truncate flex-1">{area}</span>
                                                        {selectedAreaFilter === area && <Check size={14} />}
                                                    </button>
                                                ))}
                                                {areaOptions.length === 0 && (
                                                    <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">No areas found</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="relative" ref={runStatusRef}>
                                    <button
                                        onClick={() => setIsRunStatusOpen(!isRunStatusOpen)}
                                        title={selectedRunStatusFilter === 'all' ? 'All Run Statuses' : selectedRunStatusFilter}
                                        className={`flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded-md transition-all ${selectedRunStatusFilter !== 'all'
                                            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <CheckCircle2 size={14} className={selectedRunStatusFilter !== 'all' ? 'text-blue-500 dark:text-blue-400 flex-shrink-0' : 'text-gray-400 dark:text-gray-500 flex-shrink-0'} />
                                        <span className="max-w-[140px] truncate">{selectedRunStatusFilter === 'all' ? 'All Statuses' : selectedRunStatusFilter}</span>
                                        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-400 transition-transform flex-shrink-0 ${isRunStatusOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isRunStatusOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-56 sm:w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filter by Run Status</p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setSelectedRunStatusFilter('all');
                                                    setIsRunStatusOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedRunStatusFilter === 'all' ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                <CheckCircle2 size={14} className={selectedRunStatusFilter === 'all' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                                                <span className="flex-1">All Statuses</span>
                                                {selectedRunStatusFilter === 'all' && <Check size={14} />}
                                            </button>

                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                                            <div className="max-h-64 overflow-y-auto">
                                                {runStatusOptions.map((status) => (
                                                    <button
                                                        key={status}
                                                        onClick={() => {
                                                            setSelectedRunStatusFilter(status);
                                                            setIsRunStatusOpen(false);
                                                        }}
                                                        title={status}
                                                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedRunStatusFilter === status ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                                    >
                                                        <span className={`inline-flex min-w-[72px] justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getRunItemStatusBadgeColor(status)}`}>
                                                            {status}
                                                        </span>
                                                        <span className="truncate flex-1">{status}</span>
                                                        {selectedRunStatusFilter === status && <Check size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRunStatusColor(testRun.status)}`}>
                                {testRun.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>{executedCount} / {totalItems} executed ({totalItems > 0 ? Math.round((executedCount / totalItems) * 100) : 0}%)</span>
                            <span>{testRun.resultsSummary.passRate}% pass rate</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleComplete}
                        disabled={executedCount < totalItems}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                            executedCount < totalItems
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                : 'text-white bg-blue-600 hover:bg-blue-700'
                        }`}
                        title={executedCount < totalItems ? 'Complete all test cases first' : 'Complete Run'}
                    >
                        Complete Run
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 dark:bg-gray-700 flex flex-shrink-0">
                {testRun.resultsSummary.passed > 0 && (
                    <div className="bg-green-500" style={{ width: `${(testRun.resultsSummary.passed / totalItems) * 100}%` }} />
                )}
                {testRun.resultsSummary.failed > 0 && (
                    <div className="bg-red-500" style={{ width: `${(testRun.resultsSummary.failed / totalItems) * 100}%` }} />
                )}
                {testRun.resultsSummary.blocked > 0 && (
                    <div className="bg-orange-500" style={{ width: `${(testRun.resultsSummary.blocked / totalItems) * 100}%` }} />
                )}
                {testRun.resultsSummary.skipped > 0 && (
                    <div className="bg-gray-400 dark:bg-gray-500" style={{ width: `${(testRun.resultsSummary.skipped / totalItems) * 100}%` }} />
                )}
            </div>

            {/* Desktop table – virtualized */}
            <div
                ref={tableScrollRef}
                className="hidden sm:block flex-1"
                style={{ height: containerHeight, overflowY: 'auto' }}
            >
                {sortedItems.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        {noResultsMessage}
                    </div>
                ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none">
                        <tr>
                            <th className="py-2 pl-6 pr-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-12">#</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-1/4">Title</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-32">
                                <button
                                    type="button"
                                    onClick={() => handleSortClick('priority')}
                                    className="inline-flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <span>Priority</span>
                                    {sortField !== 'priority' ? (
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    ) : sortDirection === 'asc' ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            </th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-40">
                                <button
                                    type="button"
                                    onClick={() => handleSortClick('runStatus')}
                                    className="inline-flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <span>Run Status</span>
                                    {sortField !== 'runStatus' ? (
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    ) : sortDirection === 'asc' ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            </th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-48">
                                <button
                                    type="button"
                                    onClick={() => handleSortClick('suite')}
                                    className="inline-flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <span>Suite</span>
                                    {sortField !== 'suite' ? (
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    ) : sortDirection === 'asc' ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            </th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-40">
                                <button
                                    type="button"
                                    onClick={() => handleSortClick('area')}
                                    className="inline-flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <span>Area</span>
                                    {sortField !== 'area' ? (
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    ) : sortDirection === 'asc' ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            </th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-24"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                        {rowVirtualizer.getVirtualItems().length > 0 && (
                            <tr aria-hidden="true">
                                <td colSpan={7} style={{ height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0, padding: 0, border: 'none' }} />
                            </tr>
                        )}
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const { item, index } = sortedItems[virtualRow.index];
                            const sortedIndex = virtualRow.index;
                            return (
                            <tr
                                key={item.id}
                                onClick={() => onOpenExecute(sortedIndex, sortedItemOrder)}
                                className="group transition-colors cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
                            >
                                {/* Order */}
                                <td className="py-2.5 pl-6 pr-4 text-sm font-medium text-gray-400 dark:text-gray-500 font-mono tracking-tight group-hover:text-gray-900 dark:group-hover:text-gray-200">
                                    {index + 1}
                                </td>

                                {/* Title */}
                                <td className="py-2.5 px-4">
                                    <div className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{item.caseSnapshot.title}</div>
                                    {item.caseSnapshot.testDescription && (
                                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-md">
                                            {item.caseSnapshot.testDescription}
                                        </div>
                                    )}
                                </td>

                                {/* Priority */}
                                <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(item.caseSnapshot.priority)} shadow-sm`} />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.caseSnapshot.priority || 'N/A'}</span>
                                    </div>
                                </td>

                                {/* Run Status Dropdown */}
                                <td className="py-2.5 px-4">
                                    <div onClick={e => e.stopPropagation()}>
                                        <select
                                            value={item.status}
                                            onChange={(e) => handleStatusChange(item, e.target.value as RunItemStatus)}
                                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border appearance-none cursor-pointer outline-none transition-colors text-center min-w-[90px] ${getRunItemStatusBadgeColor(item.status)}`}
                                        >
                                            <option value={RunItemStatus.NotRun}>Not Run</option>
                                            <option value={RunItemStatus.Passed}>Passed</option>
                                            <option value={RunItemStatus.Failed}>Failed</option>
                                            <option value={RunItemStatus.Blocked}>Blocked</option>
                                            <option value={RunItemStatus.Skipped}>Skipped</option>
                                        </select>
                                    </div>
                                </td>

                                {/* Suite */}
                                <td className="py-2.5 px-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[220px]" title={itemSuiteNameByItemId.get(item.id) || '—'}>
                                        {itemSuiteNameByItemId.get(item.id) || '—'}
                                    </div>
                                </td>

                                {/* Area */}
                                <td className="py-2.5 px-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {item.caseSnapshot.area || '—'}
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="py-2.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenExecute(sortedIndex, sortedItemOrder);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Execute Test Case"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                        {(() => {
                            const visibleRows = rowVirtualizer.getVirtualItems();
                            const lastVisibleRow = visibleRows[visibleRows.length - 1];
                            const bottomPad = lastVisibleRow
                                ? rowVirtualizer.getTotalSize() - lastVisibleRow.end
                                : 0;
                            return bottomPad > 0 ? (
                                <tr aria-hidden="true">
                                    <td colSpan={7} style={{ height: bottomPad, padding: 0, border: 'none' }} />
                                </tr>
                            ) : null;
                        })()}
                    </tbody>
                </table>
                )}
            </div>

            {/* Mobile list – virtualized */}
            <div
                ref={mobileScrollRef}
                className="block sm:hidden flex-1 overflow-auto"
                style={{ padding: '0.5rem' }}
            >
                {sortedItems.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        {noResultsMessage}
                    </div>
                ) : (
                    <div style={{ height: mobileVirtualizer.getTotalSize(), position: 'relative' }}>
                        {mobileVirtualizer.getVirtualItems().map((virtualRow) => {
                            const { item, index } = sortedItems[virtualRow.index];
                            const sortedIndex = virtualRow.index;
                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    ref={mobileVirtualizer.measureElement}
                                    data-index={virtualRow.index}
                                >
                                    <div
                                        onClick={() => onOpenExecute(sortedIndex, sortedItemOrder)}
                                        className="relative mac-card overflow-hidden cursor-pointer transition-all active:scale-[0.98] mb-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/80"
                                    >
                                        {/* Priority Color Bar */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(item.caseSnapshot.priority)}`} />

                                        <div className="p-4 pl-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    {/* Top Row: Status & Index */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRunItemStatusBadgeColor(item.status)}`}>
                                                            {item.status}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                            #{index + 1}
                                                        </span>
                                                    </div>

                                                    {/* Title */}
                                                    <h4 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                                                        {item.caseSnapshot.title}
                                                    </h4>

                                                    {/* Area */}
                                                    {item.caseSnapshot.area && (
                                                        <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {item.caseSnapshot.area}
                                                        </div>
                                                    )}

                                                    {!!itemSuiteNameByItemId.get(item.id) && (
                                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {itemSuiteNameByItemId.get(item.id)}
                                                        </div>
                                                    )}

                                                    {/* Footer: Priority & Status change */}
                                                    <div className="mt-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(item.caseSnapshot.priority)} shadow-sm`} />
                                                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                                {item.caseSnapshot.priority || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div onClick={e => e.stopPropagation()}>
                                                            <select
                                                                value={item.status}
                                                                onChange={(e) => handleStatusChange(item, e.target.value as RunItemStatus)}
                                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border appearance-none cursor-pointer outline-none transition-colors min-w-[80px] ${getRunItemStatusBadgeColor(item.status)}`}
                                                            >
                                                                <option value={RunItemStatus.NotRun}>Not Run</option>
                                                                <option value={RunItemStatus.Passed}>Passed</option>
                                                                <option value={RunItemStatus.Failed}>Failed</option>
                                                                <option value={RunItemStatus.Blocked}>Blocked</option>
                                                                <option value={RunItemStatus.Skipped}>Skipped</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RunDetailView;
