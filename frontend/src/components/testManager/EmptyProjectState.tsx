import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';

interface EmptyProjectStateProps {
    title: string;
    description: string;
}

const EmptyProjectState: React.FC<EmptyProjectStateProps> = ({ title, description }) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
                <FolderOpen className="h-12 w-12 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">{description}</p>
            <button
                onClick={() => navigate('/test-manager/projects')}
                className="px-4 py-2 bg-[#007AFF] hover:bg-[#0062cc] dark:bg-system-darkBlue dark:hover:bg-[#0056b3] text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
            >
                Go to Projects
            </button>
        </div>
    );
};

export default EmptyProjectState;
