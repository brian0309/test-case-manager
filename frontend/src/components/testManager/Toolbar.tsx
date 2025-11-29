import React from 'react';
import { Plus, Filter, Download, PenLine, Check, Layers } from 'lucide-react';
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
}

const Toolbar: React.FC<ToolbarProps> = (props) => {
    const {
        viewMode,
        setViewMode,
        onNew,
        activeSuite,
        isEditMode,
        onToggleEditMode,
        showEditToggle
    } = props;

    const getTitle = () => {
        switch (viewMode) {
            case 'projects': return 'Projects';
            case 'suites': return 'Test Suites';
            case 'plans': return 'Test Plans';
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
        return 'Case';
    };

    return (
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 sm:px-6 sm:py-4 gap-3 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
            <div className="w-full sm:w-auto flex items-center gap-3 min-w-0 mb-2 sm:mb-0">
                {viewMode === 'cases' && activeSuite && (
                    <Layers size={16} className="text-purple-500 flex-shrink-0" />
                )}
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight truncate min-w-0">{getTitle()}</h1>

                {/* Segmented control compact on mobile */}
                <div className="ml-2 bg-gray-100 p-0.5 rounded-full flex items-center h-8 overflow-x-auto">
                    <div className="flex items-center gap-1 px-1">
                        {(['projects', 'cases', 'suites'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-2 py-0.5 text-[11px] sm:text-xs font-medium rounded-full capitalize transition-all duration-200 whitespace-nowrap ${viewMode === mode
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-100'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-full sm:w-auto flex items-center justify-end gap-2 sm:gap-3">

                {showEditToggle && (
                    <button
                        onClick={onToggleEditMode}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-sm font-medium ${isEditMode
                            ? 'bg-blue-100 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {isEditMode ? (
                            <>
                                <Check className="h-4 w-4" />
                                <span className="text-sm">Done</span>
                            </>
                        ) : (
                            <>
                                <PenLine className="h-4 w-4" />
                                <span className="text-sm">Edit</span>
                            </>
                        )}
                    </button>
                )}

                <button
                    onClick={() => toggleFilterModal(true)}
                    className={`p-1 rounded-md transition-colors ${hasActiveFilters ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Filter className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                    <Download className="h-4 w-4" strokeWidth={1.5} />
                </button>

                <button
                    onClick={onNew}
                    className="mac-button ml-2 flex items-center gap-2 bg-[#007AFF] hover:bg-[#0062cc] text-white px-3 py-1 rounded-md shadow-sm active:scale-95 text-sm font-medium"
                >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                    <span className="inline">New {getNewButtonText()}</span>
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
