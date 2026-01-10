import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTestManagerStore } from '../../store/testManagerStore';
import { Project } from '../../types/testManager';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
}

const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-400',
    'bg-red-500',
    'bg-indigo-500',
    'bg-gray-500',
];

const ProjectEditModal: React.FC<Props> = ({ isOpen, onClose, project }) => {
    const { updateProject, fetchProjects } = useTestManagerStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(colors[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when project changes or modal opens
    useEffect(() => {
        if (project && isOpen) {
            setName(project.name);
            setDescription(project.description || '');
            setColor(project.color || colors[0]);
            setError(null);
        }
    }, [project, isOpen]);

    if (!isOpen || !project) return null;

    const validate = (): string | null => {
        if (!name || name.trim().length === 0) return 'Project name is required';
        if (name.trim().length > 100) return 'Project name must be 100 characters or less';
        if (description.length > 500) return 'Description must be 500 characters or less';
        return null;
    };

    const handleSave = async () => {
        const v = validate();
        if (v) {
            setError(v);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await updateProject(project.id, { 
                name: name.trim(), 
                description: description.trim(), 
                color 
            });
            await fetchProjects();
            toast.success('Project updated successfully');
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Could not update project');
            toast.error(err?.message || 'Failed to update project');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-2">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div className="relative w-full h-full sm:h-auto sm:max-w-2xl bg-white dark:bg-[#2a2a2a]/95 backdrop-blur-xl sm:rounded-2xl shadow-2xl overflow-y-auto animate-[scaleIn_0.12s_ease-out]">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#333]/50">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Project</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-3 rounded">{error}</div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-0 outline-none text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            placeholder="e.g. Authentication Tests"
                            maxLength={100}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-0 outline-none text-sm resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={3}
                            maxLength={500}
                            placeholder="Short description of this project"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Color</label>
                        <div className="flex gap-2">
                            {colors.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`h-8 w-8 rounded ${c} ${color === c ? 'ring-2 ring-offset-2 ring-blue-300 dark:ring-blue-600' : ''}`}
                                    aria-label={`Select color ${c}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#333]/50">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-lg text-sm text-white bg-blue-500 hover:bg-blue-600 flex items-center gap-2 ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectEditModal;
