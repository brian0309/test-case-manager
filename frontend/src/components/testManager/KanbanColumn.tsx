import React, { useCallback, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Inbox, ArrowDownToLine } from 'lucide-react';
import { Ticket, TicketStatus } from '../../types/testManager';
import SortableKanbanCard from './KanbanCard';

const getStatusDotColor = (status: TicketStatus): string => {
    switch (status) {
        case TicketStatus.Open: return 'bg-blue-500';
        case TicketStatus.InProgress: return 'bg-yellow-500';
        case TicketStatus.Resolved: return 'bg-green-500';
        case TicketStatus.Closed: return 'bg-gray-400';
        case TicketStatus.Reopened: return 'bg-purple-500';
        default: return 'bg-gray-400';
    }
};

interface KanbanColumnProps {
    status: TicketStatus;
    ticketIds: string[];
    ticketsById: Map<string, Ticket>;
    isDragging: boolean;
    onOpenTicket: (ticket: Ticket) => void;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = React.memo(({
    status,
    ticketIds,
    ticketsById,
    isDragging,
    onOpenTicket,
    onLoadMore,
    hasMore,
    isLoadingMore,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const { setNodeRef, isOver } = useDroppable({
        id: status,
        data: { type: 'column', status },
    });

    const getItemKey = useCallback((index: number) => ticketIds[index], [ticketIds]);
    const ROW_ESTIMATE_HEIGHT = 160;

    const virtualizer = useVirtualizer({
        count: ticketIds.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_ESTIMATE_HEIGHT,
        getItemKey,
        overscan: 6,
    });

    // Load-more sentinel when scrolled near the bottom of this column
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) onLoadMore();
            },
            { root: scrollRef.current, rootMargin: '200px 0px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, onLoadMore, ticketIds.length]);

    const cards = ticketIds
        .map((id) => ticketsById.get(id))
        .filter((t): t is Ticket => Boolean(t));

    const isEmpty = cards.length === 0;
    const isDropTarget = isOver && isDragging;

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col h-full w-[78vw] md:w-[300px] shrink-0 rounded-xl border bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-150 ${
                isDropTarget
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-900/15 ring-2 ring-blue-400/30 dark:ring-blue-500/30 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700'
            }`}
        >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200/70 dark:border-gray-700/70 flex-shrink-0 rounded-t-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                <span className={`h-2 w-2 rounded-full ${getStatusDotColor(status)} shadow-sm ring-4 ring-white/40 dark:ring-gray-800/60 flex-shrink-0 ${isDropTarget ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide truncate">
                    {status}
                </span>
                <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-semibold tabular-nums ml-auto flex-shrink-0 transition-colors ${
                    isDropTarget
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300'
                }`}>
                    {cards.length}
                </span>
            </div>

            {/* Virtualized card list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative min-h-0">
                {/* Drop-at-top indicator: dragged cards always land at the top of the column */}
                {isDropTarget && (
                    <div className="absolute top-0 left-1.5 right-1.5 h-1 rounded-full bg-blue-400 dark:bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)] z-10 pointer-events-none" />
                )}

                {isEmpty ? (
                    <div className={`flex flex-col items-center justify-center gap-1.5 h-28 mx-2 mt-2 rounded-lg border-2 border-dashed transition-colors ${
                        isDropTarget
                            ? 'border-blue-400 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                    }`}>
                        {isDropTarget ? (
                            <>
                                <ArrowDownToLine size={18} />
                                <span className="text-xs font-medium">Drop here</span>
                            </>
                        ) : (
                            <>
                                <Inbox size={18} />
                                <span className="text-xs font-medium">No tickets</span>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="pt-1" style={{ height: virtualizer.getTotalSize() + 4, position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                            const ticket = cards[virtualRow.index];
                            if (!ticket) return null;
                            return (
                                <div
                                    key={ticket.id}
                                    data-index={virtualRow.index}
                                    ref={virtualizer.measureElement}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualRow.start}px)`,
                                        padding: '0 8px 8px',
                                    }}
                                >
                                    <SortableKanbanCard ticket={ticket} onOpen={onOpenTicket} />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Load-more sentinel */}
                {hasMore && (
                    <div ref={sentinelRef} className="h-6 flex items-center justify-center">
                        {isLoadingMore && (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-transparent animate-spin" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
