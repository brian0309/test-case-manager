import React from 'react';
import ProjectList from '../../components/testManager/ProjectList';
import { useTestManagerStore } from '../../store/testManagerStore';
import { Project } from '../../types/testManager';

const ProjectsPage: React.FC = () => {
    const { projects, setProjects } = useTestManagerStore();

    const handleProjectClick = (projectId: string) => {
        // Navigate to suites or cases for this project
        // For now, just switch view mode, but ideally filter by project
        console.log('Project clicked:', projectId);
        // setViewMode('suites'); 
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
