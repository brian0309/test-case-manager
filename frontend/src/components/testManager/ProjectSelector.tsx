import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Folder, Check, X } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';

const ProjectSelector: React.FC = () => {
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
        navigate('/test-manager/suites');
    };

    const handleClearSelection = () => {
        setActiveProject(null);
        setIsOpen(false);
        navigate('/test-manager/projects');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px]"
            >
                <Folder className="h-4 w-4 text-gray-500" />
                <span className="flex-1 text-left text-sm font-medium text-gray-700">
                    {selectedProject ? selectedProject.name : 'Select Project'}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg w-64 z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Switch Project</p>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {projects.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => handleProjectSelect(project.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${activeProject === project.id ? 'bg-blue-50' : ''
                                    }`}
                            >
                                <div className={`h-8 w-8 rounded-lg ${project.color} flex items-center justify-center text-white flex-shrink-0`}>
                                    <Folder className="h-4 w-4" />
                                </div>
                                <span className="flex-1 text-left text-sm font-medium text-gray-700">
                                    {project.name}
                                </span>
                                {activeProject === project.id && (
                                    <Check className="h-4 w-4 text-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>

                    {activeProject && (
                        <div className="border-t border-gray-100">
                            <button
                                onClick={handleClearSelection}
                                className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
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
