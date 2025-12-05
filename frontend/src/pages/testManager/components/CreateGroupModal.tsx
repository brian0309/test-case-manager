import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TestRunGroup } from '../../../types/testManager';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string, color: string) => Promise<void>;
    initialData?: TestRunGroup;
    mode: 'create' | 'edit';
}

const COLORS = [
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Green', value: 'bg-green-500' },
    { name: 'Red', value: 'bg-red-500' },
    { name: 'Orange', value: 'bg-orange-500' },
    { name: 'Pink', value: 'bg-pink-500' },
    { name: 'Teal', value: 'bg-teal-500' },
    { name: 'Gray', value: 'bg-gray-500' },
];

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    mode
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(COLORS[0].value);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && initialData && mode === 'edit') {
            setName(initialData.name);
            setDescription(initialData.description || '');
            setColor(initialData.color || COLORS[0].value);
        } else if (isOpen && mode === 'create') {
            setName('');
            setDescription('');
            setColor(COLORS[0].value);
        }
    }, [isOpen, initialData, mode]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(name, description, color);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {mode === 'create' ? 'New Test Run Group' : 'Edit Group'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Group Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Sprint 24, Regression Suite"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Optional description..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color Label
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setColor(c.value)}
                                    className={`w-8 h-8 rounded-full ${c.value} transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 ${color === c.value ? 'ring-gray-400 scale-110' : 'ring-transparent'
                                        }`}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Group' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
