
import React, { useState, useEffect } from 'react';
import Toolbar from '../components/testManager/Toolbar';
import TestCaseTable from '../components/testManager/TestCaseTable';
import TestCaseModal from '../components/testManager/TestCaseModal';
import TestSuiteList from '../components/testManager/TestSuiteList';
import ProjectList from '../components/testManager/ProjectList';
import { mockTestCases, mockProjects } from '../utils/mockData';
import { TestCase, Priority, Status, Project } from '../types/testManager';
import { useTestManagerStore } from '../store/testManagerStore';

const TestManagerPage: React.FC = () => {
    // Use global store for navigation state
    const { viewMode, setViewMode, activeSuite, setActiveSuite } = useTestManagerStore();

    const [testCases, setTestCases] = useState<TestCase[]>(mockTestCases);
    const [projects, setProjects] = useState<Project[]>(mockProjects);

    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);

    // Edit Mode State
    const [isListEditMode, setIsListEditMode] = useState(false);

    // Derived state for available areas
    const uniqueAreas = Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort();

    // Reset edit mode when view changes
    useEffect(() => {
        setIsListEditMode(false);
    }, [viewMode]);

    const handleRowClick = (item: TestCase) => {
        if (isListEditMode) return;
        setSelectedCase(item);
    };

    const handleViewChange = (mode: any) => {
        setViewMode(mode);
        setActiveSuite(null);
    };

    const handleSuiteClick = (suite: string) => {
        setActiveSuite(suite);
        setViewMode('cases');
    };

    const handleProjectClick = (_projectId: string) => {
        setViewMode('suites');
    };

    const handleCreateSuite = () => {
        const name = prompt("Enter a name for the new Test Suite:");
        if (!name) return;

        const newCase: TestCase = {
            id: `TC-${100 + testCases.length + 1}`,
            title: 'First Case in ' + name,
            priority: Priority.Medium,
            status: Status.Draft,
            lastModified: new Date().toISOString(),
            assignedTester: {
                id: 'u-me',
                name: 'You',
                avatar: 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
            },
            suite: name,
            steps: []
        };
        setTestCases([newCase, ...testCases]);
        setActiveSuite(name);
        setViewMode('cases');
    };

    const handleCreateProject = () => {
        const name = prompt("Enter Project Name:");
        if (!name) return;

        const newProject: Project = {
            id: `p-${Date.now()}`,
            name: name,
            description: 'New project workspace',
            color: 'bg-gray-500',
            stats: { suites: 0, cases: 0, members: 1 },
            updatedAt: new Date().toISOString()
        };
        setProjects([newProject, ...projects]);
    };

    const createNewTestCase = () => {
        const newCase: TestCase = {
            id: `TC-${100 + testCases.length + 1}`,
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
            steps: []
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

    const handleSaveCase = (updatedCase: TestCase) => {
        setTestCases(prev => {
            const exists = prev.find(c => c.id === updatedCase.id);
            if (exists) {
                return prev.map(c => c.id === updatedCase.id ? updatedCase : c);
            }
            return [updatedCase, ...prev];
        });
        setSelectedCase(null);
    };

    // Inline update handler for the Table Edit Mode
    const handleInlineUpdate = (caseId: string, field: keyof TestCase, value: any) => {
        setTestCases(prev => prev.map(tc =>
            tc.id === caseId ? { ...tc, [field]: value } : tc
        ));
    };

    const handleStatusChange = (caseId: string, status: Status) => {
        setTestCases(prev => prev.map(tc =>
            tc.id === caseId ? {
                ...tc,
                status: status,
                lastModified: new Date().toISOString()
            } : tc
        ));
    };

    // Filter logic
    let displayedCases = testCases;

    if (activeSuite) {
        displayedCases = testCases.filter(c => c.suite === activeSuite);
    }

    return (
        <div className="flex flex-col h-full font-sans text-gray-900">
            {/* Removed internal Sidebar */}

            <main className="mac-card flex-1 flex flex-col min-w-0 overflow-hidden relative m-4 mt-2">
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
                        />
                    )}

                    {viewMode === 'suites' && (
                        <TestSuiteList
                            testCases={testCases}
                            onSuiteClick={handleSuiteClick}
                            onCreate={handleCreateSuite}
                        />
                    )}

                    {viewMode === 'plans' && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <p>Test Plans view coming soon...</p>
                        </div>
                    )}
                </div>
            </main>

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

export default TestManagerPage;
