
import React from 'react';
import { Plus, Filter, Download, FilePlus, PenLine, Check, Layers } from 'lucide-react';
import { ViewMode } from '../../types/testManager';

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
        onNewCase,
        activeSuite,
        activeProject,
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

    const getSubtitle = () => {
        if (viewMode === 'cases' && activeSuite) {
            return 'Test Suite';
        }
        if (viewMode === 'cases' && !activeSuite && activeProject) {
            return 'All cases in project';
        }
        return null;
    };

    // Helper to determine button text
    const getNewButtonText = () => {
        if (viewMode === 'projects') return 'Project';
        if (viewMode === 'suites') return 'Suite';
        return 'Case';
    };

    return (
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        {viewMode === 'cases' && activeSuite && (
                            <Layers size={18} className="text-purple-500" />
                        )}
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{getTitle()}</h1>
                    </div>
                    {getSubtitle() && (
                        <p className="text-xs text-gray-400 mt-0.5">{getSubtitle()}</p>
                    )}
                </div>

                {/* iOS Style Segmented Control */}
                <div className="bg-gray-100 p-0.5 rounded-lg flex items-center h-8 ml-4">
                    {(['projects', 'cases', 'suites'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 py-0.5 text-xs font-medium rounded-md capitalize transition-all duration-200 ${viewMode === mode
                                ? 'bg-white text-black shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Quick add test case - only show when not on projects page */}
                {viewMode !== 'projects' && (
                    <button
                        onClick={onNewCase}
                        className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors mr-1"
                        title="Quick Add Test Case"
                    >
                        <FilePlus className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                )}

                {viewMode !== 'projects' && <div className="h-6 w-px bg-gray-200 mx-1"></div>}

                {showEditToggle && (
                    <button
                        onClick={onToggleEditMode}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${isEditMode
                            ? 'bg-blue-100 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {isEditMode ? (
                            <>
                                <Check className="h-4 w-4" />
                                <span>Done</span>
                            </>
                        ) : (
                            <>
                                <PenLine className="h-4 w-4" />
                                <span>Edit</span>
                            </>
                        )}
                    </button>
                )}

                <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                    <Filter className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                    <Download className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <button
                    onClick={onNew}
                    className="mac-button ml-2 flex items-center gap-2 bg-[#007AFF] hover:bg-[#0062cc] text-white px-4 py-1.5 shadow-sm active:scale-95 text-sm font-medium"
                >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                    <span>New {getNewButtonText()}</span>
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
