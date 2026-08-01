import React, { useMemo, useState } from 'react';
import { Folder, Layers, Plus, Search, X } from 'lucide-react';
import { TestSuite } from '../../types/testManager';

interface TestSuiteSidebarProps {
    testSuites: TestSuite[];
    activeSuiteId: string | null;
    projectCaseCount: number;
    onSuiteSelect: (suiteId: string | null) => void;
    onCreateSuite?: () => void;
    isMobile?: boolean;
    onClose?: () => void;
}

const TestSuiteSidebar: React.FC<TestSuiteSidebarProps> = ({
    testSuites,
    activeSuiteId,
    projectCaseCount,
    onSuiteSelect,
    onCreateSuite,
    isMobile = false,
    onClose,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSuites = useMemo(() => {
        const sorted = [...testSuites].sort((a, b) => a.name.localeCompare(b.name));
        if (!searchQuery.trim()) return sorted;
        const q = searchQuery.toLowerCase();
        return sorted.filter(s => s.name.toLowerCase().includes(q));
    }, [testSuites, searchQuery]);

    return (
        <div className={`${isMobile ? 'w-full h-full' : 'w-56 flex-shrink-0'} bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700 h-full flex flex-col select-none`}>
            {/* Header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Suites
                </h3>
                <div className="flex items-center gap-1">
                    {onCreateSuite && (
                        <button
                            onClick={onCreateSuite}
                            className={`${isMobile ? 'p-2' : 'p-0.5'} rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
                            title="Create new suite"
                            aria-label="Create new suite"
                        >
                            <Plus size={14} />
                        </button>
                    )}
                    {isMobile && onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 flex items-center justify-center h-10 w-10 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            title="Close"
                            aria-label="Close test suites"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="px-2 pb-2">
                <div className="relative group">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-gray-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search suites"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full bg-gray-200/60 hover:bg-gray-200/80 focus:bg-white dark:bg-gray-700/60 dark:hover:bg-gray-700/80 dark:focus:bg-gray-700 border border-transparent focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 text-sm rounded-md pl-7 pr-6 transition-all outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400 dark:text-gray-200 ${
                            isMobile ? 'py-2' : 'py-1'
                        }`}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-300/60 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Suite List */}
            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                {/* All Cases - always visible */}
                <button
                    onClick={() => onSuiteSelect(null)}
                    className={`w-full flex items-center gap-2.5 px-3 rounded-lg text-sm transition-colors ${
                        isMobile ? 'py-2.5' : 'py-2'
                    } ${
                        activeSuiteId === null
                            ? 'bg-system-blue text-white font-medium shadow-sm dark:bg-system-darkBlue'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60'
                    }`}
                >
                    <Layers
                        size={15}
                        className={activeSuiteId === null ? 'text-white' : 'text-gray-400 dark:text-gray-500'}
                        strokeWidth={2}
                    />
                    <span className="flex-1 text-left truncate">All Cases</span>
                    <span
                        className={`text-xs tabular-nums ${
                            activeSuiteId === null
                                ? 'text-white/80'
                                : 'text-gray-400 dark:text-gray-500'
                        }`}
                    >
                        {projectCaseCount}
                    </span>
                </button>

                {/* Divider */}
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1.5 mx-1" />

                {/* Individual Suites */}
                {filteredSuites.map((suite) => (
                    <button
                        key={suite.id}
                        onClick={() => onSuiteSelect(suite.id)}
                        className={`w-full flex items-center gap-2.5 px-3 rounded-lg text-sm transition-colors ${
                            isMobile ? 'py-2.5' : 'py-2'
                        } ${
                            activeSuiteId === suite.id
                                ? 'bg-system-blue text-white font-medium shadow-sm dark:bg-system-darkBlue'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60'
                        }`}
                        title={suite.name}
                    >
                        <Folder
                            size={15}
                            className={
                                activeSuiteId === suite.id
                                    ? 'text-white'
                                    : 'text-blue-400/80 dark:text-blue-500/80'
                            }
                            strokeWidth={2}
                        />
                        <span className="flex-1 text-left truncate">{suite.name}</span>
                        {suite.caseCount != null && (
                            <span
                                className={`text-xs tabular-nums ${
                                    activeSuiteId === suite.id
                                        ? 'text-white/80'
                                        : 'text-gray-400 dark:text-gray-500'
                                }`}
                            >
                                {suite.caseCount}
                            </span>
                        )}
                    </button>
                ))}

                {/* No results for search */}
                {searchQuery && filteredSuites.length === 0 && (
                    <div className="px-3 py-4 text-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            No suites match "{searchQuery}"
                        </p>
                    </div>
                )}

                {/* Empty State - no suites at all */}
                {!searchQuery && testSuites.length === 0 && (
                    <div className="px-3 py-6 text-center">
                        <Folder size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            No suites yet
                        </p>
                        {onCreateSuite && (
                            <button
                                onClick={onCreateSuite}
                                className="mt-2 text-xs text-system-blue hover:underline dark:text-blue-400"
                            >
                                Create your first suite
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestSuiteSidebar;
