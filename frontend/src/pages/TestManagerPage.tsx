
import React, { useState, useEffect } from 'react';
import Toolbar from '../components/testManager/Toolbar';
import TestCaseTable from '../components/testManager/TestCaseTable';
import TestCaseModal from '../components/testManager/TestCaseModal';
import TestSuiteList from '../components/testManager/TestSuiteList';
import ProjectList from '../components/testManager/ProjectList';
import { TestCase, Priority, Status, ViewMode } from '../types/testManager';
import { useTestManagerStore } from '../store/testManagerStore';
import { Loader } from 'lucide-react';

const TestManagerPage: React.FC = () => {
    // Use global store for all state
    const {
        viewMode,
        setViewMode,
        activeSuite,
        setActiveSuite,
        activeSuiteId,
        setActiveSuiteId,
        activeProject,
        setActiveProject,
        testCases,
        projects,
        testSuites,
        isLoading,
        error,
        activeArea,
        clearError,
        fetchProjects,
        createProject,
        fetchTestSuites,
        createTestSuite,
        fetchTestCases,
        createTestCase,
        updateTestCase,
        updateTestCaseLocal,
    } = useTestManagerStore();

    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);

    // Edit Mode State
    const [isListEditMode, setIsListEditMode] = useState(false);

    // Suite view mode (card vs table)
    const [suiteViewMode, setSuiteViewMode] = useState<'card' | 'table'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('suiteViewMode');
            return saved === 'card' ? 'card' : 'table';
        }
        return 'table';
    });

    const handleSuiteViewModeToggle = () => {
        const newMode = suiteViewMode === 'card' ? 'table' : 'card';
        setSuiteViewMode(newMode);
        localStorage.setItem('suiteViewMode', newMode);
    };

    // Fetch projects on mount
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Fetch test suites when project is selected
    useEffect(() => {
        if (activeProject && viewMode === 'suites') {
            fetchTestSuites(activeProject);
        }
    }, [activeProject, viewMode, fetchTestSuites]);

    // Fetch test cases when suite is selected
    useEffect(() => {
        if (activeSuiteId && viewMode === 'cases') {
            fetchTestCases(activeSuiteId);
        }
    }, [activeSuiteId, viewMode, fetchTestCases]);

    // Derived state for available areas
    const uniqueAreas = Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort();

    // Reset edit mode when view changes
    useEffect(() => {
        setIsListEditMode(false);
    }, [viewMode]);

    // Clear error after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => clearError(), 5000);
            return () => clearTimeout(timer);
        }
    }, [error, clearError]);

    const handleRowClick = (item: TestCase) => {
        if (isListEditMode) return;
        setSelectedCase(item);
    };

    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode);
        if (mode === 'projects') {
            setActiveSuite(null);
            setActiveSuiteId(null);
            setActiveProject(null);
        }
    };

    const handleSuiteClick = (suiteName: string, suiteId?: string) => {
        setActiveSuite(suiteName);
        if (suiteId) {
            setActiveSuiteId(suiteId);
        }
        setViewMode('cases');
    };

    const handleProjectClick = (projectId: string) => {
        setActiveProject(projectId);
        setViewMode('suites');
    };

    const handleCreateSuite = async () => {
        if (!activeProject) {
            alert("Please select a project first");
            return;
        }

        const name = prompt("Enter a name for the new Test Suite:");
        if (!name) return;

        try {
            const suite = await createTestSuite(activeProject, { name });
            setActiveSuite(suite.name);
            setActiveSuiteId(suite.id);
            setViewMode('cases');
        } catch {
            // Error is handled in store
        }
    };

    const handleCreateProject = async () => {
        const name = prompt("Enter Project Name:");
        if (!name) return;

        try {
            await createProject({
                name,
                description: 'New project workspace',
                color: 'bg-blue-500',
            });
        } catch {
            // Error is handled in store
        }
    };

    const createNewTestCase = () => {
        if (!activeSuiteId) {
            alert("Please select a test suite first");
            return;
        }

        // Create a temporary local test case for the modal
        const newCase: TestCase = {
            id: `new-${Date.now()}`,
            title: 'New Test Case',
            priority: Priority.Medium,
            status: Status.Draft,
            lastModified: new Date().toISOString(),
            assignedTester: {
                id: 'u-current',
                name: 'You',
                avatar: 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
            },
            suite: activeSuite || 'Unassigned',
            steps: [],
            projectId: activeProject || '',
        };
        setSelectedCase(newCase);
    };

    const handlePrimaryAction = () => {
        if (viewMode === 'suites') {
            handleCreateSuite();
            return;
        }
        if (viewMode === 'projects') {
            handleCreateProject();
            return;
        }
        createNewTestCase();
    };

    const handleSaveCase = async (updatedCase: TestCase): Promise<TestCase | void> => {
        if (!activeSuiteId) return;

        if (updatedCase.id.startsWith('new-')) {
            // Create new test case and return it so modal can update with real ID
            const createdCase = await createTestCase(activeSuiteId, {
                title: updatedCase.title,
                priority: updatedCase.priority,
                status: updatedCase.status,
                area: updatedCase.area,
                expectedResult: updatedCase.expectedResult,
                testDescription: updatedCase.testDescription,
                stepsContent: updatedCase.stepsContent,
                comments: updatedCase.comments,
            });
            return createdCase;
        } else {
            // Update existing test case - don't close modal (auto-save)
            await updateTestCase(updatedCase.id, {
                title: updatedCase.title,
                priority: updatedCase.priority,
                status: updatedCase.status,
                area: updatedCase.area,
                    expectedResult: updatedCase.expectedResult,
                    testDescription: updatedCase.testDescription,
                    stepsContent: updatedCase.stepsContent,
                    comments: updatedCase.comments,
            });
        }
    };

    // Inline update handler for the Table Edit Mode
    const handleInlineUpdate = async (caseId: string, field: keyof TestCase, value: string | number | boolean | Status | Priority) => {
        // Optimistic update
        const testCase = testCases.find(tc => tc.id === caseId);
        if (testCase) {
            updateTestCaseLocal({ ...testCase, [field]: value });
        }

        // API update
        try {
            await updateTestCase(caseId, { [field]: value });
        } catch {
            // Revert on error - refetch
            if (activeSuiteId) {
                fetchTestCases(activeSuiteId);
            }
        }
    };

    const handleStatusChange = async (caseId: string, status: Status) => {
        await handleInlineUpdate(caseId, 'status', status);
    };

    // Filter logic - now handled by API based on suite
    const displayedCases = testCases;

    return (
        <div className="flex flex-col h-full font-sans text-gray-900">
            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 mb-0">
                    <div className="flex items-center">
                        <span className="text-red-700">{error}</span>
                        <button
                            onClick={clearError}
                            className="ml-auto text-red-500 hover:text-red-700"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <main className="mac-card flex-1 flex flex-col min-w-0 overflow-hidden relative mx-2 my-2">
                <Toolbar
                    viewMode={viewMode}
                    setViewMode={handleViewChange}
                    onNew={handlePrimaryAction}
                    onNewCase={createNewTestCase}
                    activeSuite={activeSuite}
                    isEditMode={isListEditMode}
                    onToggleEditMode={() => setIsListEditMode(!isListEditMode)}
                    showEditToggle={viewMode === 'cases'}
                />

                <div className="flex-1 overflow-auto relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                            <Loader className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    )}

                    {viewMode === 'projects' && (
                        <ProjectList
                            projects={projects}
                            onProjectClick={handleProjectClick}
                            onCreate={handleCreateProject}
                        />
                    )}

                    {viewMode === 'cases' && (
                        <TestCaseTable
                            data={displayedCases}
                            onRowClick={handleRowClick}
                            isEditMode={isListEditMode}
                            onUpdate={handleInlineUpdate}
                            onStatusChange={handleStatusChange}
                            activeArea={activeArea}
                            activeSuiteId={activeSuiteId}
                        />
                    )}

                    {viewMode === 'suites' && (
                        <TestSuiteList
                            testCases={testCases}
                            testSuites={testSuites}
                            onSuiteClick={handleSuiteClick}
                            onCreate={handleCreateSuite}
                            viewMode={suiteViewMode}
                            onViewModeToggle={handleSuiteViewModeToggle}
                        />
                    )}
                </div>
            </main>

            {selectedCase && (
                <TestCaseModal
                    testCase={selectedCase}
                    availableAreas={uniqueAreas}
                    onClose={() => setSelectedCase(null)}
                    onSave={handleSaveCase}
                    onBack={() => setSelectedCase(null)}
                />
            )}
        </div>
    );
};

export default TestManagerPage;
