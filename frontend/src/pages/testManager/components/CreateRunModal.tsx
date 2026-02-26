import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TestCase, TestRunGroup } from '../../../types/testManager';
import TagInput from '../../../components/testManager/TagInput';

export interface CreateRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (title: string, description: string, caseIds: string[], groupId?: string, tags?: string[]) => Promise<void>;
    testCases: TestCase[];
    testSuites: { id: string; name: string }[];
    testRunGroups: TestRunGroup[];
    selectedCases: string[];
    onToggleCase: (caseId: string) => void;
    onSelectAll: (selectAll: boolean, filteredCases: TestCase[]) => void;
    tagSuggestions: string[];
    initialTitle?: string;
}

const CreateRunModal: React.FC<CreateRunModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    testCases,
    testSuites,
    testRunGroups,
    selectedCases,
    onToggleCase,
    onSelectAll,
    tagSuggestions,
    initialTitle,
}) => {
    const [title, setTitle] = useState(initialTitle ?? '');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSuiteFilter, setSelectedSuiteFilter] = useState<string>('all');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);

    // Filter test cases by selected suite
    const filteredTestCases = selectedSuiteFilter === 'all'
        ? testCases
        : testCases.filter(tc => tc.suiteId === selectedSuiteFilter);

    // Sync title and reset state when modal opens or closes
    useEffect(() => {
        if (isOpen) {
            setTitle(initialTitle ?? '');
        } else {
            setTitle('');
            setDescription('');
            setSelectedSuiteFilter('all');
            setSelectedGroupId('');
            setTags([]);
        }
    }, [isOpen, initialTitle]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('Please enter a title');
            return;
        }
        if (selectedCases.length === 0) {
            toast.error('Please select at least one test case');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(title, description, selectedCases, selectedGroupId || undefined, tags.length > 0 ? tags : undefined);
            setTitle(initialTitle ?? '');
            setDescription('');
            setSelectedSuiteFilter('all');
            setSelectedGroupId('');
            setTags([]);
            onClose();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to create test run');
        } finally {
            setIsSubmitting(false);
        }
    };

    const allFilteredSelected = filteredTestCases.length > 0 && filteredTestCases.every(tc => selectedCases.includes(tc.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create Test Run</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Sprint 23 Regression"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description..."
                            rows={2}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>

                    {/* Test Run Group & Suite Filter - Same Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group (Optional)</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">No Group</option>
                                {testRunGroups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Suite</label>
                            <select
                                value={selectedSuiteFilter}
                                onChange={(e) => setSelectedSuiteFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                            >
                                <option value="all">All Suites</option>
                                {testSuites.map((suite) => (
                                    <option key={suite.id} value={suite.id}>
                                        {suite.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                        <TagInput
                            tags={tags}
                            onChange={setTags}
                            suggestions={tagSuggestions}
                            placeholder="e.g., regression, smoke, sprint-23"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select Test Cases ({selectedCases.length} selected)
                            </label>
                            <button
                                onClick={() => onSelectAll(!allFilteredSelected, filteredTestCases)}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                {allFilteredSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                            {filteredTestCases.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                    No test cases available
                                </div>
                            ) : (
                                filteredTestCases.map((tc) => (
                                    <label
                                        key={tc.id}
                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCases.includes(tc.id)}
                                            onChange={() => onToggleCase(tc.id)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tc.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{tc.suite}</div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
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
                        {isSubmitting ? 'Creating...' : 'Create Run'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateRunModal;
