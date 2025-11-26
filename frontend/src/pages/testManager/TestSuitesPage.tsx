import React from 'react';
import { useNavigate } from 'react-router-dom';
import TestSuiteList from '../../components/testManager/TestSuiteList';
import { useTestManagerStore } from '../../store/testManagerStore';
import { TestCase, Priority, Status } from '../../types/testManager';

const TestSuitesPage: React.FC = () => {
    const { testCases, setActiveSuite, addTestCase } = useTestManagerStore();
    const navigate = useNavigate();

    const handleSuiteClick = (suite: string) => {
        setActiveSuite(suite);
        navigate('/test-manager/cases');
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
        addTestCase(newCase);
        setActiveSuite(name);
        navigate('/test-manager/cases');
    };

    return (
        <TestSuiteList
            testCases={testCases}
            onSuiteClick={handleSuiteClick}
            onCreate={handleCreateSuite}
        />
    );
};

export default TestSuitesPage;
