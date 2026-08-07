import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import ProjectList from '../../components/testManager/ProjectList';
import ProjectCreateModal from '../../components/testManager/ProjectCreateModal';
import ProjectEditModal from '../../components/testManager/ProjectEditModal';
import ProjectSettingsModal from '../../components/testManager/ProjectSettingsModal';
import ConfirmationModal from '../../components/testManager/ConfirmationModal';
import { useTestManagerStore } from '../../store/testManagerStore';
import { Project } from '../../types/testManager';

const ProjectsPage: React.FC = () => {
    const { projects, fetchProjects, fetchMoreProjects, setActiveProject, searchQuery, clearSearchQuery, deleteProject, projectsHasMore, isProjectsLoadingMore, projectsOffset, projectsTotal } = useTestManagerStore();
    const navigate = useNavigate();
    const location = useLocation();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToSettings, setProjectToSettings] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Fetch projects when this page mounts so the list is populated after reload
    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects();
        }
        clearSearchQuery(); // Clear search when entering the page
        return () => clearSearchQuery(); // Clear search when leaving
    }, [projects.length, fetchProjects, clearSearchQuery]);

    // Open the create modal if navigation state requested it (from toolbar)
    useEffect(() => {
        try {
            const open = (location.state as { openNew?: boolean } | null)?.openNew;
            if (open) {
                setIsCreateOpen(true);
                // Clear the navigation state so it doesn't reopen on refresh/back
                navigate(location.pathname, { replace: true, state: {} });
            }
        } catch {
            // ignore
        }
    }, [location, navigate]);

    const handleProjectClick = (projectId: string) => {
        // Set the active project and navigate to suites
        setActiveProject(projectId);
        navigate('/test-manager/suites');
    };

    const handleCreateProject = async () => {
        // open the modal to create a project
        setIsCreateOpen(true);
    };

    const handleEditProject = (project: Project) => {
        setProjectToEdit(project);
    };

    const handleProjectSettings = (project: Project) => {
        setProjectToSettings(project);
    };

    const handleDeleteProject = (project: Project) => {
        setProjectToDelete(project);
    };

    const confirmDeleteProject = async () => {
        if (!projectToDelete) return;
        
        const projectName = projectToDelete.name;
        setIsDeleting(true);
        try {
            await deleteProject(projectToDelete.id);
            setProjectToDelete(null);
            toast.success(`Project "${projectName}" deleted successfully`);
        } catch (error: unknown) {
            console.error('Failed to delete project:', error);
            toast.error((error as Error)?.message || 'Failed to delete project');
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter projects based on search query
    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Infinite scroll: load more projects when sentinel is visible
    const handleLoadMore = useCallback(() => {
        if (!projectsHasMore || isProjectsLoadingMore) return;
        fetchMoreProjects();
    }, [fetchMoreProjects, projectsHasMore, isProjectsLoadingMore]);

    useEffect(() => {
        if (!projectsHasMore || isProjectsLoadingMore) return;

        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first?.isIntersecting) {
                    handleLoadMore();
                }
            },
            {
                root: null,
                rootMargin: '200px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [handleLoadMore, projectsHasMore, isProjectsLoadingMore]);

    return (
        <div className="flex flex-col h-auto sm:h-full bg-white dark:bg-gray-900">
            <ProjectCreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
            
            <ProjectEditModal 
                isOpen={!!projectToEdit} 
                onClose={() => setProjectToEdit(null)} 
                project={projectToEdit} 
            />

            <ProjectSettingsModal
                isOpen={!!projectToSettings}
                onClose={() => setProjectToSettings(null)}
                project={projectToSettings}
            />
            
            <ConfirmationModal
                isOpen={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                onConfirm={confirmDeleteProject}
                title="Delete Project"
                message={`Are you sure you want to delete "${projectToDelete?.name}"? This will permanently remove all test suites and test cases in this project.`}
                confirmText="Delete Project"
                isDestructive={true}
                isLoading={isDeleting}
                requireConfirmationText="delete"
            />
            
            <ProjectList
                projects={filteredProjects}
                onProjectClick={handleProjectClick}
                onCreate={handleCreateProject}
                onEdit={handleEditProject}
                onSettings={handleProjectSettings}
                onDelete={handleDeleteProject}
            />

            {projectsHasMore && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                    {isProjectsLoadingMore && (
                        <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading more projects...
                        </div>
                    )}
                </div>
            )}
            {projectsTotal > 0 && (
                <div className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
                    Loaded {Math.min(projectsOffset, filteredProjects.length)} / {projectsTotal} projects
                </div>
            )}
        </div>
    );
};

export default ProjectsPage;
