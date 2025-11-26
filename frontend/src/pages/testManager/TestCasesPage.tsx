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
    }, [location, navigate, activeProject, activeSuite]);

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

    const handleSaveCase = async (updatedCase: TestCase) => {
        const exists = testCases.find(c => c.id === updatedCase.id);
        if (exists) {
            updateTestCase(updatedCase.id, {
                title: updatedCase.title,
                priority: updatedCase.priority,
                status: updatedCase.status,
                area: updatedCase.area,
                expectedResult: updatedCase.expectedResult,
                stepsContent: (updatedCase as any).stepsContent,
                comments: updatedCase.comments,
            } as any);
            setSelectedCase(null);
            return;
        }

        // New case: attempt to create via API if we can resolve a suite id
        try {
            // Find a suite matching the selected suite name within the selected project
            const suite = testSuites.find(s => s.name === updatedCase.suite && s.projectId === updatedCase.projectId);
            if (!suite) {
                alert('Please select a Test Suite for the new case before saving.');
                return;
            }

            await createTestCase(suite.id, {
                title: updatedCase.title,
                priority: updatedCase.priority,
                status: updatedCase.status,
                area: updatedCase.area,
                expectedResult: updatedCase.expectedResult,
                stepsContent: (updatedCase as any).stepsContent,
                comments: updatedCase.comments,
            } as any);

            // closing modal (store will update list)
            setSelectedCase(null);
        } catch (err) {
            // error handled by store
        }
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
    const displayedCases = testCases;

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
                />
            )}
            {selectedCase && (
                <TestCaseModal
                    testCase={selectedCase}
                    availableAreas={uniqueAreas}
                    onClose={() => setSelectedCase(null)}
                    onSave={handleSaveCase}
                />
            )}
        </div>
    );
};

export default TestCasesPage;
