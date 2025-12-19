import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Toolbar from '../../components/testManager/Toolbar';
import ConfirmationModal from '../../components/testManager/ConfirmationModal';
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
        // Selection state
        isSelectionMode,
        setSelectionMode,
        selectedTestCaseIds,
        bulkDeleteTestCases,
        // Export callback
        onExportTestCases,
    } = useTestManagerStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

    // Sync URL with store
    React.useEffect(() => {
        const path = location.pathname;
        if (path.includes('/projects')) setViewMode('projects');
        else if (path.includes('/cases')) setViewMode('cases');
        else if (path.includes('/suites')) setViewMode('suites');
        else if (path.includes('/runs')) setViewMode('runs');
        else if (path.includes('/plans')) setViewMode('plans');
        else if (path.includes('/reports')) setViewMode('reports');
    }, [location.pathname, setViewMode]);

    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode);
        // Only clear suite when going to projects view
        if (mode === 'projects') {
            setActiveSuite(null);
            setActiveSuiteId(null);
        }
        // Exit selection mode when changing views
        if (isSelectionMode) {
            setSelectionMode(false);
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

        if (viewMode === 'runs') {
            // Open the new test run modal on the runs page
            navigate('/test-manager/runs', { state: { openNewRun: true } });
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

    const handleToggleSelectionMode = () => {
        setSelectionMode(!isSelectionMode);
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await bulkDeleteTestCases(selectedTestCaseIds);
            setIsDeleteModalOpen(false);
            // Toast success handled by store or component? Ideally here or store.
            // Since we don't have toast here, we rely on the component to show updates.
        } catch (error) {
            console.error("Failed to delete test cases", error);
        }
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
                    // Selection props
                    isSelectionMode={isSelectionMode}
                    onToggleSelectionMode={handleToggleSelectionMode}
                    selectedCount={selectedTestCaseIds.length}
                    onDelete={handleDeleteClick}
                    // Export prop
                    onDownload={onExportTestCases || undefined}
                />
                <div className="flex-1 overflow-auto relative">
                    <Outlet />
                </div>
            </main>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Delete ${selectedTestCaseIds.length} Test Case${selectedTestCaseIds.length !== 1 ? 's' : ''}`}
                message={`Are you sure you want to delete ${selectedTestCaseIds.length} test case${selectedTestCaseIds.length !== 1 ? 's' : ''}? This action cannot be undone.`}
                confirmText="Delete"
                isDestructive={true}
            />
        </div>
    );
};

export default TestManagerLayout;
