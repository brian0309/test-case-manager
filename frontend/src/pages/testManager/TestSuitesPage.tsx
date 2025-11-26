import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestManagerStore } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import TestSuiteList from '../../components/testManager/TestSuiteList';

const TestSuitesPage: React.FC = () => {
    const { activeProject, testCases } = useTestManagerStore();
    const navigate = useNavigate();

    // Filter test cases by active project
    const projectTestCases = activeProject
        ? testCases.filter(tc => tc.projectId === activeProject)
        : [];

    const handleSuiteClick = (suiteName: string) => {
        // Navigate to test cases page - the TestCasesPage will handle filtering by suite
        // Note: In a real app, you might want to pass the suite filter as a state or URL param
        navigate('/test-manager/cases', { state: { selectedSuite: suiteName } });
    };

    const handleCreateSuite = () => {
        // Placeholder for creating a new suite
        // In the future, this could open a modal or navigate to a creation form
        alert('Create new suite functionality coming soon!');
    };

    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test suites"
            />
        );
    }

    return (
        <TestSuiteList
            testCases={projectTestCases}
            onSuiteClick={handleSuiteClick}
            onCreate={handleCreateSuite}
        />
    );
};

export default TestSuitesPage;
