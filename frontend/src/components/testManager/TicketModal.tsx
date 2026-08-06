import React, { useState, useEffect } from 'react';
import { X, Bug, ChevronDown, Loader2, Check, Cloud } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import TagInput from './TagInput';
import { Ticket, TicketStatus, TicketPriority, TicketSeverity, FailureType } from '../../types/testManager';
import {
    getTicketStatusSelectColor,
    getTicketPrioritySelectColor,
    getTicketSeveritySelectColor,
    getFailureTypeColor,
} from '../../utils/ticketColors';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        title: string;
        description?: string;
        priority: TicketPriority;
        severity: TicketSeverity;
        status?: TicketStatus;
        failureType?: FailureType;
        team?: string;
        assignedToId?: string;
        relatedRunId?: string;
        tags?: string[];
    }) => Promise<void>;
    projectMembers: { id: string; name: string }[];
    testRuns: { id: string; title: string }[];
    /** If provided, operates in edit mode */
    initialTicket?: Ticket | null;
    /** Tag suggestions for auto-complete */
    tagSuggestions?: string[];
}

const TicketModal: React.FC<TicketModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    projectMembers,
    testRuns,
    initialTicket,
    tagSuggestions = [],
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<TicketStatus>(TicketStatus.Open);
    const [priority, setPriority] = useState<TicketPriority>(TicketPriority.Medium);
    const [severity, setSeverity] = useState<TicketSeverity>(TicketSeverity.Minor);
    const [failureType, setFailureType] = useState<FailureType | undefined>(undefined);
    const [team, setTeam] = useState('');
    const [assignedToId, setAssignedToId] = useState('');
    const [relatedRunId, setRelatedRunId] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    const isEditMode = !!initialTicket;

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setTitle(initialTicket?.title || '');
            setDescription(initialTicket?.description || '');
            setStatus(initialTicket?.status || TicketStatus.Open);
            setPriority(initialTicket?.priority || TicketPriority.Medium);
            setSeverity(initialTicket?.severity || TicketSeverity.Minor);
            setFailureType(initialTicket?.failureType || undefined);
            setTeam(initialTicket?.team || '');
            setAssignedToId(initialTicket?.assignedTo?.id || '');
            setRelatedRunId(initialTicket?.relatedRunId || '');
            setTags(initialTicket?.tags || []);
            setSaveStatus('idle');
            setError(null);
        }
    }, [isOpen, initialTicket]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) return;
        setIsSubmitting(true);
        setSaveStatus('saving');
        setError(null);
        try {
            await onSubmit({
                title: title.trim(),
                description: description || undefined,
                priority,
                severity,
                ...(isEditMode ? { status } : {}),
                failureType,
                team: team.trim() || undefined,
                assignedToId: assignedToId || undefined,
                relatedRunId: isEditMode ? relatedRunId : (relatedRunId || undefined),
                tags: tags.length > 0 ? tags : undefined,
            });
            setSaveStatus('saved');
            onClose();
        } catch (err: unknown) {
            setSaveStatus('error');
            setError((err as Error)?.message || 'Failed to save ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full h-full sm:h-auto sm:max-w-4xl bg-white dark:bg-gray-800 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] animate-[scaleIn_0.2s_ease-out]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Bug size={18} className="text-red-500" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
                            {isEditMode ? 'Edit Ticket' : 'New Ticket'}
                        </span>
                        {/* Save status indicator */}
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                            {saveStatus === 'saving' && (
                                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Saving...
                                </span>
                            )}
                            {saveStatus === 'saved' && (
                                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full animate-in fade-in duration-200">
                                    <Check className="h-3 w-3" />
                                    Saved
                                </span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full">
                                    Save failed
                                </span>
                            )}
                            {saveStatus === 'idle' && (
                                <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                                    <Cloud className="h-3.5 w-3.5" />
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {/* Title */}
                    <div className="mb-5">
                        <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-2xl font-semibold text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-white dark:bg-gray-800"
                            placeholder="Ticket Title"
                        />
                    </div>

                    {/* Status, Priority, Severity row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                        {/* Status */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                            <div className="relative">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as TicketStatus)}
                                    className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${getTicketStatusSelectColor(status)}`}
                                >
                                    {Object.values(TicketStatus).map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                            </div>
                        </div>

                        {/* Priority */}
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

                        {/* Severity */}
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

                    {/* Assignee & Related Test Run row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        {/* Assignee */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Assignee</label>
                            <div className="relative">
                                <select
                                    value={assignedToId}
                                    onChange={(e) => setAssignedToId(e.target.value)}
                                    className="w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100"
                                >
                                    <option value="">Unassigned</option>
                                    {projectMembers.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                            </div>
                        </div>

                        {/* Related Test Run */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Related Test Run</label>
                            <div className="relative">
                                <select
                                    value={relatedRunId}
                                    onChange={(e) => setRelatedRunId(e.target.value)}
                                    className="w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100"
                                >
                                    <option value="">None</option>
                                    {testRuns.map((r) => (
                                        <option key={r.id} value={r.id}>{r.title}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                            </div>
                        </div>
                    </div>

                    {/* Failure Type & Team row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        {/* Failure Type */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Failure Type</label>
                            <div className="relative">
                                <select
                                    value={failureType ?? ''}
                                    onChange={(e) => setFailureType(e.target.value ? (e.target.value as FailureType) : undefined)}
                                    className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 ${failureType ? getFailureTypeColor(failureType) : 'bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 border-gray-200 text-gray-700'}`}
                                >
                                    <option value="">Unspecified</option>
                                    {Object.values(FailureType).map((ft) => (
                                        <option key={ft} value={ft}>{ft}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                            </div>
                        </div>

                        {/* Team */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Team</label>
                            <input
                                type="text"
                                value={team}
                                onChange={(e) => setTeam(e.target.value)}
                                className="w-full rounded-lg py-2 pl-3 pr-3 text-sm font-medium outline-none transition-all border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 border-gray-200 text-gray-700 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100"
                                placeholder="e.g. QA, Backend, Mobile"
                            />
                        </div>
                    </div>

                    {/* Read-only run context (copied at creation from the run) */}
                    {isEditMode && (initialTicket?.environment || initialTicket?.buildVersion) && (
                        <div className="mb-5 flex flex-wrap items-center gap-2">
                            {initialTicket?.environment && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                                    Env: {initialTicket.environment}
                                </span>
                            )}
                            {initialTicket?.buildVersion && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                                    Build: {initialTicket.buildVersion}
                                </span>
                            )}
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 italic">Captured from the run snapshot</span>
                        </div>
                    )}

                    {/* Error display */}
                    {error && (
                        <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    {/* Description (WYSIWYG) */}
                    <div className="mb-5">
                        <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                        <RichTextEditor
                            content={description}
                            onChange={(html) => setDescription(html)}
                            placeholder="Describe the issue in detail. You can use formatting, lists, images, etc."
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

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {isEditMode ? 'Changes are saved when you click Save Changes' : 'Fill in all required fields to create'}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !title.trim()}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isSubmitting
                                ? (isEditMode ? 'Saving...' : 'Creating...')
                                : (isEditMode ? 'Save Changes' : 'Create Ticket')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketModal;
