import React from 'react';
import { Plus, Filter, Download, Upload, Layers, Trash2, X, Check, BarChart3 } from 'lucide-react';
import { ViewMode } from '../../types/testManager';
import { useTestManagerStore } from '../../store/testManagerStore';

interface ToolbarProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    onNew: () => void;
    onNewCase: () => void;
    activeSuite?: string | null;
    activeSuiteId?: string | null;
    activeProject?: string | null;
    isEditMode?: boolean;
    onToggleEditMode?: () => void;
    showEditToggle?: boolean;
    // Selection props
    isSelectionMode?: boolean;
    onToggleSelectionMode?: () => void;
    selectedCount?: number;
    onDelete?: () => void;
    // Export prop
    onDownload?: () => void;
    // Import prop
    onUpload?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = (props) => {
    const {
        viewMode,
        setViewMode,
        onNew,
        activeSuite,
        showEditToggle,
        isSelectionMode,
        onToggleSelectionMode,
        selectedCount = 0,
        onDelete,
        onDownload,
        onUpload
    } = props;

    const getTitle = () => {
        switch (viewMode) {
            case 'projects': return 'Projects';
            case 'suites': return 'Test Suites';
            case 'plans': return 'Test Plans';
            case 'runs': return 'Test Runs';
            case 'reports': return 'Reports & Analytics';
            case 'cases':
                // Show suite name if selected, otherwise "All Test Cases"
                return activeSuite || 'Test Cases';
            default: return 'Test Cases';
        }
    };

    const { toggleFilterModal, filters } = useTestManagerStore();
    const hasActiveFilters = filters.status.length > 0 || filters.priority.length > 0 || !!filters.dateRange.start || !!filters.dateRange.end;

    // Helper to determine button text
    const getNewButtonText = () => {
        if (viewMode === 'projects') return 'Project';
        if (viewMode === 'suites') return 'Suite';
        if (viewMode === 'runs') return 'Run';
        return 'Case';
    };

    return (
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 sm:px-6 sm:py-4 gap-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-20">
            <div className="w-full sm:w-auto flex items-center gap-3 min-w-0 mb-2 sm:mb-0">
                {viewMode === 'cases' && activeSuite && (
                    <Layers size={16} className="text-purple-500 flex-shrink-0" />
                )}
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight truncate min-w-0">{getTitle()}</h1>

                {/* Segmented control compact on mobile */}
                <div className="ml-2 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-full flex items-center h-8 overflow-x-auto">
                    <div className="flex items-center gap-1 px-1">
                        {(['projects', 'cases', 'suites', 'runs', 'reports'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-2 py-0.5 text-[11px] sm:text-xs font-medium rounded-full capitalize transition-all duration-200 whitespace-nowrap ${viewMode === mode
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-100 dark:ring-gray-500'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                {mode === 'runs' ? 'Runs' : mode === 'reports' ? (
                                    <span className="flex items-center gap-1">
                                        <BarChart3 className="h-3 w-3 sm:hidden" />
                                        <span className="hidden sm:inline">Reports</span>
                                    </span>
                                ) : mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-full sm:w-auto flex items-center justify-end gap-2 sm:gap-3">

                {/* Selection Mode Toggle (replaces Edit toggle for Cases view) */}
                {showEditToggle && (
                    <>
                        {isSelectionMode && selectedCount > 0 && (
                            <button
                                onClick={onDelete}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Delete ({selectedCount})</span>
                                <span className="sm:hidden">({selectedCount})</span>
                            </button>
                        )}

                        <button
                            onClick={onToggleSelectionMode}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${isSelectionMode
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {isSelectionMode ? (
                                <>
                                    <X className="h-4 w-4" />
                                    <span>Cancel</span>
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    <span>Select</span>
                                </>
                            )}
                        </button>
                    </>
                )}

                <button
                    onClick={() => toggleFilterModal(true)}
                    className={`p-1 rounded-md transition-colors ${hasActiveFilters ? 'text-system-blue bg-system-blue/10 dark:bg-system-blue/20 hover:bg-system-blue/20 dark:hover:bg-system-blue/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                    <Filter className="h-4 w-4" strokeWidth={1.5} />
                </button>
                {viewMode === 'cases' && onUpload && (
                    <button
                        onClick={onUpload}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        title="Import test cases from CSV"
                    >
                        <Upload className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                )}
                {viewMode === 'cases' && onDownload && (
                    <button
                        onClick={onDownload}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        title="Export test cases to CSV"
                    >
                        <Download className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                )}

                {viewMode !== 'reports' && (
                    <button
                        onClick={onNew}
                        className="mac-button ml-2 flex items-center gap-2 bg-[#007AFF] hover:bg-[#0062cc] dark:bg-system-darkBlue dark:hover:bg-[#0056b3] text-white px-3 py-1 rounded-md shadow-sm active:scale-95 text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                        <span className="inline">New {getNewButtonText()}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default Toolbar;
