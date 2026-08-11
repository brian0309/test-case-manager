import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowUpRight,
    RefreshCw,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    CheckCircle2,
    AlertTriangle,
    Layers,
    MapPin,
} from 'lucide-react';
import { TestRun, RunItem, RunItemStatus, TestCase, TestSuite, CaseSnapshot, CustomFieldDefinition } from '../../../types/testManager';
import { CreateTicketRequest } from '../../../types/api/testManager.api';
import RichTextEditor from '../../../components/testManager/RichTextEditor';
import FailBugPrompt, { FailBugPromptData } from './FailBugPrompt';
import { getItemStatusColor } from './testRunUtils';
import { sanitizeHtml, stripHtml } from '../../../utils/sanitize';
import { useAuthStore } from '../../../store/authStore';
import { useProjectSettings } from '../../../hooks/useTestManagerSelectors';
import VideoEvidenceSection from '../../../components/testManager/drive/VideoEvidenceSection';

interface DivergenceFieldLocal {
    field: string;
    snapshotValue: string;
    liveValue: string;
}

const DIVERGENCE_FIELD_LABELS: Record<string, string> = {
    title: 'Title',
    priority: 'Priority',
    area: 'Area',
    expectedResult: 'Expected Result',
    testDescription: 'Description',
    stepsContent: 'Steps',
};

const DIVERGENCE_FIELDS = [
    'title',
    'priority',
    'area',
    'expectedResult',
    'testDescription',
    'stepsContent',
] as const;

type OptimisticRunItemOverride = Pick<RunItem, 'status' | 'actualResult'>;

