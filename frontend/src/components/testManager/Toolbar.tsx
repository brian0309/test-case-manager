
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Filter, Download, FilePlus, PenLine, Check, ChevronDown, X, Folder } from 'lucide-react';
import { ViewMode, Project } from '../../types/testManager';

interface ToolbarProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    onNew: () => void;
    onNewCase: () => void;
    activeSuite?: string | null;
    activeProject?: string | null;
    setActiveProject?: (projectId: string | null) => void;
    projects?: Project[];
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
        setActiveProject,
        projects,
        isEditMode,
        onToggleEditMode,
        showEditToggle
    } = props;

    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
    const projectMenuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
                setIsProjectMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getTitle = () => {
        if (activeSuite) return activeSuite;
        switch (viewMode) {
            case 'projects': return 'Projects';
            case 'suites': return 'Test Suites';
            case 'plans': return 'Test Plans';
            default: return 'Test Cases';
        }
    };

    // Helper to determine button text
    const getNewButtonText = () => {
        if (viewMode === 'projects') return 'Project';
        if (viewMode === 'suites') return 'Suite';
        return 'Case';
    };

    const currentProject = projects?.find((p: Project) => p.id === activeProject);

    return (
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{getTitle()}</h1>

                    {/* Project Selector Badge */}
                    {activeProject && viewMode !== 'projects' && (
                        <div className="relative mt-0.5" ref={projectMenuRef}>
                            <button
                                onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-1.5 py-0.5 -ml-1.5 rounded transition-colors"
                            >
                                <span className="max-w-[150px] truncate font-medium">
                                    {currentProject?.name || 'Project'}
                                </span>
                                <ChevronDown size={12} />
                            </button>

                            {/* Dropdown Menu */}
                            {isProjectMenuOpen && (
                                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-3 py-2 border-b border-gray-50">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Project</p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {projects?.map(project => (
                                            <button
                                                key={project.id}
                                                onClick={() => {
                                                    setActiveProject?.(project.id);
                                                    setIsProjectMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${activeProject === project.id ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'
                                                    }`}
                                            >
                                                <Folder size={14} className={activeProject === project.id ? 'text-blue-500' : 'text-gray-400'} />
                                                <span className="truncate">{project.name}</span>
                                                {activeProject === project.id && <Check size={14} className="ml-auto" />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="border-t border-gray-50 mt-1 pt-1">
                                        <button
                                            onClick={() => {
                                                setActiveProject?.(null);
                                                setIsProjectMenuOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                        >
                                            <X size={14} />
                                            Clear Selection
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* iOS Style Segmented Control */}
                <div className="bg-gray-100 p-0.5 rounded-lg flex items-center h-8 ml-4">
                    {(['projects', 'cases', 'suites'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 py-0.5 text-xs font-medium rounded-md capitalize transition-all duration-200 ${viewMode === mode && !activeSuite
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
                <button
                    onClick={onNewCase}
                    className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors mr-1"
                    title="Quick Add Test Case"
                >
                    <FilePlus className="h-5 w-5" strokeWidth={1.5} />
                </button>

                <div className="h-6 w-px bg-gray-200 mx-1"></div>

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
