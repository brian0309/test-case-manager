import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TestRunListItem, TestRunGroup } from '../../../types/testManager';
import TagInput from '../../../components/testManager/TagInput';

export interface EditTestRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    testRun: TestRunListItem | null;
    testRunGroups: TestRunGroup[];
    onSubmit: (runId: string, data: { title: string; groupId: string | null; tags: string[] }) => Promise<void>;
    tagSuggestions: string[];
}

const EditTestRunModal: React.FC<EditTestRunModalProps> = ({
    isOpen,
    onClose,
    testRun,
    testRunGroups,
    onSubmit,
    tagSuggestions,
}) => {
    const [title, setTitle] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (testRun) {
            setTitle(testRun.title);
            setSelectedGroupId(testRun.groupId || '');
            setTags(testRun.tags || []);
        }
    }, [testRun]);

    if (!isOpen || !testRun) return null;

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(testRun.id, {
                title: title.trim(),
                groupId: selectedGroupId || null,
                tags,
            });
            onClose();
        } catch {
            // Error handled by parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Test Run</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Run Group</label>
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">No Group (Ungrouped)</option>
                            {testRunGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                        <TagInput
                            tags={tags}
                            onChange={setTags}
                            suggestions={tagSuggestions}
                            placeholder="e.g., regression, smoke, sprint-23"
                        />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditTestRunModal;
