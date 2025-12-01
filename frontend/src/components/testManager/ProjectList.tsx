
import React from 'react';
import { Project } from '../../types/testManager';
import { FolderGit2, MoreHorizontal, Users, Layers, Calendar, Plus, FileText } from 'lucide-react';

interface ProjectListProps {
    projects: Project[];
    onProjectClick: (id: string) => void;
    onCreate: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onProjectClick, onCreate }) => {
    return (
        <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Create New Project Card */}
                <div
                    onClick={onCreate}
                    className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer min-h-[220px]"
                >
                    <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-7 w-7 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">New Project</h3>
                    <p className="text-xs text-gray-500 mt-1 text-center">Start a new testing workspace</p>
                </div>

                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => onProjectClick(project.id)}
                        className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                    >
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`h-12 w-12 rounded-2xl ${project.color} shadow-lg flex items-center justify-center text-white`}>
                                    <FolderGit2 className="h-6 w-6" />
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); }}
                                    className="p-2 text-gray-300 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </div>

                            <h3 className="font-semibold text-gray-900 text-xl tracking-tight mb-2">{project.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-6 leading-relaxed">{project.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex gap-4 text-xs font-medium text-gray-500">
                                <div className="flex items-center gap-1.5 hover:text-gray-700 transition-colors">
                                    <Layers className="h-3.5 w-3.5" />
                                    {project.stats.suites} Suites
                                </div>
                                <div className="flex items-center gap-1.5 hover:text-gray-700 transition-colors">
                                    <FileText className="h-3.5 w-3.5" />
                                    {project.stats.cases} Cases
                                </div>
                                <div className="flex items-center gap-1.5 hover:text-gray-700 transition-colors">
                                    <Users className="h-3.5 w-3.5" />
                                    {project.stats.members}
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectList;
