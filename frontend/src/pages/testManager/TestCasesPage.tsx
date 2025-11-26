import React, { useState } from 'react';
import TestCaseTable from '../../components/testManager/TestCaseTable';
import TestCaseModal from '../../components/testManager/TestCaseModal';
import { useTestManagerStore } from '../../store/testManagerStore';
import { TestCase, Status } from '../../types/testManager';

const TestCasesPage: React.FC = () => {
    const { testCases, activeSuite, updateTestCase, addTestCase } = useTestManagerStore();
    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
    const [isListEditMode, setIsListEditMode] = useState(false);

    const uniqueAreas = Array.from(new Set(testCases.map(tc => tc.area).filter((a): a is string => !!a))).sort();

    const handleRowClick = (item: TestCase) => {
        if (isListEditMode) return;
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
                lastRun: new Date().toISOString()
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

    return (
        <>
            <TestCaseTable
                data={displayedCases}
                onRowClick={handleRowClick}
                isEditMode={isListEditMode}
                onUpdate={handleInlineUpdate}
                onStatusChange={handleStatusChange}
            />
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
