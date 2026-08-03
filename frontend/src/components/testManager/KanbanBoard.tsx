import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    KeyboardSensor,
    pointerWithin,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Ticket, TicketStatus } from '../../types/testManager';
import KanbanColumn from './KanbanColumn';
import { KanbanCardContent } from './KanbanCard';

interface KanbanBoardProps {
    tickets: Ticket[];
    onOpenTicket: (ticket: Ticket) => void;
    onStatusChange: (ticketId: string, status: TicketStatus) => Promise<void>;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
}

const KANBAN_STATUSES = Object.values(TicketStatus);

const buildColumnOrder = (tickets: Ticket[]): Record<TicketStatus, string[]> => {
    const order = {} as Record<TicketStatus, string[]>;
    KANBAN_STATUSES.forEach((status) => {
        order[status] = [];
    });
    tickets.forEach((t) => {
        if (order[t.status]) order[t.status].push(t.id);
    });
    return order;
};

// The column that currently contains a card id, or null if the id is not
// present anywhere. Used instead of the (frozen at drag-start) active data so
// the drag handlers always operate on the true current placement.
const findColumnOf = (order: Record<TicketStatus, string[]>, cardId: string): TicketStatus | null => {
    for (const status of KANBAN_STATUSES) {
        if (order[status].includes(cardId)) return status;
    }
    return null;
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({
    tickets,
    onOpenTicket,
    onStatusChange,
    onLoadMore,
    hasMore,
    isLoadingMore,
}) => {
    // Visual-only ordering per column; re-synced whenever the underlying data changes
    const [columnOrder, setColumnOrder] = useState<Record<TicketStatus, string[]>>(() => buildColumnOrder(tickets));
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

    // Latest columnOrder mirror so drag event handlers can resolve placements
    // outside of a setState updater (e.g. dragEnd).
    const columnOrderRef = useRef(columnOrder);
    columnOrderRef.current = columnOrder;

    const isDragActiveRef = useRef(false);
    // Last column hovered during the active drag (for drop resolution when the
    // drop lands on the active card itself)
    const hoveredStatusRef = useRef<TicketStatus | null>(null);

    // Merge-based re-sync: keep existing ids (including pinned-to-top placement)
    // and append new ids (load-more, realtime). Never runs mid-drag so an
    // optimistic status update cannot clobber the order during a drag.
    useEffect(() => {
        if (isDragActiveRef.current) return;
        setColumnOrder((prev) => {
            const next = {} as Record<TicketStatus, string[]>;
            KANBAN_STATUSES.forEach((status) => {
                const live = new Set(tickets.filter((t) => t.status === status).map((t) => t.id));
                const merged = prev[status].filter((id) => live.has(id));
                tickets.forEach((t) => {
                    if (t.status === status && !merged.includes(t.id)) merged.push(t.id);
                });
                next[status] = merged;
            });
            return next;
        });
    }, [tickets]);

    const ticketsById = useMemo(() => {
        const map = new Map<string, Ticket>();
        tickets.forEach((t) => map.set(t.id, t));
        return map;
    }, [tickets]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const isDragging = activeTicket !== null;

    // Pins a card to the top of a column, removing it from every other column
    // so an id can never exist in two columns at once.
    const pinCardToTop = useCallback((status: TicketStatus, cardId: string) => {
        setColumnOrder((prev) => {
            if (prev[status][0] === cardId && !KANBAN_STATUSES.some((s) => s !== status && prev[s].includes(cardId))) {
                return prev;
            }
            const next = {} as Record<TicketStatus, string[]>;
            KANBAN_STATUSES.forEach((s) => {
                next[s] =
                    s === status
                        ? [cardId, ...prev[s].filter((id) => id !== cardId)]
                        : prev[s].filter((id) => id !== cardId);
            });
            return next;
        });
    }, []);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const ticket = ticketsById.get(event.active.id as string);
        if (!ticket) return;
        isDragActiveRef.current = true;
        hoveredStatusRef.current = ticket.status;
        setActiveTicket(ticket);
        pinCardToTop(ticket.status, ticket.id);
    }, [ticketsById, pinCardToTop]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        if (over.id === activeId) return; // hovering the card's own pinned slot

        setColumnOrder((prev) => {
            // Resolve the hovered column from the actual current placement of
            // the over node (never from its data, which is frozen at drag start).
            const overStatus =
                over.data.current?.type === 'column'
                    ? (over.id as TicketStatus)
                    : findColumnOf(prev, over.id as string);
            if (!overStatus) return prev;
            hoveredStatusRef.current = overStatus;

            const fromStatus = findColumnOf(prev, activeId);
            if (!fromStatus) return prev;
            // Remove from wherever the card currently lives, then pin it to the
            // TOP of the hovered column. Hovering the same column simply pins
            // it to the top (visual-only reorder).
            const from = prev[fromStatus].filter((id) => id !== activeId);
            const to = prev[overStatus].filter((id) => id !== activeId);
            to.unshift(activeId);
            return { ...prev, [fromStatus]: from, [overStatus]: to };
        });
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        isDragActiveRef.current = false;
        setActiveTicket(null);

        const activeId = active.id as string;
        const ticket = ticketsById.get(activeId);
        const lastHovered = hoveredStatusRef.current;
        hoveredStatusRef.current = null;
        if (!ticket) return;

        // If the drop lands on the active card itself (e.g. on its pinned slot),
        // resolve the target from the last column hovered during the drag.
        // Never read over.data.status: it is frozen at drag-start and can be
        // stale; resolve from where the node actually sits in columnOrder.
        let overStatus: TicketStatus | undefined;
        if (over && over.id !== activeId) {
            if (over.data.current?.type === 'column') {
                overStatus = over.id as TicketStatus;
            } else {
                const column = findColumnOf(columnOrderRef.current, over.id as string);
                overStatus = column ?? undefined;
            }
        }
        const targetStatus = overStatus ?? lastHovered;
        if (!targetStatus) return;

        // Only persist status changes (same-column reorders are visual-only)
        if (targetStatus !== ticket.status) {
            void onStatusChange(activeId, targetStatus);
        }
    }, [onStatusChange, ticketsById]);

    const handleDragCancel = useCallback(() => {
        isDragActiveRef.current = false;
        setActiveTicket(null);
        hoveredStatusRef.current = null;
        // Restore the original order (a cancelled drag should change nothing)
        setColumnOrder(buildColumnOrder(tickets));
    }, [tickets]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="flex h-full gap-4 px-5 py-4 overflow-x-auto overflow-y-hidden custom-scrollbar">
                {KANBAN_STATUSES.map((status) => (
                    <SortableContext
                        key={status}
                        items={columnOrder[status]}
                        strategy={verticalListSortingStrategy}
                    >
                        <KanbanColumn
                            status={status}
                            ticketIds={columnOrder[status]}
                            ticketsById={ticketsById}
                            isDragging={isDragging}
                            onOpenTicket={onOpenTicket}
                            onLoadMore={onLoadMore}
                            hasMore={hasMore}
                            isLoadingMore={isLoadingMore}
                        />
                    </SortableContext>
                ))}
            </div>

            {/* The preview clone follows the cursor; the drop placement is pinned to the top of the hovered column.
                dropAnimation is disabled so the clone unmounts instantly on drop — otherwise it lingers
                (fixed-position, no pointer-events: none) over the card and blocks the next drag.
                Rendered in a portal to document.body: ancestor containing blocks (e.g. .mac-card's
                backdrop-filter / contain) would otherwise break the fixed positioning and misplace
                the preview relative to the cursor. */}
            {createPortal(
                <DragOverlay dropAnimation={null}>
                    {activeTicket ? (
                        <div data-testid="kanban-overlay" className="cursor-grabbing">
                            <KanbanCardContent ticket={activeTicket} dragging onOpen={() => {}} />
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
};

export default KanbanBoard;
