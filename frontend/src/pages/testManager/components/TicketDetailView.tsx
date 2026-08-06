import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Calendar, Tag, Share2, Edit2, Trash2, ChevronDown, ExternalLink, CheckCircle2, RotateCcw, AlertTriangle, Box, Users, GitCommitHorizontal } from 'lucide-react';
import { Ticket, TicketStatus, TicketPriority, TicketSeverity, FailureType, ReturnReason } from '../../../types/testManager';
import { getTagColor } from '../../../utils/tagColors';
import {
    getTicketStatusSelectColor,
    getTicketPrioritySelectColor,
    getTicketSeveritySelectColor,
    getFailureTypeColor,
} from '../../../utils/ticketColors';
import { sanitizeHtml } from '../../../utils/sanitize';
import TicketModal from '../../../components/testManager/TicketModal';
import DiscussionPanel from '../../../components/testManager/DiscussionPanel';
import IdDisplay from '../../../components/testManager/IdDisplay';
import { useTicketCollaborativeEditing } from '../../../hooks/useTicketCollaborativeEditing';
import { useTestManagerStore } from '../../../store/testManagerStore';
import toast from 'react-hot-toast';

type FieldValue = string | number | boolean | null;

const DEFAULT_AVATAR = (name: string) =>
    `https://ui-avatars.com/api/?background=random&color=fff&name=${encodeURIComponent(name)}`;

const DIVERGENCE_FIELD_LABELS: Record<string, string> = {
    title: 'Title',
    priority: 'Priority',
    area: 'Area',
    expectedResult: 'Expected Result',
    testDescription: 'Description',
    stepsContent: 'Steps',
};

interface TicketDetailViewProps {
    ticket: Ticket;
    onClose: () => void;
    onUpdate: (data: {
        title?: string;
        description?: string;
        status?: TicketStatus;
        priority?: TicketPriority;
        severity?: TicketSeverity;
        failureType?: FailureType;
        team?: string;
        assignedToId?: string;
        relatedRunId?: string;
        relatedRunItemId?: string;
        tags?: string[];
    }) => Promise<void>;
    onDelete: () => Promise<void>;
    projectMembers: { id: string; name: string }[];
    testRuns: { id: string; title: string }[];
    tagSuggestions?: string[];
}

