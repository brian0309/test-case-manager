import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, Folder, Check, X } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';

interface ProjectSelectorProps {
    stayOnPage?: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ stayOnPage = false }) => {
    const { projects, activeProject, setActiveProject } = useTestManagerStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const selectedProject = projects.find(p => p.id === activeProject);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProjectSelect = (projectId: string) => {
        setActiveProject(projectId);
        setIsOpen(false);
        // Navigate to test suites for the selected project
        if (!stayOnPage) {
            navigate('/test-manager/suites');
        }
    };

    const handleClearSelection = () => {
        setActiveProject(null);
        setIsOpen(false);
        if (!stayOnPage) {
            navigate('/test-manager/projects');
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[200px]"
            >
                <Folder className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedProject ? selectedProject.name : 'Select Project'}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-64 z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Switch Project</p>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {projects.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => handleProjectSelect(project.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${activeProject === project.id ? 'bg-system-blue/10 dark:bg-system-blue/20' : ''
                                    }`}
                            >
                                <div className={`h-8 w-8 rounded-lg ${project.color} flex items-center justify-center text-white flex-shrink-0`}>
                                    <Folder className="h-4 w-4" />
                                </div>
                                <span className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {project.name}
                                </span>
                                {activeProject === project.id && (
                                    <Check className="h-4 w-4 text-system-blue" />
                                )}
                            </button>
                        ))}
                    </div>

                    {activeProject && (
                        <div className="border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={handleClearSelection}
                                className="w-full flex items-center gap-2 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <X className="h-4 w-4" />
                                <span className="text-sm font-medium">Clear Selection</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectSelector;
