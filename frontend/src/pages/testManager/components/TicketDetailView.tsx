import React, { useState } from 'react';
import { X, Bug, User, Calendar, Tag, ArrowLeft, Edit3, Trash2, ChevronDown } from 'lucide-react';
import { Ticket, TicketStatus, TicketPriority, TicketSeverity } from '../../../types/testManager';
import { getTagColor } from '../../../utils/tagColors';
import {
    getTicketStatusSelectColor,
    getTicketPrioritySelectColor,
    getTicketSeveritySelectColor,
} from '../../../utils/ticketColors';
import TicketModal from '../../../components/testManager/TicketModal';
import DiscussionPanel from '../../../components/testManager/DiscussionPanel';

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
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-2xl">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={onClose}
                                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 flex-shrink-0"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <Bug size={20} className="text-red-500 flex-shrink-0" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {ticket.title}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 flex-shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content area: main content + discussion panel side by side */}
                    <div className="relative flex-1 min-h-0 lg:flex lg:overflow-hidden overflow-y-auto">
                        {/* Main Content */}
                        <div className="flex-1 min-h-0 p-6 space-y-6 lg:overflow-y-auto">
                            {/* Status, Priority, Severity inline edit dropdowns */}
                            <div className="flex flex-wrap gap-2">
                                <div className="relative">
                                    <select
                                        value={ticket.status}
                                        onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                                        disabled={savingField === 'status'}
                                        className={`appearance-none rounded-lg py-1.5 pl-2.5 pr-7 text-xs font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 disabled:opacity-60 ${getTicketStatusSelectColor(ticket.status)}`}
                                    >
                                        {Object.values(TicketStatus).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                                </div>
                                <div className="relative">
                                    <select
                                        value={ticket.priority}
                                        onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                                        disabled={savingField === 'priority'}
                                        className={`appearance-none rounded-lg py-1.5 pl-2.5 pr-7 text-xs font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 disabled:opacity-60 ${getTicketPrioritySelectColor(ticket.priority)}`}
                                    >
                                        {Object.values(TicketPriority).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                                </div>
                                <div className="relative">
                                    <select
                                        value={ticket.severity}
                                        onChange={(e) => handleSeverityChange(e.target.value as TicketSeverity)}
                                        disabled={savingField === 'severity'}
                                        className={`appearance-none rounded-lg py-1.5 pl-2.5 pr-7 text-xs font-medium outline-none transition-all cursor-pointer border hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-blue-100 disabled:opacity-60 ${getTicketSeveritySelectColor(ticket.severity)}`}
                                    >
                                        {Object.values(TicketSeverity).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none opacity-50" />
                                </div>
                            </div>

                            {/* Description (HTML rendered) */}
                            {ticket.description ? (
                                <div>
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
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Description
                                    </h3>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                        No description provided
                                    </p>
                                </div>
                            )}

                            {/* Details grid */}
                            <div>
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                                    Details
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <User size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-500 dark:text-gray-500">Created by:</span>
                                        <span className="text-gray-900 dark:text-gray-100 font-medium truncate">{ticket.createdBy.name}</span>
                                    </div>
                                    {ticket.assignedTo && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <User size={14} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-500 dark:text-gray-500">Assigned to:</span>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium truncate">{ticket.assignedTo.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-500 dark:text-gray-500">Created:</span>
                                        <span className="text-gray-900 dark:text-gray-100">{formatDate(ticket.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-500 dark:text-gray-500">Updated:</span>
                                        <span className="text-gray-900 dark:text-gray-100">{formatDate(ticket.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Related Test Run */}
                            {ticket.relatedRunId && (
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Related Test Run
                                    </h3>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                        {ticket.relatedRunId}
                                    </span>
                                </div>
                            )}

                            {/* Tags */}
                            {ticket.tags.length > 0 && (
                                <div>
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

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <Trash2 size={14} />
                                    Delete Ticket
                                </button>
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                                >
                                    <Edit3 size={14} />
                                    Edit
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
