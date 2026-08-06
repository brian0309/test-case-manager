import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { Ticket, TicketPriority } from '../../types/testManager';
import { getTagColor } from '../../utils/tagColors';
import {
    getTicketPriorityColor,
    getTicketSeverityColor,
    getFailureTypeColor,
} from '../../utils/ticketColors';

const CARD_HEIGHT_ESTIMATE = 96;

const getPriorityBarColor = (priority: TicketPriority): string => {
    switch (priority) {
        case TicketPriority.Critical: return 'bg-red-500';
        case TicketPriority.High: return 'bg-orange-500';
        case TicketPriority.Medium: return 'bg-yellow-500';
        case TicketPriority.Low: return 'bg-blue-500';
        default: return 'bg-gray-400';
    }
};

export interface KanbanCardProps {
    ticket: Ticket;
    dragging?: boolean;
    onOpen: (ticket: Ticket) => void;
}

// Pure presentation - reused by the drag overlay
export const KanbanCardContent: React.FC<KanbanCardProps> = React.memo(({ ticket, dragging, onOpen }) => (
    <div
        onClick={() => !dragging && onOpen(ticket)}
        className={`group relative overflow-hidden rounded-xl border bg-white dark:bg-gray-800 shadow-sm transition-all cursor-pointer ${
            dragging
                ? 'border-blue-300 dark:border-blue-600 shadow-2xl ring-2 ring-blue-400/70 dark:ring-blue-500/70 scale-[1.02] rotate-1'
                : 'border-gray-200/80 dark:border-gray-700 hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md active:scale-[0.98]'
        }`}
    >
        {/* Priority color bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityBarColor(ticket.priority)}`} />

        <div className="p-3 pl-4">
            {/* Title */}
            <h4 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-2 pr-1">
                {ticket.title}
            </h4>

            {/* Badges */}
            <div className="flex items-center flex-wrap gap-1 mb-1.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getTicketPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getTicketSeverityColor(ticket.severity)}`}>
                    {ticket.severity}
                </span>
                {ticket.failureType && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getFailureTypeColor(ticket.failureType)}`}>
                        {ticket.failureType}
                    </span>
                )}
                {ticket.firstReproducedAt && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        Repro
                    </span>
                )}
                {(ticket.returnedCount ?? 0) > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        Returned ×{ticket.returnedCount}
                    </span>
                )}
            </div>

            {/* Tags */}
            {ticket.tags.length > 0 && (
                <div className="flex items-center flex-wrap gap-1 mb-2">
                    {ticket.tags.slice(0, 2).map((tag) => (
                        <span
                            key={tag}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getTagColor(tag)}`}
                        >
                            {tag}
                        </span>
                    ))}
                    {ticket.tags.length > 2 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">+{ticket.tags.length - 2}</span>
                    )}
                </div>
            )}

            {/* Footer: Assignee & date */}
            <div className="flex items-center justify-between gap-2 mt-0.5">
                {ticket.assignedTo ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                        <img
                            src={ticket.assignedTo.avatar}
                            alt={ticket.assignedTo.name}
                            className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-700 flex-shrink-0"
                        />
                        <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium truncate">
                            {ticket.assignedTo.name}
                        </span>
                    </div>
                ) : (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">Unassigned</span>
                )}
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-tight flex-shrink-0">
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
            </div>
        </div>
    </div>
));

export const CARD_HEIGHT = CARD_HEIGHT_ESTIMATE;

interface SortableKanbanCardProps extends KanbanCardProps {
    dragging?: boolean;
}

const SortableKanbanCard: React.FC<SortableKanbanCardProps> = ({ ticket, onOpen }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        isDragging,
    } = useSortable({
        id: ticket.id,
        data: { type: 'ticket', status: ticket.status },
    });

    const style: React.CSSProperties = {
        // Intentionally no sortable shift transform: dragged cards are always
        // pinned to the TOP of the column, so the list preview must never
        // follow the pointer. The in-list card is hidden while dragging and
        // the floating preview (DragOverlay) represents it.
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 1000 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
        >
            <KanbanCardContent ticket={ticket} dragging={isDragging} onOpen={onOpen} />
        </div>
    );
};

KanbanCardContent.displayName = 'KanbanCardContent';
SortableKanbanCard.displayName = 'SortableKanbanCard';

export default SortableKanbanCard;
