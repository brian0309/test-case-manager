import React from 'react';
import { useTestManagerStore } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';

const TestSuitesPage: React.FC = () => {
    const { activeProject } = useTestManagerStore();

    // Show empty state if no project is selected
    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test suites"
            />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>Test Suites view coming soon...</p>
            <p className="text-xs mt-2">Showing suites for selected project</p>
        </div>
    );
};

export default TestSuitesPage;
