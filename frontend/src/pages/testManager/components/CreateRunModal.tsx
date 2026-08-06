import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import toast from 'react-hot-toast';
import { TestCase, TestRunGroup } from '../../../types/testManager';
import TagInput from '../../../components/testManager/TagInput';
import { getIndentedGroupOptions } from './testRunUtils';
import {
    X,
    Search,
    ChevronDown,
    ChevronRight,
    CheckSquare,
    Square,
    MinusSquare,
    Layers,
} from 'lucide-react';

export interface CreateRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (title: string, description: string, caseIds: string[], groupId?: string, tags?: string[], environment?: string, team?: string, buildVersion?: string) => Promise<void>;
    testCases: TestCase[];
    testSuites: { id: string; name: string }[];
    testRunGroups: TestRunGroup[];
    tagSuggestions: string[];
    initialTitle?: string;
    initialGroupId?: string;
    initialSelectedCaseIds?: string[];
    initialEnvironment?: string;
    initialTeam?: string;
    initialBuildVersion?: string;
    teamSuggestions?: string[];
}

type SelectionTab = 'suite' | 'area' | 'individual';

const FILTER_CHIP_BASE = 'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer';
const FILTER_CHIP_ACTIVE = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700';
const FILTER_CHIP_INACTIVE = 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600';

const TAB_BASE = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors';
const TAB_ACTIVE = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
const TAB_INACTIVE = 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700';

const RowCheckbox: React.FC<{ checked: boolean; indeterminate?: boolean; onChange: () => void; label?: string }> = ({ checked, indeterminate, onChange, label }) => (
    <label className="inline-flex items-center gap-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); onChange(); }}>
        {indeterminate ? (
            <MinusSquare className="w-4 h-4 text-blue-600" />
        ) : checked ? (
            <CheckSquare className="w-4 h-4 text-blue-600" />
        ) : (
            <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        )}
        {label && <span className="text-sm">{label}</span>}
    </label>
);

