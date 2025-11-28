import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TestCaseTable from '../../components/testManager/TestCaseTable';
import TestCaseModal from '../../components/testManager/TestCaseModal';
import TestCaseViewModal from '../../components/testManager/TestCaseViewModal';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import { useTestManagerStore } from '../../store/testManagerStore';
import { TestCase, Status, Priority } from '../../types/testManager';

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
        testSuites,
        fetchTestSuites,
        fetchTestCases,
        fetchTestCasesByProject,
    } = useTestManagerStore();
    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
    const [viewCase, setViewCase] = useState<TestCase | null>(null);
    const [isListEditMode] = useState(false);

    const uniqueAreas = Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort();

    const location = useLocation();
    const navigate = useNavigate();

    // Ensure projects are loaded when this page is visited directly
    useEffect(() => {
        fetchProjects?.();
    }, [fetchProjects]);

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
                stepsContent: (updatedCase as any).stepsContent,
                comments: updatedCase.comments,
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
            stepsContent: (updatedCase as any).stepsContent,
            comments: updatedCase.comments,
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
    const displayedCases = activeArea
        ? testCases.filter(tc => tc.area === activeArea)
        : testCases;

    return (
        <div className="flex flex-col h-full">
            {/* Context Breadcrumb with Project & Suite selectors */}
            <ContextBreadcrumb showSuiteSelector={true} />

            {/* Test Case Table */}
            <div className="flex-1 overflow-auto">
                <TestCaseTable
                    data={displayedCases}
                    onRowClick={handleRowClick}
                    onViewClick={handleViewClick}
                    isEditMode={isListEditMode}
                    onUpdate={handleInlineUpdate}
                    onStatusChange={handleStatusChange}
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
        </div>
    );
};

export default TestCasesPage;
