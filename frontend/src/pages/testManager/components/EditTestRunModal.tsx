import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import toast from 'react-hot-toast';
import { TestCase, TestRunListItem, TestRunGroup } from '../../../types/testManager';
import TagInput from '../../../components/testManager/TagInput';
import { getIndentedGroupOptions } from './testRunUtils';
import { testRunApi } from '../../../services/testRunApi';

export interface EditTestRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    testRun: TestRunListItem | null;
    testRunGroups: TestRunGroup[];
    testCases: TestCase[];
    testSuites: { id: string; name: string }[];
    onSubmit: (runId: string, data: { title: string; groupId: string | null; tags: string[]; environment?: string; team?: string; buildVersion?: string; additionalTestCaseIds?: string[] }) => Promise<void>;
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
    const [environment, setEnvironment] = useState('');
    const [team, setTeam] = useState('');
    const [buildVersion, setBuildVersion] = useState('');
    const [selectedSuiteFilter, setSelectedSuiteFilter] = useState<string>('all');
    const [existingCaseIds, setExistingCaseIds] = useState<string[]>([]);
    const [additionalCaseIds, setAdditionalCaseIds] = useState<string[]>([]);
    const [isLoadingRunDetails, setIsLoadingRunDetails] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const additionalCasesListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (testRun) {
            setTitle(testRun.title);
            setSelectedGroupId(testRun.groupId || '');
            setTags(testRun.tags || []);
            setEnvironment(testRun.environment || '');
            setTeam(testRun.team || '');
            setBuildVersion(testRun.buildVersion || '');
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

    const existingCaseIdsSet = useMemo(() => new Set(existingCaseIds), [existingCaseIds]);
    const additionalCaseIdsSet = useMemo(() => new Set(additionalCaseIds), [additionalCaseIds]);

    const availableAdditionalCases = useMemo(
        () => testCases.filter((testCase) => !existingCaseIdsSet.has(testCase.id)),
        [existingCaseIdsSet, testCases]
    );

    const filteredAdditionalCases = useMemo(
        () => selectedSuiteFilter === 'all'
            ? availableAdditionalCases
            : availableAdditionalCases.filter((testCase) => testCase.suiteId === selectedSuiteFilter),
        [availableAdditionalCases, selectedSuiteFilter]
    );

    const allFilteredSelected =
        filteredAdditionalCases.length > 0 &&
        filteredAdditionalCases.every((testCase) => additionalCaseIdsSet.has(testCase.id));

    const additionalCasesVirtualizer = useVirtualizer({
        count: filteredAdditionalCases.length,
        getScrollElement: () => additionalCasesListRef.current,
        estimateSize: () => 58,
        overscan: 8,
    });

    if (!isOpen || !testRun) return null;

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
                environment: environment.trim() || undefined,
                team: team.trim() || undefined,
                buildVersion: buildVersion.trim() || undefined,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Test Run</h2>
                </div>
                <div className="p-4 sm:p-6 space-y-4">
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
                                {getIndentedGroupOptions(testRunGroups).map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.label}
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
                            <input
                                type="text"
                                value={team}
                                onChange={(e) => setTeam(e.target.value)}
                                placeholder="e.g., Payments"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Environment</label>
                            <input
                                type="text"
                                value={environment}
                                onChange={(e) => setEnvironment(e.target.value)}
                                placeholder="e.g., staging"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Build Version</label>
                            <input
                                type="text"
                                value={buildVersion}
                                onChange={(e) => setBuildVersion(e.target.value)}
                                placeholder="e.g., v1.4.2"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div
                            ref={additionalCasesListRef}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-56 overflow-y-auto bg-gray-50 dark:bg-gray-800/50"
                        >
                            {isLoadingRunDetails ? (
                                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading run cases...</div>
                            ) : filteredAdditionalCases.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No additional test cases available</div>
                            ) : (
                                <div
                                    style={{
                                        height: `${additionalCasesVirtualizer.getTotalSize()}px`,
                                        position: 'relative',
                                        width: '100%',
                                    }}
                                >
                                    {additionalCasesVirtualizer.getVirtualItems().map((virtualRow) => {
                                        const testCase = filteredAdditionalCases[virtualRow.index];
                                        if (!testCase) return null;

                                        return (
                                            <label
                                                key={testCase.id}
                                                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors absolute left-0 right-0"
                                                style={{ transform: `translateY(${virtualRow.start}px)` }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={additionalCaseIdsSet.has(testCase.id)}
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
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
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
