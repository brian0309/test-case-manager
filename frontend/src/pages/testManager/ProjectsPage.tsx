import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectList from '../../components/testManager/ProjectList';
import ProjectCreateModal from '../../components/testManager/ProjectCreateModal';
import { useState } from 'react';
import { useTestManagerStore } from '../../store/testManagerStore';
import { useEffect } from 'react';

const ProjectsPage: React.FC = () => {
    const { projects, fetchProjects, createProject, setActiveProject } = useTestManagerStore();
    const navigate = useNavigate();

    // Fetch projects when this page mounts so the list is populated after reload
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

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
