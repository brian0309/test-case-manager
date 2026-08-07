
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { TestCase, TestSuite, Status } from '../../types/testManager';
import { Folder, MoreHorizontal, PieChart, Plus, Pencil, Trash2, Share2, ArrowUp, ArrowDown, Tag, Play } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';
import { getTagColor } from '../../utils/tagColors';

interface TestSuiteListProps {
    testCases: TestCase[];
    testSuites: TestSuite[];
    onSuiteClick: (suiteName: string, suiteId?: string) => void;
    onCreate: () => void;
    onEdit?: (suite: TestSuite) => void;
    onDelete?: (suite: TestSuite) => void;
    viewMode: 'card' | 'table';
    onViewModeToggle: () => void;
    selectedSuiteIds: string[];
    onToggleSuiteSelection: (suiteId: string) => void;
    onSelectAllSuites: (checked: boolean, visibleSuiteIds: string[]) => void;
    allowDerivedFallback?: boolean;
    emptyState?: {
        title: string;
        description: string;
    };
}

interface DropdownPosition {
    suiteId: string;
    top: number;
    right: number;
}

type SortField = 'name' | 'total' | 'progress' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const TestSuiteList: React.FC<TestSuiteListProps> = ({
    testCases,
    testSuites,
    onSuiteClick,
    onCreate,
    onEdit,
    onDelete,
    viewMode,
    onViewModeToggle: _onViewModeToggle,
    selectedSuiteIds,
    onToggleSuiteSelection,
    onSelectAllSuites,
    allowDerivedFallback = true,
    emptyState,
}) => {
    const navigate = useNavigate();
    const { setActiveSuiteWithId, setFilters, setActiveArea, activeProject } = useTestManagerStore();
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
    const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    const handlePlaySuite = (e: React.MouseEvent, suiteId: string, suiteName: string) => {
        e.stopPropagation();
        if (!activeProject || !suiteId) return;
        const url = `/test-manager/runs?openCreate=true&suiteId=${encodeURIComponent(suiteId)}&suiteName=${encodeURIComponent(suiteName)}&projectId=${encodeURIComponent(activeProject)}`;
        window.open(url, '_blank');
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownPosition(null);
                setSelectedSuite(null);
            }
        };

        if (dropdownPosition) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownPosition]);

    // Use testSuites from API if available, otherwise derive from testCases for backwards compatibility
    const suites = testSuites.length > 0
        ? testSuites
        : allowDerivedFallback
            ? Array.from(new Set(testCases.map(tc => tc.suite))).sort().map(name => ({
                id: name,
                name,
                projectId: '',
                description: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            } as TestSuite))
            : [];

    const getSuiteStats = (suiteName: string) => {
        const cases = testCases.filter(c => c.suite === suiteName);
        const total = cases.length;

        const ready = cases.filter(c => c.status === Status.Ready).length;
        const inReview = cases.filter(c => c.status === Status.InReview).length;
        const draft = cases.filter(c => c.status === Status.Draft).length;
        const updated = cases.filter(c => c.status === Status.Updated).length;
        const archived = cases.filter(c => c.status === Status.Archived).length;

        const progress = total === 0 ? 0 : Math.round((ready / total) * 100);

        return { total, ready, inReview, draft, updated, archived, progress };
    };

    const getSortedSuites = () => {
        return [...suites].sort((a, b) => {
            const aStats = getSuiteStats(a.name);
            const bStats = getSuiteStats(b.name);
            let comparison = 0;

            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'total':
                    comparison = aStats.total - bStats.total;
                    break;
                case 'progress':
                    comparison = aStats.progress - bStats.progress;
                    break;
                case 'updatedAt':
                    comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleMenuClick = (e: React.MouseEvent, suite: TestSuite) => {
        e.stopPropagation();
        setSelectedSuite(suite);

        // Position dropdown near the button
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDropdownPosition({
            suiteId: suite.id,
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
        });
    };

    const handleShareClick = async (e: React.MouseEvent, suiteId: string) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/test-manager/cases?suiteId=${suiteId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard');
        } catch (err) {
            console.error('Failed to copy link: ', err);
            toast.error('Failed to copy link');
        }
    };

    const handleEdit = () => {
        setDropdownPosition(null);
        if (selectedSuite && onEdit) {
            onEdit(selectedSuite);
        }
    };

    const handleDelete = () => {
        setDropdownPosition(null);
        if (selectedSuite && onDelete) {
            onDelete(selectedSuite);
        }
    };

    const handleStatusClick = (e: React.MouseEvent, suite: TestSuite, status: Status) => {
        e.stopPropagation();
        setActiveSuiteWithId(suite.id, suite.name);
        setFilters({ status: [status] });
        setActiveArea(null);
        navigate('/test-manager/cases');
    };

    const sortedSuites = getSortedSuites();
    const visibleSuiteIds = sortedSuites.map((suite) => suite.id);
    const allVisibleSelected = visibleSuiteIds.length > 0 && visibleSuiteIds.every((id) => selectedSuiteIds.includes(id));
    const someVisibleSelected = visibleSuiteIds.some((id) => selectedSuiteIds.includes(id));

    if (sortedSuites.length === 0 && emptyState) {
        return (
            <div className="p-6 md:p-8">
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center dark:border-gray-700 dark:bg-gray-800/40">
                    <Folder className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{emptyState.title}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{emptyState.description}</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className={viewMode === 'card' ? 'p-6 md:p-8' : ''}>
            {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Create New Suite Card */}
                <div
                    onClick={onCreate}
                    className="group flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all cursor-pointer min-h-[200px]"
                >
                    <div className="h-12 w-12 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Create New Suite</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Organize your cases</p>
                </div>

                {sortedSuites.map(suite => {
                    const stats = getSuiteStats(suite.name);
                    const isSelected = selectedSuiteIds.includes(suite.id);

                    return (
                        <div
                            key={suite.id || suite.name}
                            onClick={() => onSuiteClick(suite.name, suite.id)}
                            className={`group bg-white dark:bg-gray-800 rounded-2xl border p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                isSelected
                                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-900/10'
                                    : 'border-gray-100 dark:border-gray-700'
                            }`}
                        >
                            <div className="absolute top-3 left-3 z-10">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => onToggleSuiteSelection(suite.id)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-800"
                                    aria-label={`Select suite ${suite.name}`}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3 pl-6">
                                        <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400">
                                            <Folder className="h-5 w-5 fill-blue-100 dark:fill-blue-900/50" strokeWidth={2} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg tracking-tight">{suite.name}</h3>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">{stats.total} Cases</span>                                            {suite.tags && suite.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {suite.tags.map(tag => (
                                                        <span key={tag} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}>
                                                            <Tag className="h-2.5 w-2.5 opacity-70" />
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => handlePlaySuite(e, suite.id, suite.name)}
                                            className="p-2 text-gray-300 dark:text-gray-600 hover:text-green-600 dark:hover:text-green-400 rounded-full hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Create Test Run from this suite"
                                        >
                                            <Play className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleShareClick(e, suite.id)}
                                            className="p-2 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Share Suite"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleMenuClick(e, suite)}
                                            className="p-2 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                                        <span className={`font-semibold ${stats.progress === 100 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{stats.progress}%</span>
                                    </div>

                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden flex">
                                        {/* Ready - Green */}
                                        {stats.ready > 0 && (
                                            <div
                                                className="bg-green-500 h-full transition-all duration-500"
                                                style={{ width: `${(stats.ready / stats.total) * 100}%` }}
                                            />
                                        )}
                                        {/* In Review - Yellow */}
                                        {stats.inReview > 0 && (
                                            <div
                                                className="bg-yellow-500 h-full transition-all duration-500"
                                                style={{ width: `${(stats.inReview / stats.total) * 100}%` }}
                                            />
                                        )}
                                        {/* Draft - Gray */}
                                        {stats.draft > 0 && (
                                            <div
                                                className="bg-gray-400 dark:bg-gray-500 h-full transition-all duration-500"
                                                style={{ width: `${(stats.draft / stats.total) * 100}%` }}
                                            />
                                        )}
                                        {/* Updated - Blue */}
                                        {stats.updated > 0 && (
                                            <div
                                                className="bg-blue-500 h-full transition-all duration-500"
                                                style={{ width: `${(stats.updated / stats.total) * 100}%` }}
                                            />
                                        )}
                                        {/* Archived - Gray */}
                                        {stats.archived > 0 && (
                                            <div
                                                className="bg-gray-300 dark:bg-gray-600 h-full transition-all duration-500"
                                                style={{ width: `${(stats.archived / stats.total) * 100}%` }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50 dark:border-gray-700 mt-4">
                                {stats.ready > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.Ready)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                        {stats.ready} Ready
                                    </button>
                                )}
                                {stats.inReview > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.InReview)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-2.5 py-1.5 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors cursor-pointer"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                                        {stats.inReview} In Review
                                    </button>
                                )}
                                {stats.draft > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.Draft)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                        {stats.draft} Draft
                                    </button>
                                )}
                                {stats.updated > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.Updated)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        {stats.updated} Updated
                                    </button>
                                )}
                                {stats.archived > 0 && (
                                    <button
                                        onClick={(e) => handleStatusClick(e, suite, Status.Archived)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                        {stats.archived} Archived
                                    </button>
                                )}
                                {stats.total === 0 && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 px-2 py-1.5">
                                        <PieChart className="h-3.5 w-3.5" />
                                        No test cases
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <tr>
                                <th className="py-3 pl-4 pr-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            ref={(input) => {
                                                if (input) {
                                                    input.indeterminate = someVisibleSelected && !allVisibleSelected;
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => onSelectAllSuites(e.target.checked, visibleSuiteIds)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-800"
                                            aria-label="Select all visible suites"
                                        />
                                    </div>
                                </th>
                                <th
                                    className="py-3 pl-4 pr-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Suite Name
                                        {sortField === 'name' && (
                                            sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 select-none"
                                    onClick={() => handleSort('total')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Cases
                                        {sortField === 'total' && (
                                            sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 select-none"
                                    onClick={() => handleSort('progress')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Progress
                                        {sortField === 'progress' && (
                                            sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status Breakdown</th>
                                <th
                                    className="py-3 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 select-none"
                                    onClick={() => handleSort('updatedAt')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Updated
                                        {sortField === 'updatedAt' && (
                                            sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tags</th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {sortedSuites.map(suite => {
                                const stats = getSuiteStats(suite.name);
                                const isSelected = selectedSuiteIds.includes(suite.id);
                                return (
                                    <tr
                                        key={suite.id || suite.name}
                                        className={`group transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-50/60 dark:bg-blue-900/20 hover:bg-blue-100/70 dark:hover:bg-blue-900/30'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                        onClick={() => onSuiteClick(suite.name, suite.id)}
                                    >
                                        <td className="py-4 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => onToggleSuiteSelection(suite.id)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-800"
                                                    aria-label={`Select suite ${suite.name}`}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-4 pl-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400">
                                                    <Folder className="h-4 w-4 fill-blue-100 dark:fill-blue-900/50" strokeWidth={2} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{suite.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{stats.total}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-semibold ${stats.progress === 100 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{stats.progress}%</span>
                                                <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
                                                    {stats.ready > 0 && (
                                                        <div
                                                            className="bg-green-500 h-full transition-all duration-500"
                                                            style={{ width: `${(stats.ready / stats.total) * 100}%` }}
                                                        />
                                                    )}
                                                    {stats.inReview > 0 && (
                                                        <div
                                                            className="bg-yellow-500 h-full transition-all duration-500"
                                                            style={{ width: `${(stats.inReview / stats.total) * 100}%` }}
                                                        />
                                                    )}
                                                    {stats.draft > 0 && (
                                                        <div
                                                            className="bg-gray-400 dark:bg-gray-500 h-full transition-all duration-500"
                                                            style={{ width: `${(stats.draft / stats.total) * 100}%` }}
                                                        />
                                                    )}
                                                    {stats.updated > 0 && (
                                                        <div
                                                            className="bg-blue-500 h-full transition-all duration-500"
                                                            style={{ width: `${(stats.updated / stats.total) * 100}%` }}
                                                        />
                                                    )}
                                                    {stats.archived > 0 && (
                                                        <div
                                                            className="bg-gray-300 dark:bg-gray-600 h-full transition-all duration-500"
                                                            style={{ width: `${(stats.archived / stats.total) * 100}%` }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {stats.ready > 0 && (
                                                    <button
                                                        onClick={(e) => handleStatusClick(e, suite, Status.Ready)}
                                                        className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                                                    >
                                                        <div className="h-1 w-1 rounded-full bg-green-500" />
                                                        {stats.ready} Ready
                                                    </button>
                                                )}
                                                {stats.inReview > 0 && (
                                                    <button
                                                        onClick={(e) => handleStatusClick(e, suite, Status.InReview)}
                                                        className="flex items-center gap-1 text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors cursor-pointer"
                                                    >
                                                        <div className="h-1 w-1 rounded-full bg-yellow-500" />
                                                        {stats.inReview} In Review
                                                    </button>
                                                )}
                                                {stats.draft > 0 && (
                                                    <button
                                                        onClick={(e) => handleStatusClick(e, suite, Status.Draft)}
                                                        className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                                    >
                                                        <div className="h-1 w-1 rounded-full bg-gray-400" />
                                                        {stats.draft} Draft
                                                    </button>
                                                )}
                                                {stats.updated > 0 && (
                                                    <button
                                                        onClick={(e) => handleStatusClick(e, suite, Status.Updated)}
                                                        className="flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                                                    >
                                                        <div className="h-1 w-1 rounded-full bg-blue-500" />
                                                        {stats.updated} Updated
                                                    </button>
                                                )}
                                                {stats.archived > 0 && (
                                                    <button
                                                        onClick={(e) => handleStatusClick(e, suite, Status.Archived)}
                                                        className="flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                                    >
                                                        <div className="h-1 w-1 rounded-full bg-gray-300" />
                                                        {stats.archived} Archived
                                                    </button>
                                                )}
                                                {stats.total === 0 && (
                                                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500 px-2 py-1">
                                                        <PieChart className="h-3 w-3" />
                                                        No cases
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                                {new Date(suite.updatedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {suite.tags && suite.tags.length > 0 ? (
                                                    suite.tags.map(tag => (
                                                        <span key={tag} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}>
                                                            <Tag className="h-2.5 w-2.5 opacity-70" />
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={(e) => handlePlaySuite(e, suite.id, suite.name)}
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                                                    title="Create Test Run from this suite"
                                                >
                                                    <Play className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShareClick(e, suite.id);
                                                    }}
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                    title="Share Suite"
                                                >
                                                    <Share2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSuite(suite);
                                                        setDropdownPosition(null);
                                                        if (onEdit) {
                                                            onEdit(suite);
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title="Edit Suite"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSuite(suite);
                                                        setDropdownPosition(null);
                                                        if (onDelete) {
                                                            onDelete(suite);
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                    title="Delete Suite"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* Dropdown Menu */}
        {dropdownPosition && (
            <div
                ref={dropdownRef}
                className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 w-48 animate-[scaleIn_0.1s_ease-out]"
                style={{
                    top: dropdownPosition.top,
                    right: dropdownPosition.right,
                }}
            >
                <button
                    onClick={handleEdit}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <Pencil className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    Edit Suite
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Suite
                </button>
            </div>
        )}
        </>
    );
};

export default TestSuiteList;
