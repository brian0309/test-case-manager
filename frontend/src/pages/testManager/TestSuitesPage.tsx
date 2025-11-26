import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTestManagerStore } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import TestSuiteList from '../../components/testManager/TestSuiteList';
import TestSuiteCreateModal from '../../components/testManager/TestSuiteCreateModal';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';

const TestSuitesPage: React.FC = () => {
    const { activeProject, testCases, testSuites, setActiveSuiteWithId, fetchTestCases, fetchTestSuites, fetchProjects } = useTestManagerStore();
    const navigate = useNavigate();

    // Ensure projects are loaded when this page is visited directly
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Fetch test suites when project is active (including on page reload with persisted state)
    useEffect(() => {
        if (activeProject) {
            fetchTestSuites(activeProject);
        }
    }, [activeProject, fetchTestSuites]);

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

    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const handleCreateSuite = () => {
        setIsCreateOpen(true);
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

    return (
        <div className="flex flex-col h-full">
            {/* Context Breadcrumb - project only, no suite selector */}
            <ContextBreadcrumb showSuiteSelector={false} />
            
            <div className="flex-1 overflow-auto">
                <TestSuiteCreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} projectId={activeProject} />
                <TestSuiteList
                    testCases={projectTestCases}
                    testSuites={testSuites}
                    onSuiteClick={handleSuiteClick}
                    onCreate={handleCreateSuite}
                />
            </div>
        </div>
    );
};

export default TestSuitesPage;
