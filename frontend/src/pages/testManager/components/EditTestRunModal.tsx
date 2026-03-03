import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TestCase, TestRunListItem, TestRunGroup } from '../../../types/testManager';
import TagInput from '../../../components/testManager/TagInput';
import { testRunApi } from '../../../services/testRunApi';

export interface EditTestRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    testRun: TestRunListItem | null;
    testRunGroups: TestRunGroup[];
    testCases: TestCase[];
    testSuites: { id: string; name: string }[];
    onSubmit: (runId: string, data: { title: string; groupId: string | null; tags: string[]; additionalTestCaseIds?: string[] }) => Promise<void>;
    tagSuggestions: string[];
}

const EditTestRunModal: React.FC<EditTestRunModalProps> = ({
    isOpen,
    onClose,
    testRun,
    testRunGroups,
    testCases,
    testSuites,
    onSubmit,
    tagSuggestions,
}) => {
    const [title, setTitle] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [tags, setTags] = useState<string[]>([]);
    const [selectedSuiteFilter, setSelectedSuiteFilter] = useState<string>('all');
    const [existingCaseIds, setExistingCaseIds] = useState<string[]>([]);
    const [additionalCaseIds, setAdditionalCaseIds] = useState<string[]>([]);
    const [isLoadingRunDetails, setIsLoadingRunDetails] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (testRun) {
            setTitle(testRun.title);
            setSelectedGroupId(testRun.groupId || '');
            setTags(testRun.tags || []);
            setSelectedSuiteFilter('all');
            setAdditionalCaseIds([]);
        }
    }, [testRun]);

    useEffect(() => {
        const loadRunDetails = async () => {
            if (!isOpen || !testRun) return;

            setIsLoadingRunDetails(true);
            try {
                const fullRun = await testRunApi.getTestRun(testRun.id);
                setExistingCaseIds(fullRun.items.map((item) => item.caseId));
            } catch (error: unknown) {
                toast.error((error as Error).message || 'Failed to load run details');
                setExistingCaseIds([]);
            } finally {
                setIsLoadingRunDetails(false);
            }
        };

        loadRunDetails();
    }, [isOpen, testRun]);

    if (!isOpen || !testRun) return null;

    const availableAdditionalCases = testCases.filter((testCase) => !existingCaseIds.includes(testCase.id));
    const filteredAdditionalCases = selectedSuiteFilter === 'all'
        ? availableAdditionalCases
        : availableAdditionalCases.filter((testCase) => testCase.suiteId === selectedSuiteFilter);

    const allFilteredSelected =
        filteredAdditionalCases.length > 0 &&
        filteredAdditionalCases.every((testCase) => additionalCaseIds.includes(testCase.id));

    const toggleAdditionalCase = (caseId: string) => {
        setAdditionalCaseIds((previous) =>
            previous.includes(caseId)
                ? previous.filter((id) => id !== caseId)
                : [...previous, caseId]
        );
    };

    const toggleAllFilteredCases = () => {
        if (allFilteredSelected) {
            const filteredIds = new Set(filteredAdditionalCases.map((testCase) => testCase.id));
            setAdditionalCaseIds((previous) => previous.filter((id) => !filteredIds.has(id)));
            return;
        }

        setAdditionalCaseIds((previous) => Array.from(new Set([...previous, ...filteredAdditionalCases.map((testCase) => testCase.id)])));
    };

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
                additionalTestCaseIds: additionalCaseIds,
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter New Cases by Suite</label>
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
                        <div className="flex items-end">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Existing: {existingCaseIds.length} case{existingCaseIds.length === 1 ? '' : 's'}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Add Test Cases ({additionalCaseIds.length} selected)
                            </label>
                            <button
                                type="button"
                                onClick={toggleAllFilteredCases}
                                disabled={filteredAdditionalCases.length === 0}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
                            >
                                {allFilteredSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-56 overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                            {isLoadingRunDetails ? (
                                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading run cases...</div>
                            ) : filteredAdditionalCases.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No additional test cases available</div>
                            ) : (
                                filteredAdditionalCases.map((testCase) => (
                                    <label
                                        key={testCase.id}
                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={additionalCaseIds.includes(testCase.id)}
                                            onChange={() => toggleAdditionalCase(testCase.id)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{testCase.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {testCase.suite} • {testCase.area || 'No Area'}
                                            </div>
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
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditTestRunModal;