const CreateRunModal: React.FC<CreateRunModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    testCases,
    testSuites,
    testRunGroups,
    tagSuggestions,
    initialTitle,
    initialGroupId,
    initialSelectedCaseIds,
    initialEnvironment,
    initialTeam,
    initialBuildVersion,
    teamSuggestions,
}) => {
    const [title, setTitle] = useState(initialTitle ?? '');
    const [description, setDescription] = useState('');
    const [environment, setEnvironment] = useState(initialEnvironment ?? '');
    const [team, setTeam] = useState(initialTeam ?? '');
    const [buildVersion, setBuildVersion] = useState(initialBuildVersion ?? '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<SelectionTab>('suite');

    const [selectedIds, setSelectedIds] = useState<string[]>(() => initialSelectedCaseIds ?? []);

    const [suiteFilters, setSuiteFilters] = useState<Set<string>>(new Set());
    const [areaFilters, setAreaFilters] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
    const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

    const [showSummaryPopover, setShowSummaryPopover] = useState(false);
    const summaryPopoverRef = useRef<HTMLDivElement>(null);
    const caseListRef = useRef<HTMLDivElement>(null);
    const summaryBtnRef = useRef<HTMLButtonElement>(null);

    const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    useEffect(() => {
        if (isOpen) {
            setTitle(initialTitle ?? '');
            setSelectedIds(initialSelectedCaseIds ?? []);
            setEnvironment(initialEnvironment ?? '');
            setTeam(initialTeam ?? '');
            setBuildVersion(initialBuildVersion ?? '');
            if (initialGroupId && testRunGroups.some(g => g.id === initialGroupId)) {
                setSelectedGroupId(initialGroupId);
            } else {
                setSelectedGroupId('');
            }
            setActiveTab('suite');
            setSuiteFilters(new Set());
            setAreaFilters(new Set());
            setSearchQuery('');
            setExpandedSuites(new Set());
            setExpandedAreas(new Set());
            setShowSummaryPopover(false);
        } else {
            setDescription('');
            setTags([]);
            setSelectedIds([]);
            setSuiteFilters(new Set());
            setAreaFilters(new Set());
            setSearchQuery('');
            setExpandedSuites(new Set());
            setExpandedAreas(new Set());
            setShowSummaryPopover(false);
        }
    }, [isOpen, initialTitle, initialGroupId, testRunGroups, initialSelectedCaseIds, initialEnvironment, initialTeam, initialBuildVersion]);

    useEffect(() => {
        if (!showSummaryPopover) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                summaryPopoverRef.current &&
                !summaryPopoverRef.current.contains(e.target as Node) &&
                summaryBtnRef.current &&
                !summaryBtnRef.current.contains(e.target as Node)
            ) {
                setShowSummaryPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSummaryPopover]);

    const availableAreas = useMemo(() =>
        Array.from(new Set(testCases.map(tc => tc.area || '').filter(Boolean))).sort(),
        [testCases]
    );

    const suiteFilteredCases = useMemo(() => {
        if (suiteFilters.size === 0) return testCases;
        return testCases.filter(tc => tc.suiteId && suiteFilters.has(tc.suiteId));
    }, [testCases, suiteFilters]);

    const areaFilteredCases = useMemo(() => {
        if (areaFilters.size === 0) return suiteFilteredCases;
        return suiteFilteredCases.filter(tc => tc.area && areaFilters.has(tc.area));
    }, [suiteFilteredCases, areaFilters]);

    const searchedCases = useMemo(() => {
        if (!searchQuery.trim()) return areaFilteredCases;
        const q = searchQuery.toLowerCase().trim();
        return areaFilteredCases.filter(tc =>
            tc.title.toLowerCase().includes(q) ||
            (tc.area || '').toLowerCase().includes(q) ||
            (tc.suite || '').toLowerCase().includes(q) ||
            (tc.priority || '').toLowerCase().includes(q)
        );
    }, [areaFilteredCases, searchQuery]);

    const allFilteredSelected = searchedCases.length > 0 && searchedCases.every(tc => selectedIdsSet.has(tc.id));

    const suitesWithSelection = useMemo(() =>
        testSuites.map(suite => {
            const cases = testCases.filter(tc => tc.suiteId === suite.id);
            const selectedCount = cases.filter(tc => selectedIdsSet.has(tc.id)).length;
            let state: 'none' | 'all' | 'partial' = 'none';
            if (selectedCount === 0) state = 'none';
            else if (selectedCount === cases.length) state = 'all';
            else state = 'partial';
            return { ...suite, cases, selectedCount, totalCount: cases.length, state };
        }).filter(s => s.totalCount > 0),
        [testSuites, testCases, selectedIdsSet]
    );

    const areasWithSelection = useMemo(() =>
        availableAreas.map(area => {
            const cases = testCases.filter(tc => (tc.area || '') === area);
            const selectedCount = cases.filter(tc => selectedIdsSet.has(tc.id)).length;
            let state: 'none' | 'all' | 'partial' = 'none';
            if (selectedCount === 0) state = 'none';
            else if (selectedCount === cases.length) state = 'all';
            else state = 'partial';
            return { name: area, cases, selectedCount, totalCount: cases.length, state };
        }).filter(a => a.totalCount > 0),
        [availableAreas, testCases, selectedIdsSet]
    );

    const selectedCases = useMemo(() =>
        testCases.filter(tc => selectedIdsSet.has(tc.id)),
        [testCases, selectedIdsSet]
    );

    const selectionBySuite = useMemo(() => {
        const map = new Map<string, TestCase[]>();
        for (const tc of selectedCases) {
            const key = tc.suite || 'Unknown';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(tc);
        }
        return map;
    }, [selectedCases]);


    // Virtual list for individual tab
    const caseVirtualizer = useVirtualizer({
        count: searchedCases.length,
        getScrollElement: () => caseListRef.current,
        estimateSize: () => 58,
        overscan: 8,
    });

    const toggleCase = useCallback((caseId: string) => {
        setSelectedIds(prev =>
            prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
        );
    }, []);

    const toggleSuiteSelection = useCallback((_suiteId: string, cases: TestCase[]) => {
        setSelectedIds(prev => {
            const prevSet = new Set(prev);
            const caseIds = cases.map(tc => tc.id);
            const allSelected = caseIds.every(id => prevSet.has(id));
            if (allSelected) {
                return prev.filter(id => !caseIds.includes(id));
            } else {
                for (const id of caseIds) prevSet.add(id);
                return Array.from(prevSet);
            }
        });
    }, []);

    const toggleAreaSelection = useCallback((_areaName: string, cases: TestCase[]) => {
        setSelectedIds(prev => {
            const prevSet = new Set(prev);
            const caseIds = cases.map(tc => tc.id);
            const allSelected = caseIds.every(id => prevSet.has(id));
            if (allSelected) {
                return prev.filter(id => !caseIds.includes(id));
            } else {
                for (const id of caseIds) prevSet.add(id);
                return Array.from(prevSet);
            }
        });
    }, []);

    const toggleSuiteFilter = (suiteId: string) => {
        setSuiteFilters(prev => {
            const next = new Set(prev);
            if (next.has(suiteId)) next.delete(suiteId);
            else next.add(suiteId);
            return next;
        });
    };

    const toggleAreaFilter = (areaName: string) => {
        setAreaFilters(prev => {
            const next = new Set(prev);
            if (next.has(areaName)) next.delete(areaName);
            else next.add(areaName);
            return next;
        });
    };

    const clearFilters = () => {
        setSuiteFilters(new Set());
        setAreaFilters(new Set());
        setSearchQuery('');
    };

    const selectAllFiltered = () => {
        setSelectedIds(prev => {
            const set = new Set(prev);
            for (const tc of searchedCases) set.add(tc.id);
            return Array.from(set);
        });
    };

    const deselectAllFiltered = () => {
        const filteredIds = new Set(searchedCases.map(tc => tc.id));
        setSelectedIds(prev => prev.filter(id => !filteredIds.has(id)));
    };

    const clearAllSelection = () => {
        setSelectedIds([]);
    };

    const toggleExpandSuite = (suiteId: string) => {
        setExpandedSuites(prev => {
            const next = new Set(prev);
            if (next.has(suiteId)) next.delete(suiteId);
            else next.add(suiteId);
            return next;
        });
    };

    const toggleExpandArea = (areaName: string) => {
        setExpandedAreas(prev => {
            const next = new Set(prev);
            if (next.has(areaName)) next.delete(areaName);
            else next.add(areaName);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('Please enter a title');
            return;
        }
        if (selectedIds.length === 0) {
            toast.error('Please select at least one test case');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(title, description, selectedIds, selectedGroupId || undefined, tags.length > 0 ? tags : undefined, environment.trim() || undefined, team.trim() || undefined, buildVersion.trim() || undefined);
            setTitle(initialTitle ?? '');
            setDescription('');
            setSelectedGroupId('');
            setTags([]);
            setSelectedIds([]);
            setEnvironment('');
            setTeam('');
            setBuildVersion('');
            onClose();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to create test run');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const renderFilterChips = () => (
        <div className="space-y-2">
            {testSuites.length > 0 && (
                <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Suites</label>
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            onClick={() => setSuiteFilters(new Set())}
                            className={`${FILTER_CHIP_BASE} ${suiteFilters.size === 0 ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
                        >
                            All
                        </button>
                        {testSuites.map(suite => (
                            <button
                                key={suite.id}
                                onClick={() => toggleSuiteFilter(suite.id)}
                                className={`${FILTER_CHIP_BASE} ${suiteFilters.has(suite.id) ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
                            >
                                {suite.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {availableAreas.length > 0 && (
                <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Areas / Pages</label>
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            onClick={() => setAreaFilters(new Set())}
                            className={`${FILTER_CHIP_BASE} ${areaFilters.size === 0 ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
                        >
                            All
                        </button>
                        {availableAreas.map(area => (
                            <button
                                key={area}
                                onClick={() => toggleAreaFilter(area)}
                                className={`${FILTER_CHIP_BASE} ${areaFilters.has(area) ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
                            >
                                {area}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderIndividualTab = () => (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search test cases..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            {renderFilterChips()}
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                    {suiteFilters.size > 0 || areaFilters.size > 0 || searchQuery.trim() ? (
                        <>{searchedCases.length} matching {(suiteFilters.size > 0 || areaFilters.size > 0) && (
                            <button onClick={clearFilters} className="text-blue-600 dark:text-blue-400 hover:underline ml-1">Clear filters</button>
                        )}</>
                    ) : (
                        <>{testCases.length} total</>
                    )}
                </span>
                {searchedCases.length > 0 && (
                    <button
                        onClick={allFilteredSelected ? deselectAllFiltered : selectAllFiltered}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                        {allFilteredSelected ? 'Deselect All' : 'Select All'}
                    </button>
                )}
            </div>
            <div
                ref={caseListRef}
                className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800/50"
            >
                {searchedCases.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery.trim() ? 'No test cases match your search' : 'No test cases available'}
                    </div>
                ) : (
                    <div
                        style={{
                            height: `${caseVirtualizer.getTotalSize()}px`,
                            position: 'relative',
                            width: '100%',
                        }}
                    >
                        {caseVirtualizer.getVirtualItems().map(virtualRow => {
                            const tc = searchedCases[virtualRow.index];
                            if (!tc) return null;
                            return (
                                <label
                                    key={tc.id}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors absolute left-0 right-0"
                                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIdsSet.has(tc.id)}
                                        onChange={() => toggleCase(tc.id)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tc.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <span>{tc.suite}</span>
                                            {tc.area && <><span>·</span><span>{tc.area}</span></>}
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                tc.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                tc.priority === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                                tc.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                {tc.priority}
                                            </span>
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    const renderSuiteTab = () => (
        <div className="space-y-1 max-h-80 overflow-y-auto">
            {suitesWithSelection.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">No test suites available</div>
            ) : (
                suitesWithSelection.map(suite => {
                    const isExpanded = expandedSuites.has(suite.id);
                    return (
                        <div key={suite.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                <div onClick={() => toggleSuiteSelection(suite.id, suite.cases)} className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                    <RowCheckbox
                                        checked={suite.state === 'all'}
                                        indeterminate={suite.state === 'partial'}
                                        onChange={() => toggleSuiteSelection(suite.id, suite.cases)}
                                    />
                                    <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{suite.name}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {suite.selectedCount}/{suite.totalCount} selected
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleExpandSuite(suite.id)}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                            </div>
                            {isExpanded && (
                                <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
                                    {suite.cases.map(tc => (
                                        <label
                                            key={tc.id}
                                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedIdsSet.has(tc.id)}
                                                onChange={() => toggleCase(tc.id)}
                                                className="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                                            />
                                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{tc.title}</span>
                                            {tc.area && <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">({tc.area})</span>}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    const renderAreaTab = () => (
        <div className="space-y-1 max-h-80 overflow-y-auto">
            {areasWithSelection.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">No areas available</div>
            ) : (
                areasWithSelection.map(area => {
                    const isExpanded = expandedAreas.has(area.name);
                    return (
                        <div key={area.name} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                <div onClick={() => toggleAreaSelection(area.name, area.cases)} className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                    <RowCheckbox
                                        checked={area.state === 'all'}
                                        indeterminate={area.state === 'partial'}
                                        onChange={() => toggleAreaSelection(area.name, area.cases)}
                                    />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{area.name}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {area.selectedCount}/{area.totalCount} selected
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleExpandArea(area.name)}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                            </div>
                            {isExpanded && (
                                <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
                                    {area.cases.map(tc => (
                                        <label
                                            key={tc.id}
                                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedIdsSet.has(tc.id)}
                                                onChange={() => toggleCase(tc.id)}
                                                className="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                                            />
                                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{tc.title}</span>
                                            {tc.suite && <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">({tc.suite})</span>}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    const renderSummaryBar = () => {
        if (selectedIds.length === 0) return null;

        const suiteParts: string[] = [];
        const fullSuiteCount = suitesWithSelection.filter(s => s.state === 'all').length;
        if (fullSuiteCount > 0) suiteParts.push(`${fullSuiteCount} suite${fullSuiteCount > 1 ? 's' : ''}`);
        const partialSuiteCount = suitesWithSelection.filter(s => s.state === 'partial').length;
        if (partialSuiteCount > 0) suiteParts.push(`${partialSuiteCount} suite${partialSuiteCount > 1 ? 's' : ''} (partial)`);

        const areaParts: string[] = [];
        const fullAreaCount = areasWithSelection.filter(a => a.state === 'all').length;
        if (fullAreaCount > 0) areaParts.push(`${fullAreaCount} area${fullAreaCount > 1 ? 's' : ''}`);
        const partialAreaCount = areasWithSelection.filter(a => a.state === 'partial').length;
        if (partialAreaCount > 0) areaParts.push(`${partialAreaCount} area${partialAreaCount > 1 ? 's' : ''} (partial)`);

        const breakdownParts: string[] = [];
        if (suiteParts.length > 0) breakdownParts.push(suiteParts.join(', '));
        if (areaParts.length > 0) breakdownParts.push(areaParts.join(', '));

        return (
            <div className="relative">
                {showSummaryPopover && (
                    <div
                        ref={summaryPopoverRef}
                        className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-10 p-3"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Selected Cases ({selectedIds.length})</h4>
                            <button
                                onClick={clearAllSelection}
                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                            >
                                Clear All
                            </button>
                        </div>
                        {Array.from(selectionBySuite.entries()).map(([suiteName, cases]) => (
                            <div key={suiteName} className="mb-2 last:mb-0">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{suiteName} ({cases.length})</div>
                                <div className="space-y-0.5">
                                    {cases.map(tc => (
                                        <div key={tc.id} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 py-0.5">
                                            <span className="truncate flex-1">{tc.title}</span>
                                            <button
                                                onClick={() => toggleCase(tc.id)}
                                                className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
                            {selectedIds.length} selected
                        </span>
                        {breakdownParts.length > 0 && (
                            <span className="text-xs text-blue-600/70 dark:text-blue-400/70 truncate">
                                ({breakdownParts.join(' · ')})
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            ref={summaryBtnRef}
                            onClick={() => setShowSummaryPopover(v => !v)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
                        >
                            {showSummaryPopover ? 'Hide' : 'View'}
                        </button>
                        <button
                            onClick={clearAllSelection}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline px-2 py-1"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create Test Run</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g., Sprint 23 Regression"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional description..."
                            rows={2}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group (Optional)</label>
                            <select
                                value={selectedGroupId}
                                onChange={e => setSelectedGroupId(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">No Group</option>
                                {getIndentedGroupOptions(testRunGroups).map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                            <TagInput
                                tags={tags}
                                onChange={setTags}
                                suggestions={tagSuggestions}
                                placeholder="e.g., regression, smoke"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team (Optional)</label>
                            <input
                                type="text"
                                list="run-team-suggestions"
                                value={team}
                                onChange={e => setTeam(e.target.value)}
                                placeholder="e.g., Payments, Mobile"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            {teamSuggestions && teamSuggestions.length > 0 && (
                                <datalist id="run-team-suggestions">
                                    {teamSuggestions.map(s => <option key={s} value={s} />)}
                                </datalist>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Environment (Optional)</label>
                            <input
                                type="text"
                                value={environment}
                                onChange={e => setEnvironment(e.target.value)}
                                placeholder="e.g., staging"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Build Version (Optional)</label>
                            <input
                                type="text"
                                value={buildVersion}
                                onChange={e => setBuildVersion(e.target.value)}
                                placeholder="e.g., v1.4.2"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex gap-1 mb-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('suite')}
                                className={`${TAB_BASE} ${activeTab === 'suite' ? TAB_ACTIVE : TAB_INACTIVE}`}
                            >
                                By Suite
                            </button>
                            <button
                                onClick={() => setActiveTab('area')}
                                className={`${TAB_BASE} ${activeTab === 'area' ? TAB_ACTIVE : TAB_INACTIVE}`}
                            >
                                By Area
                            </button>
                            <button
                                onClick={() => setActiveTab('individual')}
                                className={`${TAB_BASE} ${activeTab === 'individual' ? TAB_ACTIVE : TAB_INACTIVE}`}
                            >
                                Individual Cases
                            </button>
                        </div>
                        {activeTab === 'suite' && renderSuiteTab()}
                        {activeTab === 'area' && renderAreaTab()}
                        {activeTab === 'individual' && renderIndividualTab()}
                    </div>
                </div>

                <div className="px-6 pb-2">
                    {renderSummaryBar()}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Run'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateRunModal;
