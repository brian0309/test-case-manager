
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Project } from '../../types/testManager';
import { FolderGit2, MoreHorizontal, Users, Layers, Calendar, Plus, FileText, Pencil, Trash2, Settings, Share2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import ProjectMembersModal from './ProjectMembersModal';
import ProjectActionSheet from './ProjectActionSheet';

interface ProjectListProps {
    projects: Project[];
    onProjectClick: (id: string) => void;
    onCreate: () => void;
    onEdit?: (project: Project) => void;
    onSettings?: (project: Project) => void;
    onDelete?: (project: Project) => void;
}

interface DropdownPosition {
    projectId: string;
    top: number;
    right: number;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onProjectClick, onCreate, onEdit, onSettings, onDelete }) => {
    const { user } = useAuthStore();
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownPosition(null);
            }
        };

        if (dropdownPosition) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownPosition]);

    const handleMenuClick = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setSelectedProject(project);

        if (isMobile) {
            setShowActionSheet(true);
        } else {
            // Position dropdown near the button
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setDropdownPosition({
                projectId: project.id,
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right,
            });
        }
    };

    const handleManageMembers = () => {
        setDropdownPosition(null);
        setShowMembersModal(true);
    };

    const handleEdit = () => {
        setDropdownPosition(null);
        if (selectedProject && onEdit) {
            onEdit(selectedProject);
        }
    };

    const handleSettings = () => {
        setDropdownPosition(null);
        if (selectedProject && onSettings) {
            onSettings(selectedProject);
        }
    };
    const handleShareClick = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/test-manager/suites?projectId=${projectId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard');
        } catch (err) {
            console.error('Failed to copy link: ', err);
            toast.error('Failed to copy link');
        }
    };
    const handleDelete = () => {
        setDropdownPosition(null);
        if (selectedProject && onDelete) {
            onDelete(selectedProject);
        }
    };

    return (
        <>
            <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Create New Project Card */}
                    <div
                        onClick={onCreate}
                        className="group flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all cursor-pointer min-h-[220px]"
                    >
                        <div className="h-14 w-14 rounded-2xl bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Plus className="h-7 w-7 text-blue-500 dark:text-blue-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New Project</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Start a new testing workspace</p>
                    </div>

                    {projects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => onProjectClick(project.id)}
                            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`h-12 w-12 rounded-2xl ${project.color} shadow-lg flex items-center justify-center text-white`}>
                                        <FolderGit2 className="h-6 w-6" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => handleShareClick(e, project.id)}
                                            className="p-2 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors opacity-0 group-hover:opacity-100 md:opacity-0 opacity-100"
                                            title="Share Project"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleMenuClick(e, project)}
                                            className="p-2 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100 md:opacity-0 opacity-100"
                                        >
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="font-semibold text-gray-900 dark:text-white text-xl tracking-tight mb-2">{project.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 leading-relaxed">{project.description}</p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                                <div className="flex gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                        <Layers className="h-3.5 w-3.5" />
                                        {project.stats.suites} Suites
                                    </div>
                                    <div className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                        <FileText className="h-3.5 w-3.5" />
                                        {project.stats.cases} Cases
                                    </div>
                                    <div className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                        <Users className="h-3.5 w-3.5" />
                                        {project.stats.members}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop Dropdown Menu */}
            {dropdownPosition && !isMobile && (
                <div
                    ref={dropdownRef}
                    className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 w-48 animate-[scaleIn_0.1s_ease-out]"
                    style={{
                        top: dropdownPosition.top,
                        right: dropdownPosition.right,
                    }}
                >
                    <button
                        onClick={(e) => handleShareClick(e, selectedProject!.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Share2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        Share Project
                    </button>
                    <button
                        onClick={handleSettings}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Settings className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        Project Settings
                    </button>
                    <button
                        onClick={handleManageMembers}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        Manage Members
                    </button>
                    <button
                        onClick={handleEdit}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Pencil className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        Edit Project
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Project
                    </button>
                </div>
            )}

            {/* Mobile Action Sheet */}
            {selectedProject && (
                <ProjectActionSheet
                    project={selectedProject}
                    isOpen={showActionSheet}
                    onClose={() => setShowActionSheet(false)}
                    onManageMembers={handleManageMembers}
                    onEdit={handleEdit}
                    onSettings={handleSettings}
                    onDelete={handleDelete}
                    onShare={() => handleShareClick({ stopPropagation: () => {} } as React.MouseEvent, selectedProject.id)}
                />
            )}

            {/* Members Modal */}
            {selectedProject && showMembersModal && user && (
                <ProjectMembersModal
                    projectId={selectedProject.id}
                    currentUserId={user._id}
                    onClose={() => {
                        setShowMembersModal(false);
                        setSelectedProject(null);
                    }}
                />
            )}
        </>
    );
};

export default ProjectList;
