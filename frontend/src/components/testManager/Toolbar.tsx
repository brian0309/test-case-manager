import React from 'react';
import { Plus, Filter, Download, Layers, Trash2, X, Check } from 'lucide-react';
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
        onDelete
    } = props;

    const getTitle = () => {
        switch (viewMode) {
            case 'projects': return 'Projects';
            case 'suites': return 'Test Suites';
            case 'plans': return 'Test Plans';
            case 'runs': return 'Test Runs';
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
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 sm:px-6 sm:py-4 gap-3 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 min-w-0">
            <div className="flex items-center gap-3 min-w-0 mb-2 sm:mb-0 flex-shrink-0">
                {viewMode === 'cases' && activeSuite && (
                    <Layers size={16} className="text-purple-500 flex-shrink-0" />
                )}
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight truncate min-w-0">{getTitle()}</h1>

                {/* Segmented control compact on mobile - scrollable independently */}
                <div className="ml-2 bg-gray-100 p-0.5 rounded-full h-8 overflow-x-auto overflow-y-hidden flex-shrink-0" style={{ maxWidth: 'calc(100vw - 8rem)' }}>
                    <div className="flex items-center gap-1 px-1 w-max">
                        {(['projects', 'cases', 'suites', 'runs'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-2 py-0.5 text-[11px] sm:text-xs font-medium rounded-full capitalize transition-all duration-200 whitespace-nowrap ${viewMode === mode
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-100'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {mode === 'runs' ? 'Runs' : mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>


            {/* Action buttons - scrollable independently on mobile */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden flex-shrink-0 min-w-0 w-full sm:w-auto" style={{ maxWidth: '100%' }}>
                <div className="flex items-center gap-2 sm:gap-3 w-max">

                    {/* Selection Mode Toggle (replaces Edit toggle for Cases view) */}
                    {showEditToggle && (
                        <>
                            {isSelectionMode && selectedCount > 0 && (
                                <button
                                    onClick={onDelete}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 whitespace-nowrap"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Delete ({selectedCount})</span>
                                    <span className="sm:hidden">({selectedCount})</span>
                                </button>
                            )}

                            <button
                                onClick={onToggleSelectionMode}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm font-medium whitespace-nowrap ${isSelectionMode
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'text-gray-600 hover:bg-gray-100'
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
                        className={`p-1 rounded-md transition-colors flex-shrink-0 ${hasActiveFilters ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Filter className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0">
                        <Download className="h-4 w-4" strokeWidth={1.5} />
                    </button>

                    <button
                        onClick={onNew}
                        className="mac-button ml-2 flex items-center gap-2 bg-[#007AFF] hover:bg-[#0062cc] text-white px-3 py-1 rounded-md shadow-sm active:scale-95 text-sm font-medium whitespace-nowrap"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                        <span className="inline">New {getNewButtonText()}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Toolbar;
