import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import TestCaseTable from '../../components/testManager/TestCaseTable';
import TestCaseModal from '../../components/testManager/TestCaseModal';
import TestCaseViewModal from '../../components/testManager/TestCaseViewModal';
import FilterModal from '../../components/testManager/FilterModal';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import GeminiGenerationModal from '../../components/testManager/GeminiGenerationModal';
import { useTestManagerStore } from '../../store/testManagerStore';
import { TestCase, Status, Priority, CustomFieldDefinition, HiddenDefaultColumns } from '../../types/testManager';
import { reorderTestCases } from '../../services/testManagerApi';
import { Sparkles } from 'lucide-react';

const TestCasesPage: React.FC = () => {
    const {
        testCases,
        activeSuite,
        activeSuiteId,
        activeProject,
        activeArea,
        updateTestCase,
        createTestCase,
        fetchProjects,
        projects,
        testSuites,
        fetchTestSuites,
        fetchTestCases,
        fetchTestCasesByProject,
        filters,
        isFilterModalOpen,
        searchQuery,
        clearSearchQuery,
        // Selection
        isSelectionMode,
        selectedTestCaseIds,
        toggleTestCaseSelection,
        selectAllTestCases,
        clearSelection,
        // Project settings
        fetchProjectSettings,
        getProjectSettings,
    } = useTestManagerStore();
    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
    const [viewCase, setViewCase] = useState<TestCase | null>(null);
    const [isListEditMode] = useState(false);

    const uniqueAreas = Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort();

    const location = useLocation();
    const navigate = useNavigate();

    // Load project settings when active project changes
    useEffect(() => {
        if (activeProject) {
            fetchProjectSettings(activeProject);
        }
    }, [activeProject, fetchProjectSettings]);

    // Get custom fields and visibility settings for table (filter out deleted fields)
    const projectSettings = activeProject ? getProjectSettings(activeProject) : null;
    const customFieldDefinitions: CustomFieldDefinition[] = (projectSettings?.testCases?.customFields || []).filter((f: CustomFieldDefinition) => !f.deleted);
    const visibleCustomFieldIds: string[] = projectSettings?.testCases?.table?.visibleCustomFieldIds || [];
    const hiddenColumns: HiddenDefaultColumns = projectSettings?.testCases?.table?.hiddenDefaultColumns || {};

    // Ensure projects are loaded when this page is visited directly
    useEffect(() => {
        fetchProjects?.();
        clearSearchQuery(); // Clear search when entering
        return () => clearSearchQuery(); // Clear search when leaving
    }, [fetchProjects, clearSearchQuery]);

    // Fetch test suites when project is active
    useEffect(() => {
        if (activeProject) {
            fetchTestSuites(activeProject);
        }
    }, [activeProject, fetchTestSuites]);

    // Fetch test cases based on suite or project selection
    useEffect(() => {
        if (activeSuiteId) {
            // If a specific suite is selected, fetch only that suite's cases
            fetchTestCases(activeSuiteId);
        } else if (activeProject) {
            // If no suite is selected but project is, fetch all cases for the project
            fetchTestCasesByProject(activeProject);
        }
    }, [activeSuiteId, activeProject, fetchTestCases, fetchTestCasesByProject]);

    // Open modal if navigation state asked for it (from toolbar quick-add)
    useEffect(() => {
        try {
            const open = (location.state as any)?.openNewCase;
            if (open) {
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
                    suite: activeSuite || '',
                    area: activeArea || '',
                    steps: [],
                    projectId: activeProject || '',
                };

                setSelectedCase(newCase);

                // clear navigation state so it doesn't reopen on refresh/back
                navigate(location.pathname, { replace: true, state: {} });
            }
        } catch (e) {
            // ignore
        }
    }, [location, navigate, activeProject, activeSuite, activeArea]);

    const handleRowClick = (item: TestCase) => {
        if (isListEditMode) return;
        // Row click opens view-only modal
        setViewCase(item);
    };

    const handleViewClick = (item: TestCase) => {
        // View button opens edit modal
        setSelectedCase(item);
    };

    const handleEditFromView = (item: TestCase) => {
        // Close view modal and open edit modal
        setViewCase(null);
        setSelectedCase(item);
    };

    const handleInlineUpdate = (caseId: string, field: keyof TestCase, value: any) => {
        updateTestCase(caseId, { [field]: value } as any);
    };

    const handleStatusChange = (caseId: string, status: Status) => {
        updateTestCase(caseId, { status: status, lastModified: new Date().toISOString() } as any);
    };

    const handleSaveCase = async (updatedCase: TestCase): Promise<TestCase | void> => {
        const exists = testCases.find(c => c.id === updatedCase.id);
        if (exists) {
            await updateTestCase(updatedCase.id, {
                title: updatedCase.title,
                priority: updatedCase.priority,
                status: updatedCase.status,
                area: updatedCase.area,
                expectedResult: updatedCase.expectedResult,
                testDescription: (updatedCase as any).testDescription,
                stepsContent: (updatedCase as any).stepsContent,
                comments: updatedCase.comments,
                customFields: updatedCase.customFields,
            } as any);
            // Don't close modal - auto-save should keep it open
            return;
        }

        // New case: attempt to create via API if we can resolve a suite id
        // Find a suite matching the selected suite name within the selected project
        const suite = testSuites.find(s => s.name === updatedCase.suite && s.projectId === updatedCase.projectId);
        if (!suite) {
            throw new Error('Please select a Test Suite for the new case before saving.');
        }

        const createdCase = await createTestCase(suite.id, {
            title: updatedCase.title,
            priority: updatedCase.priority,
            status: updatedCase.status,
            area: updatedCase.area,
            expectedResult: updatedCase.expectedResult,
            testDescription: (updatedCase as any).testDescription,
            stepsContent: (updatedCase as any).stepsContent,
            comments: updatedCase.comments,
            customFields: updatedCase.customFields,
        } as any);

        // Return the created case so the modal can update its state with the real ID
        return createdCase;
    };

    if (!activeProject && !selectedCase) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test cases"
            />
        );
    }

    // Display all cases from the store - filtering is now handled by the API calls
    // Also filter by activeArea if selected
    let displayedCases = activeArea
        ? testCases.filter(tc => tc.area === activeArea)
        : testCases;

    // Apply client-side filters
    if (filters.status.length > 0) {
        displayedCases = displayedCases.filter(tc => filters.status.includes(tc.status));
    }

    if (filters.priority.length > 0) {
        displayedCases = displayedCases.filter(tc => filters.priority.includes(tc.priority));
    }

    if (filters.dateRange.start) {
        const startDate = new Date(filters.dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        displayedCases = displayedCases.filter(tc => new Date(tc.lastModified) >= startDate);
    }

    if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        displayedCases = displayedCases.filter(tc => new Date(tc.lastModified) <= endDate);
    }

    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        displayedCases = displayedCases.filter(tc =>
            tc.title.toLowerCase().includes(query) ||
            tc.id.toLowerCase().includes(query) ||
            (tc.area && tc.area.toLowerCase().includes(query))
        );
    }

    const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);

    // Handle drag-and-drop reordering of test cases
    const handleReorder = async (reorderedCases: TestCase[]) => {
        if (!activeSuiteId) {
            toast.error('Reordering is only available within a specific suite');
            return;
        }

        try {
            const orderedIds = reorderedCases.map(tc => tc.id);
            await reorderTestCases(activeSuiteId, orderedIds);
            // Refetch to get updated order from server
            fetchTestCases(activeSuiteId);
        } catch (error) {
            toast.error('Failed to save new order');
            console.error('Reorder error:', error);
        }
    };

    const handleAddGeneratedCases = async (cases: TestCase[]) => {
        // We need to save these cases to the backend
        // Iterate and create each one
        // Note: createTestCase expects a suiteId.
        if (!activeSuiteId) return;

        for (const testCase of cases) {
            // Format steps into a readable HTML list for the editor
            const stepsHtml = testCase.steps && testCase.steps.length > 0
                ? `<ol>${testCase.steps.map(s => `<li><strong>${s.action}</strong> - <em>${s.expectedResult}</em></li>`).join('')}</ol>`
                : '';

            await createTestCase(activeSuiteId, {
                title: testCase.title,
                priority: testCase.priority,
                status: testCase.status,
                area: testCase.area,
                expectedResult: (testCase.steps && testCase.steps.length > 0) ? testCase.steps[testCase.steps.length - 1].expectedResult : '',
                testDescription: (testCase as any).testDescription || '',
                stepsContent: stepsHtml,
                steps: testCase.steps, // Also save structured steps if backend supports it
                comments: '',
            } as any);
        }
        toast.success(`Added ${cases.length} test cases`);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Context Breadcrumb with Project & Suite selectors */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:justify-between px-4 sm:pr-4 sm:pl-0">
                <ContextBreadcrumb showSuiteSelector={true} />
                {activeProject && activeSuiteId && (
                    <button
                        onClick={() => setIsGeminiModalOpen(true)}
                        className="flex items-center justify-center sm:justify-start space-x-2 px-3 py-2 sm:py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-md hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm w-full sm:w-auto flex-shrink-0"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Generate with AI</span>
                    </button>
                )}
            </div>

            {/* Test Case Table */}
            <div className="flex-1 overflow-auto">
                <TestCaseTable
                    data={displayedCases}
                    onRowClick={handleRowClick}
                    onViewClick={handleViewClick}
                    isEditMode={isListEditMode}
                    onUpdate={handleInlineUpdate}
                    onStatusChange={handleStatusChange}
                    enableReorder={!!activeSuiteId}
                    onReorder={activeSuiteId ? handleReorder : undefined}
                    // Selection props
                    isSelectionMode={isSelectionMode}
                    selectedIds={selectedTestCaseIds}
                    onToggleSelection={toggleTestCaseSelection}
                    onSelectAll={(selectAll: boolean) => {
                        if (selectAll) {
                            selectAllTestCases(displayedCases.map(tc => tc.id));
                        } else {
                            clearSelection();
                        }
                    }}
                    // Custom fields and visibility props
                    customFieldDefinitions={customFieldDefinitions}
                    visibleCustomFieldIds={visibleCustomFieldIds}
                    hiddenColumns={hiddenColumns}
                />
            </div>
            {viewCase && (
                <TestCaseViewModal
                    testCase={viewCase}
                    testCases={displayedCases}
                    onClose={() => setViewCase(null)}
                    onEdit={handleEditFromView}
                    onUpdate={(updatedCase) => {
                        updateTestCase(updatedCase.id, {
                            title: updatedCase.title,
                            priority: updatedCase.priority,
                            status: updatedCase.status,
                            area: updatedCase.area,
                            expectedResult: updatedCase.expectedResult,
                            stepsContent: (updatedCase as any).stepsContent,
                            comments: updatedCase.comments,
                            customFields: updatedCase.customFields,
                        } as any);
                        setViewCase(prev => prev ? { ...prev, ...updatedCase } : updatedCase); // Update local state to reflect changes
                    }}
                    onNavigate={idx => setViewCase(displayedCases[idx])}
                />
            )}
            {selectedCase && (
                <TestCaseModal
                    testCase={selectedCase}
                    availableAreas={uniqueAreas}
                    onClose={() => setSelectedCase(null)}
                    onSave={handleSaveCase}
                    onBack={(updatedCase) => {
                        // Close editor and reopen view modal with updated values
                        setSelectedCase(null);
                        setViewCase(updatedCase);
                    }}
                />
            )}
            {isFilterModalOpen && <FilterModal />}
            {isGeminiModalOpen && activeProject && activeSuiteId && (
                <GeminiGenerationModal
                    onClose={() => setIsGeminiModalOpen(false)}
                    onAddCases={handleAddGeneratedCases}
                    projectContext={projects.find(p => p.id === activeProject)?.name || activeProject || ''}
                    suiteContext={activeSuite || activeSuiteId}
                    projectId={activeProject}
                    suiteId={activeSuiteId}
                    existingTestCases={displayedCases.map(tc => tc.title)}
                />
            )}
        </div>
    );
};

export default TestCasesPage;
