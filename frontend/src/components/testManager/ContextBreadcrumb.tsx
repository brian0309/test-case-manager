import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Folder, Layers, Check, Home, Map } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';

interface ContextBreadcrumbProps {
    showSuiteSelector?: boolean;
}

const ContextBreadcrumb: React.FC<ContextBreadcrumbProps> = ({ showSuiteSelector = true }) => {
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
        fetchTestCases,
        fetchTestCasesByProject,
        testCases,
    } = useTestManagerStore();
    const navigate = useNavigate();

    const [isProjectOpen, setIsProjectOpen] = useState(false);
    const [isSuiteOpen, setIsSuiteOpen] = useState(false);
    const [isAreaOpen, setIsAreaOpen] = useState(false);
    const projectRef = useRef<HTMLDivElement>(null);
    const suiteRef = useRef<HTMLDivElement>(null);
    const areaRef = useRef<HTMLDivElement>(null);

    const currentProject = projects.find(p => p.id === activeProject);
    const currentSuite = testSuites.find(s => s.id === activeSuiteId);

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
        // Fetch all test cases for the project (no suite filter)
        await fetchTestCasesByProject(projectId);
        setIsProjectOpen(false);
    };

    const handleSuiteChange = async (suiteId: string, suiteName: string) => {
        setActiveSuiteWithId(suiteId, suiteName);
        // Fetch test cases for this suite
        await fetchTestCases(suiteId);
        setActiveArea(null);
        setIsSuiteOpen(false);
    };

    const handleShowAllCases = async () => {
        // Clear suite selection to show all cases for the project
        setActiveSuite(null);
        setActiveSuiteId(null);
        if (activeProject) {
            await fetchTestCasesByProject(activeProject);
        }
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

    const uniqueAreas = Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort();

    return (
        <div className="h-16 flex items-center gap-3 px-6 bg-gray-50/50 border-b border-gray-100">
            {/* Home / Projects link */}
            <button
                onClick={goToProjects}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
                <Home size={14} />
                <span className="hidden sm:inline">Projects</span>
            </button>

            {/* Project Selector */}
            {activeProject && (
                <>
                    <ChevronRight size={14} className="text-gray-300" />
                    <div className="relative" ref={projectRef}>
                        <button
                            onClick={() => setIsProjectOpen(!isProjectOpen)}
                            className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded-md transition-all"
                        >
                            <Folder size={14} className="text-blue-500" />
                            <span className="max-w-[120px] truncate">{currentProject?.name || 'Project'}</span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isProjectOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProjectOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-3 py-2 border-b border-gray-50">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Switch Project</p>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {projects.map(project => (
                                        <button
                                            key={project.id}
                                            onClick={() => handleProjectChange(project.id)}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${activeProject === project.id ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
                                        >
                                            <Folder size={14} className={activeProject === project.id ? 'text-blue-500' : 'text-gray-400'} />
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
                    <ChevronRight size={14} className="text-gray-300" />
                    <div className="relative" ref={suiteRef}>
                        <button
                            onClick={() => setIsSuiteOpen(!isSuiteOpen)}
                            className={`flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded-md transition-all ${activeSuiteId
                                ? 'text-gray-700 hover:bg-white hover:shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm'
                                }`}
                        >
                            <Layers size={14} className={activeSuiteId ? 'text-purple-500' : 'text-gray-400'} />
                            <span className="max-w-[120px] truncate">
                                {currentSuite?.name || activeSuite || 'All Suites'}
                            </span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isSuiteOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isSuiteOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-3 py-2 border-b border-gray-50">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter by Suite</p>
                                </div>

                                {/* All Suites Option */}
                                <button
                                    onClick={handleShowAllCases}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${!activeSuiteId ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
                                >
                                    <Layers size={14} className={!activeSuiteId ? 'text-blue-500' : 'text-gray-400'} />
                                    <span className="flex-1">All Suites</span>
                                    {!activeSuiteId && <Check size={14} />}
                                </button>

                                <div className="h-px bg-gray-100 my-1" />

                                <div className="max-h-64 overflow-y-auto">
                                    {testSuites.map(suite => (
                                        <button
                                            key={suite.id}
                                            onClick={() => handleSuiteChange(suite.id, suite.name)}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${activeSuiteId === suite.id ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
                                        >
                                            <Layers size={14} className={activeSuiteId === suite.id ? 'text-purple-500' : 'text-gray-400'} />
                                            <span className="truncate flex-1">{suite.name}</span>
                                            {activeSuiteId === suite.id && <Check size={14} />}
                                        </button>
                                    ))}
                                    {testSuites.length === 0 && (
                                        <div className="px-3 py-4 text-sm text-gray-400 text-center">
                                            No test suites yet
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-gray-50 mt-1 pt-1">
                                    <button
                                        onClick={goToSuites}
                                        className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
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
                    <ChevronRight size={14} className="text-gray-300" />
                    <div className="relative" ref={areaRef}>
                        <button
                            onClick={() => setIsAreaOpen(!isAreaOpen)}
                            className={`flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded-md transition-all ${activeArea
                                ? 'text-gray-700 hover:bg-white hover:shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm'
                                }`}
                        >
                            <Map size={14} className={activeArea ? 'text-green-500' : 'text-gray-400'} />
                            <span className="max-w-[120px] truncate">
                                {activeArea || 'All Areas'}
                            </span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isAreaOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isAreaOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-3 py-2 border-b border-gray-50">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter by Area</p>
                                </div>

                                {/* All Areas Option */}
                                <button
                                    onClick={() => handleAreaChange(null)}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${!activeArea ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
                                >
                                    <Map size={14} className={!activeArea ? 'text-blue-500' : 'text-gray-400'} />
                                    <span className="flex-1">All Areas</span>
                                    {!activeArea && <Check size={14} />}
                                </button>

                                <div className="h-px bg-gray-100 my-1" />

                                <div className="max-h-64 overflow-y-auto">
                                    {uniqueAreas.map(area => (
                                        <button
                                            key={area}
                                            onClick={() => handleAreaChange(area)}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${activeArea === area ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
                                        >
                                            <Map size={14} className={activeArea === area ? 'text-green-500' : 'text-gray-400'} />
                                            <span className="truncate flex-1">{area}</span>
                                            {activeArea === area && <Check size={14} />}
                                        </button>
                                    ))}
                                    {uniqueAreas.length === 0 && (
                                        <div className="px-3 py-4 text-sm text-gray-400 text-center">
                                            No areas found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ContextBreadcrumb;
