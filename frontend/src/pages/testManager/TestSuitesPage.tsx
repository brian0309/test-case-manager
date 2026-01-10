import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTestManagerStore } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import TestSuiteList from '../../components/testManager/TestSuiteList';
import TestSuiteCreateModal from '../../components/testManager/TestSuiteCreateModal';
import TestSuiteEditModal from '../../components/testManager/TestSuiteEditModal';
import ConfirmationModal from '../../components/testManager/ConfirmationModal';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import { TestSuite } from '../../types/testManager';

const TestSuitesPage: React.FC = () => {
    const { activeProject, testCases, testSuites, projects, setActiveSuiteWithId, fetchTestCases, fetchTestSuites, fetchTestCasesByProject, fetchProjects, deleteTestSuite, setActiveProject } = useTestManagerStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Track processed projectId to prevent double loading
    const processedProjectIdRef = useRef<string | null>(null);

    const [isSuitesLoading, setIsSuitesLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [suiteToEdit, setSuiteToEdit] = useState<TestSuite | null>(null);
    const [suiteToDelete, setSuiteToDelete] = useState<TestSuite | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
    }, [activeProject, fetchTestSuites, fetchTestCasesByProject]);

    // Filter test cases by active project
    const projectTestCases = activeProject
        ? testCases.filter(tc => tc.projectId === activeProject)
        : [];

    const handleSuiteClick = (suiteName: string, suiteId?: string) => {
        if (suiteId) {
            // Set both suite id and name in the store for proper context
            setActiveSuiteWithId(suiteId, suiteName);
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
        } catch (error: any) {
            console.error('Failed to delete suite:', error);
            toast.error(error?.message || 'Failed to delete test suite');
        } finally {
            setIsDeleting(false);
        }
    };

    const location = useLocation();

    useEffect(() => {
        try {
            const open = (location.state as any)?.openNewSuite;
            if (open) {
                setIsCreateOpen(true);
                // clear navigation state
                navigate(location.pathname, { replace: true, state: {} });
            }
        } catch (e) {
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
            <div className="flex flex-col h-auto sm:h-full">
                <div className="bg-gray-50 dark:bg-gray-800 sm:sticky sm:top-0 sm:z-20">
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
            <div className="bg-gray-50 dark:bg-gray-800 sm:sticky sm:top-0 sm:z-20">
                <ContextBreadcrumb
                    showSuiteSelector={false}
                    viewToggle={{ mode: viewMode, onToggle: handleViewModeToggle }}
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
                    testSuites={testSuites}
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
