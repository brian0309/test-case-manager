import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    const { activeProject, testCases, testSuites, projects, setActiveSuiteWithId, fetchTestCases, fetchTestSuites, fetchTestCasesByProject, fetchProjects, deleteTestSuite } = useTestManagerStore();
    const navigate = useNavigate();
    const [isSuitesLoading, setIsSuitesLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [suiteToEdit, setSuiteToEdit] = useState<TestSuite | null>(null);
    const [suiteToDelete, setSuiteToDelete] = useState<TestSuite | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Ensure projects are loaded when this page is visited directly (only if not already loaded)
    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects();
        }
    }, [projects.length, fetchProjects]);

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
            <div className="flex flex-col h-full">
                <ContextBreadcrumb showSuiteSelector={false} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Context Breadcrumb - project only, no suite selector */}
            <ContextBreadcrumb showSuiteSelector={false} />
            
            <div className="flex-1 overflow-auto">
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
                />
            </div>
        </div>
    );
};

export default TestSuitesPage;
