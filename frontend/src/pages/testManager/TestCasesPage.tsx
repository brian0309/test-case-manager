import React, { useState } from 'react';
import TestCaseTable from '../../components/testManager/TestCaseTable';
import TestCaseModal from '../../components/testManager/TestCaseModal';
import TestCaseViewModal from '../../components/testManager/TestCaseViewModal';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import { useTestManagerStore } from '../../store/testManagerStore';
import { TestCase, Status } from '../../types/testManager';

const TestCasesPage: React.FC = () => {
    const { testCases, activeSuite, activeProject, updateTestCase, addTestCase } = useTestManagerStore();
    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
    const [viewCase, setViewCase] = useState<TestCase | null>(null);
    const [isListEditMode, setIsListEditMode] = useState(false);

    const uniqueAreas = Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort();

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
        const updatedCase = testCases.find(tc => tc.id === caseId);
        if (updatedCase) {
            updateTestCase({ ...updatedCase, [field]: value });
        }
    };

    const handleStatusChange = (caseId: string, status: Status) => {
        const updatedCase = testCases.find(tc => tc.id === caseId);
        if (updatedCase) {
            updateTestCase({
                ...updatedCase,
                status: status,
                lastModified: new Date().toISOString()
            });
        }
    };

    const handleSaveCase = (updatedCase: TestCase) => {
        const exists = testCases.find(c => c.id === updatedCase.id);
        if (exists) {
            updateTestCase(updatedCase);
        } else {
            addTestCase(updatedCase);
        }
        setSelectedCase(null);
    };

    // Filter by suite if active
    const displayedCases = activeSuite
        ? testCases.filter(c => c.suite === activeSuite)
        : testCases;

    // Further filter by project if active
    const filteredCases = activeProject
        ? displayedCases.filter(c => c.projectId === activeProject)
        : displayedCases;

    // Show empty state if no project is selected
    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test cases"
            />
        );
    }

    return (
        <>
            <TestCaseTable
                data={filteredCases}
                onRowClick={handleRowClick}
                onViewClick={handleViewClick}
                isEditMode={isListEditMode}
                onUpdate={handleInlineUpdate}
                onStatusChange={handleStatusChange}
            />
            {viewCase && (
                <TestCaseViewModal
                    testCase={viewCase}
                    onClose={() => setViewCase(null)}
                    onEdit={handleEditFromView}
                    onUpdate={(updatedCase) => {
                        updateTestCase(updatedCase);
                        setViewCase(updatedCase); // Update local state to reflect changes
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
        </>
    );
};

export default TestCasesPage;