const CustomFieldsSnapshot: React.FC<{
    snapshotCustomFields?: Record<string, string>;
    definitions: CustomFieldDefinition[];
}> = ({ snapshotCustomFields, definitions }) => {
    const activeDefs = definitions.filter((f) => !f.deleted);
    const fieldsWithContent = activeDefs.filter((field) => {
        const value = snapshotCustomFields?.[field.id] || '';
        return value && value.trim() !== '';
    });

    if (fieldsWithContent.length === 0) return null;

    return (
        <div className="mb-5 sm:mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Fields</h4>
            <div className="space-y-3">
                {fieldsWithContent.map((field) => {
                    const value = snapshotCustomFields?.[field.id] || '';
                    return (
                        <div key={field.id}>
                            <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                                {field.label}
                            </div>
                            {field.type === 'text' || field.type === 'dropdown' ? (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {field.type === 'dropdown'
                                        ? (field.options?.find((opt) => opt.id === value)?.label || value)
                                        : value}
                                </div>
                            ) : field.type === 'long_text' ? (
                                <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    {value}
                                </div>
                            ) : (
                                <RichTextEditor
                                    content={value}
                                    onChange={() => {}}
                                    editable={false}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface PendingFail {
    itemId: string;
    caseSnapshot: CaseSnapshot;
    actualResult: string;
    index: number;
}

export interface ExecuteRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    testRun: TestRun | null;
    onUpdateItem: (itemId: string, status: RunItemStatus, actualResult?: string) => Promise<void>;
    onComplete: () => Promise<void>;
    onCreateTicket: (data: CreateTicketRequest) => Promise<void>;
    startIndex?: number;
    itemOrder?: number[];
    availableTestCases?: TestCase[];
    availableSuites?: TestSuite[];
    customFieldDefinitions?: CustomFieldDefinition[];
    tagSuggestions?: string[];
}

const ExecuteRunModal: React.FC<ExecuteRunModalProps> = ({
    isOpen,
    onClose,
    testRun,
    onUpdateItem,
    onComplete,
    onCreateTicket,
    startIndex = 0,
    itemOrder,
    availableTestCases = [],
    availableSuites = [],
    customFieldDefinitions = [],
    tagSuggestions = [],
}) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [actualResult, setActualResult] = useState('');
    const [showDivergence, setShowDivergence] = useState(false);
    const [pendingSaveCount, setPendingSaveCount] = useState(0);
    const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, OptimisticRunItemOverride>>({});
    const [pendingFail, setPendingFail] = useState<PendingFail | null>(null);
    const [bugSubmitting, setBugSubmitting] = useState(false);
    const [bugError, setBugError] = useState<string | null>(null);

    const currentUserId = useAuthStore((state) => state.user?._id) ?? '';
    const projectSettings = useProjectSettings(testRun?.projectId ?? '');
    const videoEvidenceEnabled = projectSettings?.videoEvidence?.enabled ?? false;
    const videoEvidencePublicLinks = projectSettings?.videoEvidence?.publicLinks ?? false;

    // Reset index when modal opens with a new startIndex
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(startIndex);
            setPendingFail(null);
            setBugError(null);
            setBugSubmitting(false);
        }
    }, [isOpen, startIndex]);

    const orderedIndices = useMemo(() => {
        if (!testRun) return [];
        if (itemOrder && itemOrder.length > 0) {
            return itemOrder.filter((index) => index >= 0 && index < testRun.items.length);
        }
        return testRun.items.map((_, index) => index);
    }, [testRun, itemOrder]);

    const totalItems = orderedIndices.length;
    const activeItemIndex = totalItems > 0 ? orderedIndices[Math.min(currentIndex, totalItems - 1)] : 0;

    const displayedItems = useMemo(() => {
        if (!testRun) return [];

        return testRun.items.map((item) => {
            const override = optimisticOverrides[item.id];
            if (!override) return item;

            return {
                ...item,
                ...override,
            };
        });
    }, [testRun, optimisticOverrides]);

    useEffect(() => {
        if (currentIndex >= totalItems && totalItems > 0) {
            setCurrentIndex(totalItems - 1);
        }
        setShowDivergence(false);
    }, [currentIndex, totalItems]);

    useEffect(() => {
        if (displayedItems[activeItemIndex]) {
            setActualResult(displayedItems[activeItemIndex].actualResult || '');
        }
    }, [displayedItems, activeItemIndex]);

    useEffect(() => {
        if (!testRun) {
            setOptimisticOverrides({});
            return;
        }

        setOptimisticOverrides((currentOverrides) => {
            const nextOverrides = { ...currentOverrides };
            let hasChanges = false;

            testRun.items.forEach((item) => {
                const override = currentOverrides[item.id];
                if (!override) return;

                if (
                    item.status === override.status &&
                    (item.actualResult || '') === (override.actualResult || '')
                ) {
                    delete nextOverrides[item.id];
                    hasChanges = true;
                }
            });

            return hasChanges ? nextOverrides : currentOverrides;
        });
    }, [testRun]);

    const suiteNameById = useMemo(() => {
        const map = new Map<string, string>();
        availableSuites.forEach((suite) => map.set(suite.id, suite.name));
        return map;
    }, [availableSuites]);

    const testCaseById = useMemo(() => {
        const map = new Map<string, TestCase>();
        availableTestCases.forEach((testCase) => map.set(testCase.id, testCase));
        return map;
    }, [availableTestCases]);

    if (!isOpen || !testRun) return null;

    const currentItem = displayedItems[activeItemIndex];
    const executedCount = displayedItems.filter(i => i.status !== RunItemStatus.NotRun).length;

    const caseDivergence = (() => {
        if (!currentItem) return null;
        const live = testCaseById.get(currentItem.caseId);
        if (!live) {
            if (testCaseById.size === 0) return null;
            return { sourceCaseDeleted: true, changedFields: [] as DivergenceFieldLocal[] };
        }

        const snapshot = currentItem.caseSnapshot;
        const changedFields: DivergenceFieldLocal[] = [];

        for (const field of DIVERGENCE_FIELDS) {
            const snapshotValue = String((snapshot as unknown as Record<string, unknown>)[field] ?? '');
            const liveValue = String((live as unknown as Record<string, unknown>)[field] ?? '');
            const isHtml = field === 'stepsContent' || field === 'expectedResult';
            const snapshotNorm = (isHtml ? stripHtml(snapshotValue) : snapshotValue).trim();
            const liveNorm = (isHtml ? stripHtml(liveValue) : liveValue).trim();
            if (snapshotNorm === liveNorm) continue;

            changedFields.push({ field, snapshotValue, liveValue });
        }

        const snapshotCustomFields = snapshot.customFields || {};
        const liveCustomFields = live.customFields || {};
        const allCustomFieldKeys = new Set([...Object.keys(snapshotCustomFields), ...Object.keys(liveCustomFields)]);
        for (const key of allCustomFieldKeys) {
            const snapshotValue = snapshotCustomFields[key] || '';
            const liveValue = liveCustomFields[key] || '';
            if (stripHtml(snapshotValue).trim() === stripHtml(liveValue).trim()) continue;
            changedFields.push({ field: `customFields.${key}`, snapshotValue, liveValue });
        }

        return { sourceCaseDeleted: false, changedFields };
    })();

    const hasDiverged = !!caseDivergence && !caseDivergence.sourceCaseDeleted && caseDivergence.changedFields.length > 0;

    const resolvedSuiteName = (() => {
        const itemCase = testCaseById.get(currentItem.caseId);
        if (itemCase?.suiteId) {
            return suiteNameById.get(itemCase.suiteId) || itemCase.suite || testRun.suiteName || '—';
        }
        return itemCase?.suite || testRun.suiteName || '—';
    })();

    const resolvedAreaName = currentItem.caseSnapshot.area || testCaseById.get(currentItem.caseId)?.area || '—';

    const commitStatusAndAdvance = async (
        itemId: string,
        status: RunItemStatus,
        resultText: string,
        indexAtCommit: number
    ) => {
        const previousOverride = optimisticOverrides[itemId];

        setOptimisticOverrides((currentOverrides) => ({
            ...currentOverrides,
            [itemId]: {
                status,
                actualResult: resultText,
            },
        }));

        if (indexAtCommit < totalItems - 1) {
            setCurrentIndex(indexAtCommit + 1);
        }

        setPendingSaveCount((count) => count + 1);
        try {
            await onUpdateItem(itemId, status, resultText);
        } catch (error: unknown) {
            setOptimisticOverrides((currentOverrides) => {
                const nextOverrides = { ...currentOverrides };

                if (previousOverride) {
                    nextOverrides[itemId] = previousOverride;
                } else {
                    delete nextOverrides[itemId];
                }

                return nextOverrides;
            });
            toast.error((error as Error).message || 'Failed to update status');
        } finally {
            setPendingSaveCount((count) => Math.max(0, count - 1));
        }
    };

    const handleStatusUpdate = (status: RunItemStatus) => {
        // Failing a case opens the guided bug-logging flow instead of
        // committing immediately. The status is committed once the tester
        // creates a ticket or explicitly skips.
        if (status === RunItemStatus.Failed) {
            setBugError(null);
            setPendingFail({
                itemId: currentItem.id,
                caseSnapshot: currentItem.caseSnapshot,
                actualResult,
                index: currentIndex,
            });
            return;
        }

        void commitStatusAndAdvance(currentItem.id, status, actualResult, currentIndex);
    };

    const handleCreateBug = async (data: FailBugPromptData) => {
        if (!pendingFail || !testRun) return;

        setBugSubmitting(true);
        setBugError(null);
        try {
            await onCreateTicket({
                title: data.title,
                description: data.description || undefined,
                priority: data.priority,
                severity: data.severity,
                failureType: data.failureType,
                team: testRun.team,
                relatedRunId: testRun.id,
                relatedRunItemId: pendingFail.itemId,
                tags: data.tags.length > 0 ? data.tags : undefined,
            });
            toast.success('Bug logged');
            const fail = pendingFail;
            setPendingFail(null);
            await commitStatusAndAdvance(fail.itemId, RunItemStatus.Failed, fail.actualResult, fail.index);
        } catch (error: unknown) {
            setBugError((error as Error).message || 'Failed to create bug ticket');
        } finally {
            setBugSubmitting(false);
        }
    };

    const handleSkipBug = () => {
        if (!pendingFail) return;
        const fail = pendingFail;
        setPendingFail(null);
        setBugError(null);
        void commitStatusAndAdvance(fail.itemId, RunItemStatus.Failed, fail.actualResult, fail.index);
    };

    const handleCancelBug = () => {
        setPendingFail(null);
        setBugError(null);
    };

    const handleComplete = async () => {
        try {
            await onComplete();
            toast.success('Test run completed!');
            onClose();
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to complete run');
        }
    };

    const sourceTestCaseHref = `/test-manager/cases?testCaseId=${currentItem.caseId}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">{testRun.title}</h2>
                            {pendingSaveCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 sm:text-sm">
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    Saving
                                </span>
                            )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Progress: {executedCount} / {totalItems} ({Math.round((executedCount / totalItems) * 100)}%)
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 dark:bg-gray-700 flex">
                    {orderedIndices.map((itemIndex, idx) => {
                        const item = displayedItems[itemIndex];
                        return (
                        <div
                            key={item.id}
                            className={`flex-1 ${getItemStatusColor(item.status)} ${idx === currentIndex ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                            style={{ cursor: 'pointer' }}
                        />
                        );
                    })}
                </div>

                {/* Current item */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Case {currentIndex + 1} of {totalItems}
                            </span>
                            <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded ${getItemStatusColor(currentItem.status)} text-white`}>
                                {currentItem.status}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 max-w-[75%] sm:max-w-[100%]">
                            <a
                                href={sourceTestCaseHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-md border border-gray-100 bg-gray-50 p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                                title="Open source test case in new tab"
                                aria-label="Open source test case in new tab"
                            >
                                <ArrowUpRight className="h-4 w-4" />
                            </a>
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 max-w-[180px] sm:max-w-[260px]">
                                <Layers className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                                <span className="truncate">Suite: {resolvedSuiteName}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 max-w-[180px] sm:max-w-[260px]">
                                <MapPin className="w-3.5 h-3.5 text-green-500 dark:text-green-400 flex-shrink-0" />
                                <span className="truncate">Area: {resolvedAreaName}</span>
                            </span>
                            <button
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 active:bg-gray-100 dark:active:bg-gray-700 rounded"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setCurrentIndex(Math.min(totalItems - 1, currentIndex + 1))}
                                disabled={currentIndex === totalItems - 1}
                                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 active:bg-gray-100 dark:active:bg-gray-700 rounded"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
                        <h3 className="min-w-0 flex-1 text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg">
                            {currentItem.caseSnapshot.title}
                        </h3>
                        {caseDivergence && hasDiverged && (
                            <button
                                onClick={() => setShowDivergence((v) => !v)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] sm:text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100/60 dark:hover:bg-amber-900/50 transition-colors cursor-pointer shrink-0"
                            >
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>
                                    Test case updated · {caseDivergence.changedFields.length} field{caseDivergence.changedFields.length === 1 ? '' : 's'} changed
                                </span>
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDivergence ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                        {caseDivergence && caseDivergence.sourceCaseDeleted && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] sm:text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Source test case no longer exists</span>
                            </span>
                        )}
                        {caseDivergence && !hasDiverged && !caseDivergence.sourceCaseDeleted && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] sm:text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Snapshot up to date</span>
                            </span>
                        )}
                    </div>

                    {caseDivergence && hasDiverged && showDivergence && (
                        <div className="mb-5 sm:mb-6 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
                            <div className="px-3 py-2 text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400">
                                Snapshot (what ran) vs live test case
                            </div>
                            <div className="border-t border-amber-200 dark:border-amber-900/50 px-3 py-2 space-y-3">
                                {caseDivergence.changedFields.map((field) => (
                                    <div key={field.field} className="text-xs">
                                        <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                                            {field.field.startsWith('customFields.')
                                                ? (customFieldDefinitions.find((f) => `customFields.${f.id}` === field.field)?.label || field.field)
                                                : (DIVERGENCE_FIELD_LABELS[field.field] || field.field)}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2">
                                                <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Snapshot (what ran)</div>
                                                <div
                                                    className="text-gray-600 dark:text-gray-300 max-h-24 overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(field.snapshotValue) || '<span class="italic text-gray-400">(empty)</span>' }}
                                                />
                                            </div>
                                            <div className="rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2">
                                                <div className="text-[10px] uppercase tracking-wider text-green-500 dark:text-green-400 mb-1">Live case (now)</div>
                                                <div
                                                    className="text-gray-600 dark:text-gray-300 max-h-24 overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(field.liveValue) || '<span class="italic text-gray-400">(empty)</span>' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentItem.caseSnapshot.testDescription && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{currentItem.caseSnapshot.testDescription}</p>
                        </div>
                    )}

                    {currentItem.caseSnapshot.stepsContent && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Steps</h4>
                            <RichTextEditor
                                content={currentItem.caseSnapshot.stepsContent}
                                onChange={() => {}}
                                editable={false}
                            />
                        </div>
                    )}

                    {currentItem.caseSnapshot.expectedResult && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Result</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{currentItem.caseSnapshot.expectedResult}</p>
                        </div>
                    )}

                    <CustomFieldsSnapshot
                        snapshotCustomFields={currentItem.caseSnapshot.customFields}
                        definitions={customFieldDefinitions}
                    />

                    {currentItem.caseSnapshot.comments && (
                        <div className="mb-5 sm:mb-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Comments</h4>
                            <RichTextEditor
                                content={currentItem.caseSnapshot.comments}
                                onChange={() => {}}
                                editable={false}
                            />
                        </div>
                    )}

                    <div className="mb-0">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actual Result / Notes</h4>
                        <RichTextEditor
                            content={actualResult}
                            onChange={setActualResult}
                            placeholder="Enter actual result or notes..."
                            editable={true}
                        />
                    </div>

                    <VideoEvidenceSection
                        projectId={testRun.projectId}
                        enabled={videoEvidenceEnabled}
                        publicLinks={videoEvidencePublicLinks}
                        currentUserId={currentUserId}
                        scope={{ testRunId: testRun.id, testRunItemId: currentItem.id }}
                    />
                </div>

                {/* Action buttons */}
                <div className="px-3 sm:px-6 py-4 sm:py-5 border-t border-gray-100 dark:border-gray-700">
                    {/* Mobile: Stacked layout */}
                    <div className="sm:hidden flex flex-col gap-2">
                        {/* Status buttons grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Passed)}
                                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg active:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Pass
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Failed)}
                                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg active:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                Fail
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Blocked)}
                                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-orange-600 rounded-lg active:bg-orange-700 disabled:opacity-50"
                            >
                                <AlertCircle className="w-3.5 h-3.5" />
                                Blocked
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Skipped)}
                                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        {/* Complete button */}
                        <button
                            onClick={handleComplete}
                            disabled={executedCount < totalItems}
                            className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${executedCount < totalItems
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                    : 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 active:bg-blue-50 dark:active:bg-blue-900/30'
                                }`}
                            title={executedCount < totalItems ? "Please complete all test cases before finishing the run" : ""}
                        >
                            Complete Run
                        </button>
                    </div>

                    {/* Desktop: Horizontal layout */}
                    <div className="hidden sm:flex items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Passed)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Pass
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Failed)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Fail
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Blocked)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Blocked
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(RunItemStatus.Skipped)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                Skip
                            </button>
                        </div>
                        <button
                            onClick={handleComplete}
                            disabled={executedCount < totalItems}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${executedCount < totalItems
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                                    : 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 active:bg-blue-50 dark:active:bg-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                }`}
                            title={executedCount < totalItems ? "Please complete all test cases before finishing the run" : ""}
                        >
                            Complete Run
                        </button>
                    </div>
                </div>

                {pendingFail && (
                    <FailBugPrompt
                        caseSnapshot={pendingFail.caseSnapshot}
                        initialDescription={pendingFail.actualResult}
                        runTitle={testRun.title}
                        runEnvironment={testRun.environment}
                        runTeam={testRun.team}
                        runBuildVersion={testRun.buildVersion}
                        onCreate={handleCreateBug}
                        onSkip={handleSkipBug}
                        onCancel={handleCancelBug}
                        isSubmitting={bugSubmitting}
                        error={bugError}
                        tagSuggestions={tagSuggestions}
                    />
                )}
            </div>
        </div>
    );
};

export default ExecuteRunModal;
