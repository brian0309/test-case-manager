import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Calendar, Tag, Share2, Edit2, Trash2, ChevronDown, ExternalLink } from 'lucide-react';
import { Ticket, TicketStatus, TicketPriority, TicketSeverity } from '../../../types/testManager';
import { getTagColor } from '../../../utils/tagColors';
import {
    getTicketStatusSelectColor,
    getTicketPrioritySelectColor,
    getTicketSeveritySelectColor,
} from '../../../utils/ticketColors';
import TicketModal from '../../../components/testManager/TicketModal';
import DiscussionPanel from '../../../components/testManager/DiscussionPanel';
import IdDisplay from '../../../components/testManager/IdDisplay';
import toast from 'react-hot-toast';

interface TicketDetailViewProps {
    ticket: Ticket;
    onClose: () => void;
    onUpdate: (data: {
        title?: string;
        description?: string;
        status?: TicketStatus;
        priority?: TicketPriority;
        severity?: TicketSeverity;
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
    const navigate = useNavigate();

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
        try {
            await onUpdate({ status });
        } finally {
            setSavingField(null);
        }
    };

    const handlePriorityChange = async (priority: TicketPriority) => {
        setSavingField('priority');
        try {
            await onUpdate({ priority });
        } finally {
            setSavingField(null);
        }
    };

    const handleSeverityChange = async (severity: TicketSeverity) => {
        setSavingField('severity');
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
        assignedToId?: string;
        relatedRunId?: string;
        tags?: string[];
    }) => {
        await onUpdate({
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            severity: data.severity,
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
                    <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center gap-3">
                            <IdDisplay
                                id={ticket.id}
                                className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md"
                            />
                            <span className="text-xs text-gray-400 dark:text-gray-500">View Mode</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleShareClick}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5"
                                title="Copy link to clipboard"
                            >
                                <Share2 className="h-4 w-4" />
                                Share
                            </button>
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-1.5"
                                title="Edit Ticket"
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit
                            </button>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

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
                                </div>
                            </div>

                            {/* Related Test Run */}
                            {ticket.relatedRunId && (
                                <div className="mb-5">
                                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Related Test Run
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleOpenRelatedRun}
                                        title={ticket.relatedRunItemId ? 'Open the linked test in this run' : 'Open this test run'}
                                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                                    >
                                        <span className="truncate max-w-xs">{relatedRunTitle || ticket.relatedRunId}</span>
                                        <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                                    </button>
                                </div>
                            )}

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
        </>
    );
};

export default TicketDetailView;