const TicketDetailView: React.FC<TicketDetailViewProps> = ({
    ticket,
    onClose,
    onUpdate,
    onDelete,
    projectMembers,
    testRuns,
    tagSuggestions = [],
}) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [isMarkingReproduced, setIsMarkingReproduced] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState<ReturnReason>(ReturnReason.MissingSteps);
    const [isReturning, setIsReturning] = useState(false);
    const [showDivergence, setShowDivergence] = useState(false);
    const navigate = useNavigate();

    const applyRemoteTicketUpdate = useTestManagerStore((state) => state.applyRemoteTicketUpdate);
    const markTicketReproduced = useTestManagerStore((state) => state.markTicketReproduced);
    const returnTicketForInfo = useTestManagerStore((state) => state.returnTicketForInfo);

    const handleMarkReproduced = async () => {
        if (ticket.firstReproducedAt || isMarkingReproduced) return;
        setIsMarkingReproduced(true);
        try {
            const updated = await markTicketReproduced(ticket.projectId, ticket.id);
            applyRemoteTicketUpdate(updated);
            toast.success('Ticket marked as reproduced');
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to mark ticket as reproduced');
        } finally {
            setIsMarkingReproduced(false);
        }
    };

    const handleReturnForInfo = async () => {
        if (isReturning) return;
        setIsReturning(true);
        try {
            const updated = await returnTicketForInfo(ticket.projectId, ticket.id, returnReason);
            applyRemoteTicketUpdate(updated);
            setShowReturnModal(false);
            toast.success('Ticket returned for missing context');
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to return ticket');
        } finally {
            setIsReturning(false);
        }
    };

    // Live collaboration: presence + real-time field previews
    const handleRemoteFieldUpdate = useCallback((field: string, value: FieldValue) => {
        const updated = { ...ticket } as Ticket;
        (updated as unknown as Record<string, unknown>)[field] = value;
        applyRemoteTicketUpdate(updated);
    }, [ticket, applyRemoteTicketUpdate]);

    const { collaboratingUsers, emitFieldChange, remoteEditingField } = useTicketCollaborativeEditing({
        ticket,
        onFieldUpdate: handleRemoteFieldUpdate,
    });

    const relatedRunTitle = ticket.relatedRunId
        ? testRuns.find((r) => r.id === ticket.relatedRunId)?.title
        : undefined;

    const handleOpenRelatedRun = () => {
        if (!ticket.relatedRunId) return;
        const params = new URLSearchParams({ runId: ticket.relatedRunId });
        if (ticket.relatedRunItemId) {
            params.set('itemId', ticket.relatedRunItemId);
        }
        onClose();
        navigate(`/test-manager/runs?${params.toString()}`);
    };

    const handleStatusChange = async (status: TicketStatus) => {
        setSavingField('status');
        emitFieldChange('status', status);
        try {
            await onUpdate({ status });
        } finally {
            setSavingField(null);
        }
    };

    const handlePriorityChange = async (priority: TicketPriority) => {
        setSavingField('priority');
        emitFieldChange('priority', priority);
        try {
            await onUpdate({ priority });
        } finally {
            setSavingField(null);
        }
    };

    const handleSeverityChange = async (severity: TicketSeverity) => {
        setSavingField('severity');
        emitFieldChange('severity', severity);
        try {
            await onUpdate({ severity });
        } finally {
            setSavingField(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleShareClick = async () => {
        const shareUrl = `${window.location.origin}/test-manager/tickets?ticketId=${ticket.id}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard');
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success('Link copied to clipboard');
        }
    };

    const handleEditSubmit = async (data: {
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
    }) => {
        emitFieldChange('title', data.title);
        emitFieldChange('description', data.description ?? '');
        await onUpdate({
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            severity: data.severity,
            failureType: data.failureType,
            team: data.team,
            assignedToId: data.assignedToId,
            relatedRunId: data.relatedRunId,
            tags: data.tags,
        });
        setIsEditModalOpen(false);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete();
        } catch {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl mx-4 max-h-[85vh] flex flex-col overflow-hidden animate-[scaleIn_0.2s_ease-out]">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <IdDisplay
                                id={ticket.id}
                                className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md"
                            />
                            <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">View Mode</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                            {/* Collaborating users (live presence) */}
                            {collaboratingUsers.length > 0 && (
                                <div className="hidden sm:flex items-center -space-x-2 mr-1" title={`${collaboratingUsers.map((u) => u.name).join(', ')} viewing this ticket`}>
                                    {collaboratingUsers.slice(0, 4).map((u) => (
                                        <img
                                            key={u.id}
                                            src={u.avatar || DEFAULT_AVATAR(u.name)}
                                            alt={u.name}
                                            title={`${u.name} is viewing this ticket`}
                                            className="h-7 w-7 rounded-full border-2 border-white dark:border-gray-800"
                                        />
                                    ))}
                                    {collaboratingUsers.length > 4 && (
                                        <span className="h-7 min-w-[28px] px-1 inline-flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600 text-[10px] font-semibold text-gray-600 dark:text-gray-200">
                                            +{collaboratingUsers.length - 4}
                                        </span>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={handleShareClick}
                                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5"
                                title="Copy link to clipboard"
                                aria-label="Copy link to clipboard"
                            >
                                <Share2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Share</span>
                            </button>
                            <button
                                onClick={() => {
                                    emitFieldChange('title', ticket.title ?? '');
                                    setIsEditModalOpen(true);
                                }}
                                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-1.5"
                                title="Edit Ticket"
                                aria-label="Edit Ticket"
                            >
                                <Edit2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Live editing indicator */}
                    {remoteEditingField && (
                        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-400">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <span>
                                <span className="font-medium">{remoteEditingField.userName}</span> is editing {remoteEditingField.field}...
                            </span>
                        </div>
                    )}

                    {/* Content area: main content + discussion panel side by side */}
                    <div className="relative flex-1 min-h-0 lg:flex lg:overflow-hidden overflow-y-auto">
                        {/* Main Content */}
                        <div className="flex-1 min-h-0 p-4 md:p-6 lg:overflow-y-auto">
                            <div className="mb-5">
                                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
                                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{ticket.title}</h1>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                                {/* Status */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                                    <div className="relative">
                                        <select
                                            value={ticket.status}
                                            onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                                            disabled={savingField === 'status'}
                                            className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 disabled:opacity-60 ${getTicketStatusSelectColor(ticket.status)}`}
                                        >
                                            {Object.values(TicketStatus).map(s => (
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
                                            value={ticket.priority}
                                            onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                                            disabled={savingField === 'priority'}
                                            className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 disabled:opacity-60 ${getTicketPrioritySelectColor(ticket.priority)}`}
                                        >
                                            {Object.values(TicketPriority).map(p => (
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
                                            value={ticket.severity}
                                            onChange={(e) => handleSeverityChange(e.target.value as TicketSeverity)}
                                            disabled={savingField === 'severity'}
                                            className={`w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 disabled:opacity-60 ${getTicketSeveritySelectColor(ticket.severity)}`}
                                        >
                                            {Object.values(TicketSeverity).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                                    </div>
                                </div>
                            </div>

                            {/* Description (HTML rendered) */}
                            {ticket.description ? (
                                <div className="mb-5">
                                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Description
                                    </h3>
                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 [&_img]:cursor-zoom-in [&_img]:rounded-md"
                                        onClick={(e) => {
                                            const target = e.target;
                                            if (target instanceof HTMLImageElement) {
                                                e.preventDefault();
                                                const imageUrl = target.currentSrc || target.src;
                                                if (imageUrl) {
                                                    setLightboxUrl(imageUrl);
                                                }
                                            }
                                        }}
                                        dangerouslySetInnerHTML={{ __html: ticket.description }}
                                    />
                                </div>
                            ) : (
                                <div className="mb-5">
                                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Description
                                    </h3>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                        No description provided
                                    </p>
                                </div>
                            )}

                            {/* Details grid */}
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                                    Details
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <User size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">Created by:</span>
                                        <span className="text-gray-900 dark:text-gray-100 font-medium truncate">{ticket.createdBy.name}</span>
                                    </div>
                                    {ticket.assignedTo && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <User size={14} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">Assigned to:</span>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium truncate">{ticket.assignedTo.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">Created:</span>
                                        <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatDate(ticket.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">Updated:</span>
                                        <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatDate(ticket.updatedAt)}</span>
                                    </div>
                                    {ticket.failureType && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <AlertTriangle size={14} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">Failure type:</span>
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium border ${getFailureTypeColor(ticket.failureType)}`}>
                                                {ticket.failureType}
                                            </span>
                                        </div>
                                    )}
                                    {ticket.team && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Users size={14} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">Team:</span>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium truncate">{ticket.team}</span>
                                        </div>
                                    )}
                                    {ticket.environment && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Box size={14} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">Environment:</span>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium truncate">{ticket.environment}</span>
                                        </div>
                                    )}
                                    {ticket.buildVersion && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <GitCommitHorizontal size={14} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">Build:</span>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium truncate">{ticket.buildVersion}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Related Test Run */}
                            {ticket.relatedRunId && (
                                <div className="mb-5">
                                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Related Test Run
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleOpenRelatedRun}
                                            title={ticket.relatedRunItemId ? 'Open the linked test in this run' : 'Open this test run'}
                                            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                                        >
                                            <span className="truncate max-w-xs">{relatedRunTitle || ticket.relatedRunId}</span>
                                            <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                                        </button>
                                        {ticket.divergence?.caseId && (
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/test-manager/cases?testCaseId=${ticket.divergence?.caseId}`)}
                                                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                                title="Open the live test case"
                                            >
                                                <span>View live case</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Snapshot divergence indicator */}
                                    {ticket.divergence && (ticket.divergence.hasDiverged || ticket.divergence.sourceCaseDeleted) && (
                                        <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setShowDivergence((v) => !v)}
                                                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-colors"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                                    {ticket.divergence.sourceCaseDeleted
                                                        ? 'Source test case no longer exists — the run snapshot is preserved'
                                                        : `Test case has changed since this run ran (${ticket.divergence.changedFields.length} field${ticket.divergence.changedFields.length === 1 ? '' : 's'} changed)`}
                                                </span>
                                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDivergence ? 'rotate-180' : ''}`} />
                                            </button>
                                            {showDivergence && !ticket.divergence.sourceCaseDeleted && (
                                                <div className="border-t border-amber-200 dark:border-amber-900/50 px-3 py-2 space-y-3">
                                                    {ticket.divergence.changedFields.map((field) => (
                                                        <div key={field.field} className="text-xs">
                                                            <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                                                                {DIVERGENCE_FIELD_LABELS[field.field] || field.field}
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
                                            )}
                                        </div>
                                    )}

                                    {ticket.divergence && !ticket.divergence.hasDiverged && !ticket.divergence.sourceCaseDeleted && (
                                        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Snapshot up to date
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Triage lifecycle */}
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                    Triage
                                </h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    {ticket.firstReproducedAt ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800" title={`Reproduced on ${formatDate(ticket.firstReproducedAt)}`}>
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Reproduced · {formatDate(ticket.firstReproducedAt)}
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleMarkReproduced}
                                            disabled={isMarkingReproduced}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            {isMarkingReproduced ? 'Marking...' : 'Mark reproduced'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowReturnModal(true)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Return for missing info
                                    </button>
                                </div>
                                {(ticket.returnedCount || 0) > 0 && (
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Returned {ticket.returnedCount} time{ticket.returnedCount === 1 ? '' : 's'}
                                        {ticket.lastReturnReason && (
                                            <span>
                                                {' '}· last: <span className="text-amber-600 dark:text-amber-400 font-medium">{ticket.lastReturnReason}</span>
                                            </span>
                                        )}
                                        {ticket.lastReturnedAt && (
                                            <span> · {formatDate(ticket.lastReturnedAt)}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {ticket.tags.length > 0 && (
                                <div className="mb-5">
                                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {ticket.tags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${getTagColor(tag)}`}
                                            >
                                                <Tag className="h-3 w-3 opacity-70" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Delete */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <Trash2 size={14} />
                                    Delete Ticket
                                </button>
                            </div>

                            {/* Delete Confirmation */}
                            {showDeleteConfirm && (
                                <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30 rounded-lg">
                                    <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                                        Are you sure you want to delete this ticket? This action cannot be undone.
                                    </p>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                                        >
                                            {isDeleting ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Discussion Panel (sidebar) */}
                        <DiscussionPanel
                            entityId={ticket.id}
                            projectId={ticket.projectId}
                            entityType="ticket"
                            mode="sidebar"
                        />
                    </div>
                </div>
            </div>

            {/* Fullscreen Image Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        onClick={() => setLightboxUrl(null)}
                        className="absolute top-4 right-4 p-2.5 rounded-full border border-white/20 bg-black/75 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-white/70"
                        title="Close preview"
                        aria-label="Close preview"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt="Preview"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Edit Ticket Modal */}
            {isEditModalOpen && (
                <TicketModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSubmit={handleEditSubmit}
                    projectMembers={projectMembers}
                    testRuns={testRuns}
                    initialTicket={ticket}
                    tagSuggestions={tagSuggestions}
                />
            )}

            {/* Return for missing info modal */}
            {showReturnModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowReturnModal(false)}
                    />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-[scaleIn_0.2s_ease-out] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <RotateCcw size={16} className="text-amber-500" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Return for missing context</span>
                            </div>
                            <button
                                onClick={() => setShowReturnModal(false)}
                                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Why is this ticket missing context? This helps the team spot workflow gaps in triage.
                            </p>
                            <div className="relative">
                                <select
                                    value={returnReason}
                                    onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                                    className="w-full appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-medium outline-none transition-all cursor-pointer border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 border-gray-200 text-gray-700 focus:ring-2 focus:ring-offset-1 focus:ring-amber-100"
                                >
                                    {Object.values(ReturnReason).map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowReturnModal(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReturnForInfo}
                                disabled={isReturning}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {isReturning && <RotateCcw className="h-4 w-4 animate-spin" />}
                                {isReturning ? 'Returning...' : 'Return ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TicketDetailView;
