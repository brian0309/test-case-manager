import React, { useEffect, useMemo, useState } from 'react';
import { Bug, ChevronDown, Loader2, Layers, ClipboardList, X, Box, Users } from 'lucide-react';
import RichTextEditor from '../../../components/testManager/RichTextEditor';
import TagInput from '../../../components/testManager/TagInput';
import { CaseSnapshot, TicketPriority, TicketSeverity, FailureType } from '../../../types/testManager';
import {
    getTicketPrioritySelectColor,
    getTicketSeveritySelectColor,
    getFailureTypeColor,
} from '../../../utils/ticketColors';
import { mapCasePriorityToTicketDefaults } from './testRunUtils';

export interface FailBugPromptData {
    title: string;
    description: string;
    priority: TicketPriority;
    severity: TicketSeverity;
    failureType?: FailureType;
    tags: string[];
}

export interface FailBugPromptProps {
    caseSnapshot: CaseSnapshot;
    initialDescription: string;
    runTitle: string;
    runEnvironment?: string;
    runTeam?: string;
    runBuildVersion?: string;
    onCreate: (data: FailBugPromptData) => Promise<void>;
    onSkip: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
    error: string | null;
    tagSuggestions?: string[];
}

const DEFAULT_TAGS = ['failed-run'];

/** Returns true if the given rich-text HTML has any visible text content. */
const hasTextContent = (html: string): boolean => {
    if (!html) return false;
    const withoutTags = html.replace(/<[^>]*>/g, '');
    const decoded = withoutTags.replace(/&nbsp;/gi, ' ');
    return decoded.trim().length > 0;
};

/** Lightweight best-effort failure-type suggestion from the description/tags. */
const suggestFailureType = (value: string): FailureType => {
    const text = (value || '').toLowerCase();
    const rules: Array<[FailureType, string[]]> = [
        [FailureType.Functional, ['crash', 'crashes', 'error', 'broken', 'incorrect', 'bug', 'fails', 'failed', 'wrong']],
        [FailureType.UIUX, ['ui', 'ux', 'layout', 'render', 'display', 'css', 'style', 'frontend']],
        [FailureType.Integration, ['integration', '3rd party', 'third party', 'oauth', 'webhook']],
        [FailureType.DataAPI, ['api', 'endpoint', '400', '401', '403', '404', '500', 'response']],
        [FailureType.EnvironmentSetup, ['environment', 'build', 'config', 'deploy', 'setup', 'staging', 'prod']],
        [FailureType.FlakyIntermittent, ['flaky', 'intermittent', 'rarely', 'sometimes', 'sporadic', 'random']],
        [FailureType.Performance, ['performance', 'slow', 'timeout', 'lag', 'memory']],
        [FailureType.Security, ['security', 'auth', 'permission', 'xss', 'csrf', 'encryption']],
    ];

    for (const [type, patterns] of rules) {
        if (patterns.some((p) => text.includes(p))) {
            return type;
        }
    }
    return FailureType.Other;
};

