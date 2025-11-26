import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProjectList from '../../components/testManager/ProjectList';
import ProjectCreateModal from '../../components/testManager/ProjectCreateModal';
import { useTestManagerStore } from '../../store/testManagerStore';

const ProjectsPage: React.FC = () => {
    const { projects, fetchProjects, setActiveProject } = useTestManagerStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch projects when this page mounts so the list is populated after reload
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

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

    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const handleCreateProject = async () => {
        // open the modal to create a project
        setIsCreateOpen(true);
    };

    return (
        <>
            <ProjectCreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        <ProjectList
            projects={projects}
            onProjectClick={handleProjectClick}
            onCreate={handleCreateProject}
        />
        </>
    );
};

export default ProjectsPage;
