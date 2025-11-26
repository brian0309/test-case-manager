import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Toolbar from '../../components/testManager/Toolbar';
import { useTestManagerStore } from '../../store/testManagerStore';
import { ViewMode } from '../../types/testManager';

const TestManagerLayout: React.FC = () => {
    const { viewMode, setViewMode, activeSuite, setActiveSuite } = useTestManagerStore();
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
        setActiveSuite(null);
        navigate(`/test-manager/${mode}`);
    };

    const handleNew = () => {
        // Handle new item creation based on view mode
        // This logic might need to be moved or shared
        console.log('New item clicked');
    };

    const handleNewCase = () => {
        // Open modal logic - might need to be lifted up or handled via store/events
        console.log('New case clicked');
    };

    return (
        <div className="flex flex-col h-full font-sans text-gray-900">
            <main className="mac-card flex-1 flex flex-col min-w-0 overflow-hidden relative m-4 mt-2">
                <Toolbar
                    viewMode={viewMode}
                    setViewMode={handleViewChange}
                    onNew={handleNew}
                    onNewCase={handleNewCase}
                    activeSuite={activeSuite}
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
