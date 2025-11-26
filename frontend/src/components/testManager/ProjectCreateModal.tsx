import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-400',
    'bg-red-500',
    'bg-indigo-500',
    'bg-gray-500',
];

const ProjectCreateModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { createProject, fetchProjects, setActiveProject } = useTestManagerStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(colors[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

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
            const created = await createProject({ name: name.trim(), description: description.trim(), color });
            // Set active project and refresh list
            setActiveProject(created.id);
            await fetchProjects();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Could not create project');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.12s_ease-out]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-semibold">Create New Project</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded">{error}</div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Project Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-0 outline-none text-sm"
                            placeholder="e.g. Authentication Tests"
                            maxLength={100}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-0 outline-none text-sm resize-none"
                            rows={3}
                            maxLength={500}
                            placeholder="Short description of this project"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                        <div className="flex gap-2">
                            {colors.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`h-8 w-8 rounded ${c} ${color === c ? 'ring-2 ring-offset-2 ring-blue-300' : ''}`}
                                    aria-label={`Select color ${c}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-lg text-sm text-white bg-blue-500 hover:bg-blue-600 flex items-center gap-2 ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
                    >
                        <Plus className="h-4 w-4" />
                        {isSaving ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectCreateModal;