const FailBugPrompt: React.FC<FailBugPromptProps> = ({
    caseSnapshot,
    initialDescription,
    runTitle,
    runEnvironment,
    runTeam,
    runBuildVersion,
    onCreate,
    onSkip,
    onCancel,
    isSubmitting,
    error,
    tagSuggestions = [],
}) => {
    const defaults = useMemo(
        () => mapCasePriorityToTicketDefaults(caseSnapshot.priority),
        [caseSnapshot.priority]
    );

    const seededDescription = useMemo(() => {
        if (hasTextContent(initialDescription)) {
            return initialDescription;
        }
        const expected = caseSnapshot.expectedResult?.trim();
        return `<p><strong>Expected:</strong> ${expected || ''}</p><p><strong>Actual:</strong> </p>`;
    }, [initialDescription, caseSnapshot.expectedResult]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TicketPriority>(defaults.priority);
    const [severity, setSeverity] = useState<TicketSeverity>(defaults.severity);
    const [failureType, setFailureType] = useState<FailureType>(FailureType.Other);
    const [tags, setTags] = useState<string[]>(DEFAULT_TAGS);

    // Seed the form each time the prompt is mounted for a new failing case.
    useEffect(() => {
        setTitle(`[FAIL] ${caseSnapshot.title}`);
        setDescription(seededDescription);
        setPriority(defaults.priority);
        setSeverity(defaults.severity);
        setTags(DEFAULT_TAGS);
        const suggested = suggestFailureType(`${caseSnapshot.title} ${caseSnapshot.stepsContent || ''} ${caseSnapshot.expectedResult || ''} ${[...DEFAULT_TAGS, ...(tagSuggestions || [])].join(' ')}`);
        setFailureType(suggested);
    }, [caseSnapshot.title, seededDescription, defaults.priority, defaults.severity, caseSnapshot.stepsContent, caseSnapshot.expectedResult, tagSuggestions]);

    const canCreate = title.trim().length > 0 && hasTextContent(description) && !isSubmitting;

    const handleCreate = async () => {
        if (!canCreate) return;
        await onCreate({
            title: title.trim(),
            description,
            priority,
            severity,
            failureType,
            tags,
        });
    };

    return (
        <div className="absolute inset-0 z-10 flex flex-col bg-white dark:bg-gray-800 animate-[scaleIn_0.15s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <Bug size={18} className="text-red-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Log a bug</span>
                    <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 truncate">
                        for this failed case
                    </span>
                </div>
                <button
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                    title="Cancel (keep case unmarked)"
                    aria-label="Cancel"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                {/* Linked context chips */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 max-w-[220px]">
                        <ClipboardList className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                        <span className="truncate">Run: {runTitle}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 max-w-[220px]">
                        <Layers className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                        <span className="truncate">Case: {caseSnapshot.title}</span>
                    </span>
                    {runEnvironment && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 max-w-[220px]">
                            <Box className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                            <span className="truncate" title="Environment">Env: {runEnvironment}</span>
                        </span>
                    )}
                    {runTeam && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 max-w-[220px]">
                            <Users className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                            <span className="truncate" title={runTeam}>Team: {runTeam}</span>
                        </span>
                    )}
                    {runBuildVersion && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 max-w-[220px]">
                            <Box className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                            <span className="truncate" title="Build">Build: {runBuildVersion}</span>
                        </span>
                    )}
                </div>

                {/* Title */}
                <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                        Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full text-base font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-white dark:bg-gray-800"
                        placeholder="Bug title"
                    />
                </div>

                {/* Failure Type */}
                <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                        Failure Type
                    </label>
                    <div className="relative">
                        <select
                            value={failureType}
                            onChange={(e) => setFailureType(e.target.value as FailureType)}
                            className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getFailureTypeColor(failureType)}`}
                        >
                            {Object.values(FailureType).map((ft) => (
                                <option key={ft} value={ft}>{ft}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                    </div>
                </div>

                {/* Priority & Severity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
                        <div className="relative">
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                                className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getTicketPrioritySelectColor(priority)}`}
                            >
                                {Object.values(TicketPriority).map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Severity</label>
                        <div className="relative">
                            <select
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value as TicketSeverity)}
                                className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getTicketSeveritySelectColor(severity)}`}
                            >
                                {Object.values(TicketSeverity).map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                        <span className="font-bold">Error:</span> {error}
                    </div>
                )}

                {/* Description */}
                <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                        Description <span className="text-red-500">*</span>
                    </label>
                    <RichTextEditor
                        content={description}
                        onChange={setDescription}
                        placeholder="Describe what went wrong. Steps to reproduce, expected vs actual, screenshots, etc."
                    />
                </div>

                {/* Tags */}
                <div className="mb-2">
                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Tags</label>
                    <TagInput
                        tags={tags}
                        onChange={setTags}
                        suggestions={tagSuggestions}
                        placeholder="Add tags..."
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="px-3 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <button
                    onClick={onSkip}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                    Skip - mark failed without ticket
                </button>
                <button
                    onClick={handleCreate}
                    disabled={!canCreate}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    title={!hasTextContent(description) ? 'A description is required to create a bug' : ''}
                >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Creating...' : 'Create ticket & continue'}
                </button>
            </div>
        </div>
    );
};

export default FailBugPrompt;
