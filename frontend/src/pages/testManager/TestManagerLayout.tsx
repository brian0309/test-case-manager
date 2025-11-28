import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Toolbar from '../../components/testManager/Toolbar';
import { useTestManagerStore } from '../../store/testManagerStore';
import { ViewMode } from '../../types/testManager';

const TestManagerLayout: React.FC = () => {
    const { 
        viewMode, 
        setViewMode, 
        activeSuite, 
        activeSuiteId,
        setActiveSuite, 
        setActiveSuiteId,
        activeProject,
    } = useTestManagerStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Sync URL with store
    React.useEffect(() => {
        const path = location.pathname;
        if (path.includes('/projects')) setViewMode('projects');
        else if (path.includes('/cases')) setViewMode('cases');
        else if (path.includes('/suites')) setViewMode('suites');
        else if (path.includes('/plans')) setViewMode('plans');
    }, [location.pathname, setViewMode]);

    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode);
        // Only clear suite when going to projects view
        if (mode === 'projects') {
            setActiveSuite(null);
            setActiveSuiteId(null);
        }
        navigate(`/test-manager/${mode}`);
    };

    const handleNew = () => {
        // Open the create modal for the current view.
        if (viewMode === 'projects') {
            navigate('/test-manager/projects', { state: { openNew: true } });
            return;
        }

        if (viewMode === 'suites') {
            navigate('/test-manager/suites', { state: { openNewSuite: true } });
            return;
        }

        if (viewMode === 'cases') {
            // Open the new test case modal on the cases page
            navigate('/test-manager/cases', { state: { openNewCase: true } });
            return;
        }

        // Default: go to projects and open projects modal
        setViewMode('projects');
        navigate('/test-manager/projects', { state: { openNew: true } });
    };

    const handleNewCase = () => {
        // Navigate to the cases view and request the page to open the "new case" modal
        navigate('/test-manager/cases', { state: { openNewCase: true } });
    };

    return (
        <div className="flex flex-col h-full font-sans text-gray-900">
            <main className="mac-card flex-1 flex flex-col min-w-0 overflow-hidden relative mx-2 my-2">
                <Toolbar
                    viewMode={viewMode}
                    setViewMode={handleViewChange}
                    onNew={handleNew}
                    onNewCase={handleNewCase}
                    activeSuite={activeSuite}
                    activeSuiteId={activeSuiteId}
                    activeProject={activeProject}
                    showEditToggle={viewMode === 'cases'}
                />
                <div className="flex-1 overflow-auto relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default TestManagerLayout;
