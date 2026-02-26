import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTestManagerStore } from '../../store/testManagerStore';
import { useRealtimeTestCases } from '../../hooks/useRealtimeTestCases';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import TestSuiteList from '../../components/testManager/TestSuiteList';
import TestSuiteCreateModal from '../../components/testManager/TestSuiteCreateModal';
import TestSuiteEditModal from '../../components/testManager/TestSuiteEditModal';
import ConfirmationModal from '../../components/testManager/ConfirmationModal';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import ProjectPresenceIndicator from '../../components/testManager/ProjectPresenceIndicator';
import { getTagColor } from '../../components/testManager/TagInput';
import { TestSuite } from '../../types/testManager';
import { useProjectPresence } from '../../hooks/useProjectPresence';
import { Tag, X, ChevronDown, Check } from 'lucide-react';

const TestSuitesPage: React.FC = () => {
    const { activeProject, testCases, testSuites, projects, setActiveSuiteWithId, fetchTestCases, fetchTestSuites, fetchTestCasesByProject, fetchProjects, deleteTestSuite, setActiveProject, setActiveArea, clearFilters, searchQuery, clearSearchQuery } = useTestManagerStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Enable real-time updates for test suites
    useRealtimeTestCases({
        projectId: activeProject,
    });

    // Track users present in the same project
    const { projectUsers } = useProjectPresence({
        projectId: activeProject,
    });

    // Track processed projectId to prevent double loading
    const processedProjectIdRef = useRef<string | null>(null);

    const [isSuitesLoading, setIsSuitesLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [suiteToEdit, setSuiteToEdit] = useState<TestSuite | null>(null);
    const [suiteToDelete, setSuiteToDelete] = useState<TestSuite | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Tag filter state
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [tagFilterOpen, setTagFilterOpen] = useState(false);
    const tagFilterRef = useRef<HTMLDivElement>(null);

    // Close tag filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (tagFilterRef.current && !tagFilterRef.current.contains(e.target as Node)) {
                setTagFilterOpen(false);
            }
        };
        if (tagFilterOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [tagFilterOpen]);

    const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('suiteViewMode');
            return saved === 'table' ? 'table' : 'card';
        }
        return 'card';
    });

    const handleViewModeToggle = () => {
        const newMode = viewMode === 'card' ? 'table' : 'card';
        setViewMode(newMode);
        localStorage.setItem('suiteViewMode', newMode);
    };

    // Ensure projects are loaded when this page is visited directly (only if not already loaded)
    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects();
        }
    }, [projects.length, fetchProjects]);

    // Clear search query when entering and leaving the page
    useEffect(() => {
        clearSearchQuery(); // Clear search when entering the page
        return () => clearSearchQuery(); // Clear search when leaving
    }, [clearSearchQuery]);

    // Handle projectId URL parameter for direct links to a project
    useEffect(() => {
        const projectId = searchParams.get('projectId');

        if (!projectId || processedProjectIdRef.current === projectId) {
            return;
        }

        // Mark as processed immediately
        processedProjectIdRef.current = projectId;

        // Use timeout to ensure store actions are processed correctly if needed
        setActiveProject(projectId);

        // Clear the URL parameter
        setSearchParams({}, { replace: true });

        // Show success toast (only once)
        toast.success('Project context loaded');

    }, [searchParams, setSearchParams, setActiveProject]);

    // Fetch test suites and test cases when project is active
    // Prioritize loading suites first for faster initial display
    useEffect(() => {
        // Prevent race condition: if there is a projectId in the URL that differs from activeProject,
        // do not fetch data for the old project. Let the URL handler update the project first.
        const urlProjectId = searchParams.get('projectId');
        if (urlProjectId && urlProjectId !== activeProject) {
            return;
        }

        if (activeProject) {
            setIsSuitesLoading(true);
            // Fetch suites first (faster), then cases in background for stats
            fetchTestSuites(activeProject).finally(() => {
                setIsSuitesLoading(false);
            });
            // Fetch test cases in parallel but don't block UI on it
            fetchTestCasesByProject(activeProject);
        } else {
            setIsSuitesLoading(false);
        }
    }, [activeProject, fetchTestSuites, fetchTestCasesByProject, searchParams]);

    // Filter test cases by active project
    const projectTestCases = activeProject
        ? testCases.filter(tc => tc.projectId === activeProject)
        : [];

    // Filter test suites based on search query
    const filteredTestSuites = testSuites.filter(suite => {
        const matchesSearch =
            suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (suite.description && suite.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesTags =
            selectedTags.length === 0 ||
            selectedTags.every(t => suite.tags?.includes(t));
        return matchesSearch && matchesTags;
    });

    // Gather all distinct tags from all suites in this project
    const allTags = Array.from(
        new Set(testSuites.flatMap(s => s.tags || []))
    ).sort();

    const handleSuiteClick = (suiteName: string, suiteId?: string) => {
        if (suiteId) {
            // Set both suite id and name in the store for proper context
            setActiveSuiteWithId(suiteId, suiteName);
            // Reset filters when selecting a suite
            clearFilters();
            // Reset area filter when selecting a suite
            setActiveArea(null);
            // Fetch test cases for this suite before navigating
            fetchTestCases(suiteId);
        }
        // Navigate to test cases page
        navigate('/test-manager/cases');
    };

    const handleCreateSuite = () => {
        setIsCreateOpen(true);
    };

    const handleEditSuite = (suite: TestSuite) => {
        setSuiteToEdit(suite);
    };

    const handleDeleteSuite = (suite: TestSuite) => {
        setSuiteToDelete(suite);
    };

    const confirmDeleteSuite = async () => {
        if (!suiteToDelete) return;

        const suiteName = suiteToDelete.name;
        setIsDeleting(true);
        try {
            await deleteTestSuite(suiteToDelete.id);
            setSuiteToDelete(null);
            toast.success(`Test suite "${suiteName}" deleted successfully`);
            // Refresh suites after deletion
            if (activeProject) {
                await fetchTestSuites(activeProject);
            }
        } catch (error: unknown) {
            console.error('Failed to delete suite:', error);
            toast.error((error as Error)?.message || 'Failed to delete test suite');
        } finally {
            setIsDeleting(false);
        }
    };

    const location = useLocation();

    useEffect(() => {
        try {
            const open = (location.state as { openNewSuite?: boolean } | null)?.openNewSuite;
            if (open) {
                setIsCreateOpen(true);
                // clear navigation state
                navigate(location.pathname, { replace: true, state: {} });
            }
        } catch {
            // ignore
        }
    }, [location, navigate]);

    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test suites"
            />
        );
    }

    // Show loading spinner only while suites are loading (not waiting for cases)
    if (isSuitesLoading) {
        return (
            <div className="flex flex-col h-auto sm:h-full bg-white dark:bg-gray-900">
                <div className="bg-white dark:bg-gray-900 sm:sticky sm:top-0 sm:z-20">
                    <ContextBreadcrumb
                        showSuiteSelector={false}
                        viewToggle={{ mode: viewMode, onToggle: handleViewModeToggle }}
                    />
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-auto sm:h-full bg-white dark:bg-gray-900">
            {/* Context Breadcrumb - project only, no suite selector */}
            <div className="bg-white dark:bg-gray-900 sm:sticky sm:top-0 sm:z-20">
                <ContextBreadcrumb
                    showSuiteSelector={false}
                    viewToggle={{ mode: viewMode, onToggle: handleViewModeToggle }}
                    rightContent={activeProject ? <ProjectPresenceIndicator users={projectUsers} maxDisplay={4} /> : undefined}
                    beforeToggle={allTags.length > 0 ? (
                        <div className="relative" ref={tagFilterRef}>
                            <button
                                onClick={() => setTagFilterOpen(!tagFilterOpen)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors shadow-sm dark:shadow-none ${
                                    selectedTags.length > 0
                                        ? 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }`}
                            >
                                <Tag size={14} />
                                <span className="hidden sm:inline">Tags</span>
                                {selectedTags.length > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                                        {selectedTags.length}
                                    </span>
                                )}
                                <ChevronDown size={13} className={`text-gray-400 transition-transform ${tagFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {tagFilterOpen && (
                                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                                    <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filter by Tags</p>
                                        {selectedTags.length > 0 && (
                                            <button
                                                onClick={() => setSelectedTags([])}
                                                className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                            >
                                                <X size={11} /> Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-52 overflow-y-auto">
                                        {allTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() =>
                                                    setSelectedTags(prev =>
                                                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                                    )
                                                }
                                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                                    selectedTags.includes(tag)
                                                        ? 'bg-blue-50 dark:bg-blue-900/30'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}>
                                                    <Tag className="h-2.5 w-2.5 opacity-70" />
                                                    {tag}
                                                </span>
                                                {selectedTags.includes(tag) && (
                                                    <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : undefined}
                />
            </div>

            <div className="flex-1 sm:overflow-auto">
                <TestSuiteCreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} projectId={activeProject} />

                <TestSuiteEditModal
                    isOpen={!!suiteToEdit}
                    onClose={() => setSuiteToEdit(null)}
                    suite={suiteToEdit}
                    projectId={activeProject}
                />

                <ConfirmationModal
                    isOpen={!!suiteToDelete}
                    onClose={() => setSuiteToDelete(null)}
                    onConfirm={confirmDeleteSuite}
                    title="Delete Test Suite"
                    message={`Are you sure you want to delete "${suiteToDelete?.name}"? This will permanently remove all test cases in this suite.`}
                    confirmText="Delete Suite"
                    isDestructive={true}
                    isLoading={isDeleting}
                />

                <TestSuiteList
                    testCases={projectTestCases}
                    testSuites={filteredTestSuites}
                    onSuiteClick={handleSuiteClick}
                    onCreate={handleCreateSuite}
                    onEdit={handleEditSuite}
                    onDelete={handleDeleteSuite}
                    viewMode={viewMode}
                    onViewModeToggle={handleViewModeToggle}
                />
            </div>
        </div>
    );
};

export default TestSuitesPage;
