import React from 'react';
import { useTestManagerStore } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';

const TestPlansPage: React.FC = () => {
    const { activeProject } = useTestManagerStore();

    // Show empty state if no project is selected
    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage test plans"
            />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>Test Plans view coming soon...</p>
            <p className="text-xs mt-2">Showing plans for selected project</p>
        </div>
    );
};

export default TestPlansPage;
