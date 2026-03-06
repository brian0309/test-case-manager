import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder, Layers, Check, Home, Map, Grid2x2, Table } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';
import { getAreasByProject } from '../../services/testManagerApi';

interface ContextBreadcrumbProps {
    showSuiteSelector?: boolean;
    filteredSuites?: Array<{ id: string; name: string }>;
    viewToggle?: {
        mode: 'card' | 'table';
        onToggle: () => void;
    };
    rightContent?: React.ReactNode;
    /** Content rendered between breadcrumbs and view-toggle (e.g. tag filter) */
    beforeToggle?: React.ReactNode;
}

const ContextBreadcrumb: React.FC<ContextBreadcrumbProps> = ({ showSuiteSelector = true, filteredSuites, viewToggle, rightContent, beforeToggle }) => {
    const {
        projects,
        testSuites,
        activeProject,
        activeSuite,
        activeSuiteId,
        activeArea,
        setActiveProject,
        setActiveSuiteWithId,
        setActiveSuite,
        setActiveSuiteId,
        setActiveArea,
        fetchTestSuites,
        testCases,
        clearFilters,
    } = useTestManagerStore();
    const navigate = useNavigate();

    const [isProjectOpen, setIsProjectOpen] = useState(false);
    const [isSuiteOpen, setIsSuiteOpen] = useState(false);
    const [isAreaOpen, setIsAreaOpen] = useState(false);
    const projectRef = useRef<HTMLDivElement>(null);
    const suiteRef = useRef<HTMLDivElement>(null);
    const areaRef = useRef<HTMLDivElement>(null);

    // Areas fetched from API for the project-level (All Cases) view
    const [projectAreas, setProjectAreas] = useState<string[]>([]);

    const currentProject = projects.find(p => p.id === activeProject);
    const currentSuite = testSuites.find(s => s.id === activeSuiteId);
    const suiteOptions = filteredSuites ?? testSuites;

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
                setIsProjectOpen(false);
            }
            if (suiteRef.current && !suiteRef.current.contains(event.target as Node)) {
                setIsSuiteOpen(false);
            }
            if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
                setIsAreaOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProjectChange = async (projectId: string) => {
        setActiveProject(projectId);
        // Clear suite selection when changing projects
        setActiveSuite(null);
        setActiveSuiteId(null);
        // Fetch suites for the new project
        await fetchTestSuites(projectId);
        setIsProjectOpen(false);
    };

    const handleSuiteChange = async (suiteId: string, suiteName: string) => {
        setActiveSuiteWithId(suiteId, suiteName);
        // Reset filters when selecting a suite
        clearFilters();
        // Fetch is handled by useEffect in TestCasesPage reacting to activeSuiteId change
        setActiveArea(null);
        setIsSuiteOpen(false);
    };

    const handleShowAllCases = () => {
        // Clear suite selection to show all cases for the project
        // The useEffect in TestCasesPage will trigger fetchTestCasesByProject
        setActiveSuite(null);
        setActiveSuiteId(null);
        setIsSuiteOpen(false);
    };

    const goToProjects = () => {
        navigate('/test-manager/projects');
    };

    const goToSuites = () => {
        if (activeProject) {
            navigate('/test-manager/suites');
        }
    };

    const handleAreaChange = (area: string | null) => {
        setActiveArea(area);
        setIsAreaOpen(false);
    };

    // When no suite is selected, fetch all unique areas for the project from the API
    // so the filter shows all areas regardless of how many test cases have been loaded.
    useEffect(() => {
        if (!activeProject || activeSuiteId) {
            setProjectAreas([]);
            return;
        }

        let cancelled = false;
        getAreasByProject(activeProject).then((areas) => {
            if (!cancelled) {
                setProjectAreas(areas);
            }
        }).catch(() => {
            if (!cancelled) {
                setProjectAreas([]);
            }
        });

        return () => { cancelled = true; };
    }, [activeProject, activeSuiteId]);

    // When a suite is selected, derive areas from loaded test cases (suite-level view).
    // When no suite is selected (All Cases), use the API-fetched areas merged with any
    // newly-created areas visible in the currently loaded test cases.
    const uniqueAreas = useMemo(() => {
        if (activeSuiteId) {
            return Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort();
        }
        // Merge API areas with areas from currently loaded test cases to capture newly added ones
        const combined = new Set<string>([
            ...projectAreas,
            ...testCases.map(tc => tc.area).filter((a): a is string => !!a),
        ]);
        return Array.from(combined).sort();
    }, [activeSuiteId, testCases, projectAreas]);

    return (
        <div className="min-h-16 flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-4 sm:px-6 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Home / Projects link */}
            <button
                onClick={goToProjects}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-500 transition-colors flex-shrink-0"
            >
                <Home size={14} />
                <span className="hidden sm:inline">Projects</span>
            </button>

            {/* Project Selector */}
            {activeProject && (
                <>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-400 flex-shrink-0" />
                    <div className="relative" ref={projectRef}>
                        <button
                            onClick={() => setIsProjectOpen(!isProjectOpen)}
                            title={currentProject?.name || 'Project'}
                            className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm dark:hover:shadow-md rounded-md transition-all"
                        >
                            <Folder size={14} className="text-blue-500 flex-shrink-0" />
                            <span className="max-w-[80px] sm:max-w-[120px] truncate">{currentProject?.name || 'Project'}</span>
                            <ChevronDown size={14} className={`text-gray-400 dark:text-gray-400 transition-transform flex-shrink-0 ${isProjectOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProjectOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 sm:w-[28rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Switch Project</p>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {projects.map(project => (
                                        <button
                                            key={project.id}
                                            onClick={() => handleProjectChange(project.id)}
                                            title={project.name}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${activeProject === project.id ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                        >
                                            <Folder size={14} className={activeProject === project.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                                            <span className="truncate flex-1">{project.name}</span>
                                            {activeProject === project.id && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Suite Selector - only show if we have a project selected */}
            {showSuiteSelector && activeProject && (
                <>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-400" />
                    <div className="relative" ref={suiteRef}>
                        <button
                            onClick={() => setIsSuiteOpen(!isSuiteOpen)}
                            title={currentSuite?.name || activeSuite || 'All Suites'}
                            className={`flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded-md transition-all ${activeSuiteId
                                ? 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm dark:hover:shadow-md'
                                : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm dark:hover:shadow-md'
                                }`}
                        >
                            <Layers size={14} className={activeSuiteId ? 'text-purple-500 dark:text-purple-400 flex-shrink-0' : 'text-gray-400 dark:text-gray-500 flex-shrink-0'} />
                            <span className="max-w-[80px] sm:max-w-[120px] truncate">
                                {currentSuite?.name || activeSuite || 'All Suites'}
                            </span>
                            <ChevronDown size={14} className={`text-gray-400 dark:text-gray-400 transition-transform flex-shrink-0 ${isSuiteOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isSuiteOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 sm:w-[28rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filter by Suite</p>
                                </div>

                                {/* All Suites Option */}
                                <button
                                    onClick={handleShowAllCases}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!activeSuiteId ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                    <Layers size={14} className={!activeSuiteId ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                                    <span className="flex-1">All Suites</span>
                                    {!activeSuiteId && <Check size={14} />}
                                </button>

                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                                <div className="max-h-64 overflow-y-auto">
                                    {suiteOptions.map(suite => (
                                        <button
                                            key={suite.id}
                                            onClick={() => handleSuiteChange(suite.id, suite.name)}
                                            title={suite.name}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${activeSuiteId === suite.id ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                        >
                                            <Layers size={14} className={activeSuiteId === suite.id ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'} />
                                            <span className="truncate flex-1">{suite.name}</span>
                                            {activeSuiteId === suite.id && <Check size={14} />}
                                        </button>
                                    ))}
                                    {suiteOptions.length === 0 && (
                                        <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
                                            {filteredSuites && testSuites.length > 0
                                                ? 'No suites match current filters'
                                                : 'No test suites yet'}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-gray-50 dark:border-gray-700 mt-1 pt-1">
                                    <button
                                        onClick={goToSuites}
                                        className="w-full text-left px-3 py-2 text-sm text-blue-500 dark:text-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-400/20 flex items-center gap-2 transition-colors"
                                    >
                                        <Layers size={14} />
                                        Manage Suites
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Area Selector - only show if we have a suite selected or at least project selected */}
            {showSuiteSelector && activeProject && (
                <>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-400 flex-shrink-0" />
                    <div className="relative" ref={areaRef}>
                        <button
                            onClick={() => setIsAreaOpen(!isAreaOpen)}
                            title={activeArea || 'All Areas'}
                            className={`flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded-md transition-all ${activeArea
                                ? 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm dark:hover:shadow-md'
                                : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm dark:hover:shadow-md'
                                }`}
                        >
                            <Map size={14} className={activeArea ? 'text-green-500 dark:text-green-400 flex-shrink-0' : 'text-gray-400 dark:text-gray-500 flex-shrink-0'} />
                            <span className="max-w-[80px] sm:max-w-[120px] truncate">
                                {activeArea || 'All Areas'}
                            </span>
                            <ChevronDown size={14} className={`text-gray-400 dark:text-gray-400 transition-transform flex-shrink-0 ${isAreaOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isAreaOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 sm:w-[28rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filter by Area</p>
                                </div>

                                {/* All Areas Option */}
                                <button
                                    onClick={() => handleAreaChange(null)}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!activeArea ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                    <Map size={14} className={!activeArea ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                                    <span className="flex-1">All Areas</span>
                                    {!activeArea && <Check size={14} />}
                                </button>

                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                                <div className="max-h-64 overflow-y-auto">
                                    {uniqueAreas.map(area => (
                                        <button
                                            key={area}
                                            onClick={() => handleAreaChange(area)}
                                            title={area}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${activeArea === area ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20' : 'text-gray-700 dark:text-gray-300'}`}
                                        >
                                            <Map size={14} className={activeArea === area ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'} />
                                            <span className="truncate flex-1">{area}</span>
                                            {activeArea === area && <Check size={14} />}
                                        </button>
                                    ))}
                                    {uniqueAreas.length === 0 && (
                                        <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
                                            No areas found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Tag filter or other before-toggle content */}
            {beforeToggle}

            {/* View Toggle Button - shows when provided */}
            {viewToggle && (
                <button
                    onClick={viewToggle.onToggle}
                    className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-200 transition-colors shadow-sm dark:shadow-none"
                    title={viewToggle.mode === 'card' ? 'Switch to table view' : 'Switch to card view'}
                >
                    {viewToggle.mode === 'card' ? <Table size={14} /> : <Grid2x2 size={14} />}
                    <span className="hidden sm:inline">{viewToggle.mode === 'card' ? 'Table' : 'Card'}</span>
                </button>
            )}
            </div>
            
            {/* Right content (e.g., presence indicator) */}
            {rightContent && (
                <div className="flex-shrink-0">
                    {rightContent}
                </div>
            )}
        </div>
    );
};

export default ContextBreadcrumb;
