import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import Toolbar from '../../components/testManager/Toolbar';
import TestSuiteSidebar from '../../components/testManager/TestSuiteSidebar';
import TestSuiteSidebarDrawer from '../../components/testManager/TestSuiteSidebarDrawer';
import TestSuiteSidebarToggle from '../../components/testManager/TestSuiteSidebarToggle';
import ConfirmationModal from '../../components/testManager/ConfirmationModal';
import { useTestManagerStore } from '../../store/testManagerStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ViewMode } from '../../types/testManager';

const TestManagerLayout: React.FC = () => {
    const {
        viewMode,
        isRunDetailViewOpen,
        isTicketDetailViewOpen,
        setViewMode,
        activeSuite,
        activeSuiteId,
        setActiveSuite,
        setActiveSuiteId,
        setActiveSuiteWithId,
        setActiveArea,
        clearFilters,
        activeProject,
        testSuites,
        // Selection state
        isSelectionMode,
        setSelectionMode,
        selectedTestCaseIds,
        bulkDeleteTestCases,
        // Export callback
        onExportTestCases,
        // Import callback
        onImportTestCases,
    } = useTestManagerStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const isMobile = useMediaQuery('(max-width: 767px)');
    const [isSuiteSidebarOpen, setIsSuiteSidebarOpen] = React.useState(() => !isMobile);

    // Close the mobile suite sidebar when leaving the cases view
    React.useEffect(() => {
        if (isMobile && !location.pathname.includes('/cases')) {
            setIsSuiteSidebarOpen(false);
        }
    }, [location.pathname, isMobile]);

    // Sync URL with store
    React.useEffect(() => {
        const path = location.pathname;
        if (path.includes('/projects')) setViewMode('projects');
        else if (path.includes('/cases')) setViewMode('cases');
        else if (path.includes('/suites')) setViewMode('suites');
        else if (path.includes('/runs')) setViewMode('runs');
        else if (path.includes('/tickets')) setViewMode('tickets');
    }, [location.pathname, setViewMode]);

    const handleViewChange = (mode: ViewMode) => {
        if (isMobile) {
            setIsSuiteSidebarOpen(false);
        }
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

        if (viewMode === 'tickets') {
            // Open the new ticket modal on the tickets page
            navigate('/test-manager/tickets', { state: { openNewTicket: true } });
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

    const handleSuiteSelect = (suiteId: string | null) => {
        if (isMobile) {
            setIsSuiteSidebarOpen(false);
        }
        if (suiteId === null) {
            setActiveSuite(null);
            setActiveSuiteId(null);
        } else {
            const suite = testSuites.find(s => s.id === suiteId);
            setActiveSuiteWithId(suiteId, suite?.name ?? '');
        }
        setActiveArea(null);
        clearFilters();
    };

    const showSuiteSidebar = viewMode === 'cases' && !!activeProject;
    const totalProjectCaseCount = testSuites.reduce((sum, s) => sum + (s.caseCount ?? 0), 0);

    // Auto-hide the desktop sidebar toggle after 3s while the sidebar is open
    const [isToggleVisible, setIsToggleVisible] = React.useState(true);
    React.useEffect(() => {
        if (isMobile || !showSuiteSidebar || !isSuiteSidebarOpen) {
            setIsToggleVisible(true);
            return;
        }
        const timer = setTimeout(() => setIsToggleVisible(false), 3000);
        return () => clearTimeout(timer);
    }, [isMobile, showSuiteSidebar, isSuiteSidebarOpen, isToggleVisible]);

    return (
        <div className="flex flex-col h-full font-sans text-gray-900 dark:text-gray-100">
            <main className="mac-card flex-1 flex flex-col min-w-0 overflow-hidden relative">
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
                    // Import prop
                    onUpload={onImportTestCases || undefined}
                    hideNewButton={(viewMode === 'runs' && isRunDetailViewOpen) || (viewMode === 'tickets' && isTicketDetailViewOpen)}
                />
                <div className="flex-1 flex overflow-hidden">
                    {showSuiteSidebar && !isMobile && (
                        <>
                            {isSuiteSidebarOpen && (
                                <div
                                    className="flex-shrink-0"
                                    onMouseMove={() => setIsToggleVisible(true)}
                                >
                                    <TestSuiteSidebar
                                        testSuites={testSuites}
                                        activeSuiteId={activeSuiteId}
                                        projectCaseCount={totalProjectCaseCount}
                                        onSuiteSelect={handleSuiteSelect}
                                        onCreateSuite={() => navigate('/test-manager/suites', { state: { openNewSuite: true } })}
                                    />
                                </div>
                            )}
                            <TestSuiteSidebarToggle
                                isOpen={isSuiteSidebarOpen}
                                onToggle={() => setIsSuiteSidebarOpen(prev => !prev)}
                                openOffsetClass="translate-x-56"
                                size="sm"
                                visible={isSuiteSidebarOpen ? isToggleVisible : true}
                                onReveal={() => setIsToggleVisible(true)}
                            />
                        </>
                    )}
                    <div className="flex-1 overflow-auto relative">
                        <Outlet />
                    </div>
                </div>
                {showSuiteSidebar && isMobile && (
                    <TestSuiteSidebarDrawer
                        isOpen={isSuiteSidebarOpen}
                        onClose={() => setIsSuiteSidebarOpen(false)}
                        onToggle={() => setIsSuiteSidebarOpen(prev => !prev)}
                    >
                        <TestSuiteSidebar
                            testSuites={testSuites}
                            activeSuiteId={activeSuiteId}
                            projectCaseCount={totalProjectCaseCount}
                            onSuiteSelect={handleSuiteSelect}
                            onCreateSuite={() => navigate('/test-manager/suites', { state: { openNewSuite: true } })}
                            isMobile
                            onClose={() => setIsSuiteSidebarOpen(false)}
                        />
                    </TestSuiteSidebarDrawer>
                )}
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
