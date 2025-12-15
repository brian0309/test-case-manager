import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProjectList from '../../components/testManager/ProjectList';
import ProjectCreateModal from '../../components/testManager/ProjectCreateModal';
import ProjectEditModal from '../../components/testManager/ProjectEditModal';
import ProjectSettingsModal from '../../components/testManager/ProjectSettingsModal';
import ConfirmationModal from '../../components/testManager/ConfirmationModal';
import { useTestManagerStore } from '../../store/testManagerStore';
import { Project } from '../../types/testManager';

const ProjectsPage: React.FC = () => {
    const { projects, fetchProjects, setActiveProject, searchQuery, clearSearchQuery, deleteProject } = useTestManagerStore();
    const navigate = useNavigate();
    const location = useLocation();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToSettings, setProjectToSettings] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch projects when this page mounts so the list is populated after reload
    useEffect(() => {
        fetchProjects();
        clearSearchQuery(); // Clear search when entering the page
        return () => clearSearchQuery(); // Clear search when leaving
    }, [fetchProjects, clearSearchQuery]);

    // Open the create modal if navigation state requested it (from toolbar)
    useEffect(() => {
        try {
            const open = (location.state as any)?.openNew;
            if (open) {
                setIsCreateOpen(true);
                // Clear the navigation state so it doesn't reopen on refresh/back
                navigate(location.pathname, { replace: true, state: {} });
            }
        } catch (e) {
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
        } catch (error: any) {
            console.error('Failed to delete project:', error);
            toast.error(error?.message || 'Failed to delete project');
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter projects based on search query
    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
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
        </>
    );
};

export default ProjectsPage;
