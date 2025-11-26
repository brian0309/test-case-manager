import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectList from '../../components/testManager/ProjectList';
import { useTestManagerStore } from '../../store/testManagerStore';
import { Project } from '../../types/testManager';

const ProjectsPage: React.FC = () => {
    const { projects, setProjects, setActiveProject } = useTestManagerStore();
    const navigate = useNavigate();

    const handleProjectClick = (projectId: string) => {
        // Set the active project
        setActiveProject(projectId);
        // Navigate to suites for this project
        navigate('/test-manager/suites');
    };

    const handleCreateProject = () => {
        const name = prompt("Enter Project Name:");
        if (!name) return;

        const newProject: Project = {
            id: `p-${Date.now()}`,
            name: name,
            description: 'New project workspace',
            color: 'bg-gray-500',
            stats: { suites: 0, cases: 0, members: 1 },
            updatedAt: new Date().toISOString()
        };
        setProjects([newProject, ...projects]);
    };

    return (
        <ProjectList
            projects={projects}
            onProjectClick={handleProjectClick}
            onCreate={handleCreateProject}
        />
    );
};

export default ProjectsPage;
