import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanBoard from '../components/testManager/KanbanBoard';
import {
    Ticket,
    TicketStatus,
    TicketPriority,
    TicketSeverity,
} from '../types/testManager';

// Capture drag handlers so tests can drive them directly (jsdom cannot do real dnd)
const dndKitMocks = vi.hoisted(() => ({
    dragStartRef: { current: null as ((event: unknown) => void) | null },
    dragOverRef: { current: null as ((event: unknown) => void) | null },
    dragEndRef: { current: null as ((event: unknown) => void) | null },
}));

vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: ({ count }: { count: number }) => ({
        getVirtualItems: () => Array.from({ length: count }, (_, index) => ({
            index,
            start: index * 104,
            end: (index + 1) * 104,
            key: index,
        })),
        getTotalSize: () => count * 104,
        measure: vi.fn(),
        measureElement: vi.fn(),
        scrollToIndex: vi.fn(),
    }),
}));

vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children, onDragStart, onDragOver, onDragEnd }: {
        children: React.ReactNode;
        onDragStart: (event: unknown) => void;
        onDragOver: (event: unknown) => void;
        onDragEnd: (event: unknown) => void;
    }) => {
        dndKitMocks.dragStartRef.current = onDragStart;
        dndKitMocks.dragOverRef.current = onDragOver;
        dndKitMocks.dragEndRef.current = onDragEnd;
        return <>{children}</>;
    },
    closestCorners: () => 'closestCorners',
    pointerWithin: () => 'pointerWithin',
    KeyboardSensor: vi.fn(),
    PointerSensor: vi.fn(),
    useSensor: vi.fn(),
    useSensors: () => [],
    useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
    DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@dnd-kit/sortable', () => ({
    arrayMove: (arr: string[], from: number, to: number) => {
        const next = [...arr];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
    },
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    sortableKeyboardCoordinates: vi.fn(),
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
        isDragging: false,
    }),
    verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
    CSS: { Transform: { toString: () => '' } },
}));

// ----- Helpers -----

function buildTicket(overrides: Partial<Ticket> & { id: string; title: string }): Ticket {
    return {
        projectId: 'proj-1',
        status: TicketStatus.Open,
        priority: TicketPriority.Medium,
        severity: TicketSeverity.Minor,
        createdBy: { id: 'tester-1', name: 'Tester A', avatar: 'https://example.com/a.png' },
        attachments: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}

function makeDragEvent(activeId: string, activeStatus: string, overId: string, overType: 'ticket' | 'column', overStatus: string) {
    return {
        active: { id: activeId, data: { current: { type: 'ticket', status: activeStatus } } },
        over: { id: overId, data: { current: { type: overType, status: overStatus } } },
    };
}

let observerCallbacks: IntersectionObserverCallback[] = [];

// ----- Tests -----

describe('KanbanBoard', () => {
    const noop = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        observerCallbacks = [];
        vi.stubGlobal('IntersectionObserver', class {
            constructor(callback: IntersectionObserverCallback) {
                observerCallbacks.push(callback);
            }
            observe() {}
            unobserve() {}
            disconnect() {}
            takeRecords() { return []; }
            root = null;
            rootMargin = '';
            thresholds = [];
        });
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    const renderBoard = (tickets: Ticket[], props: Partial<Parameters<typeof KanbanBoard>[0]> = {}) =>
        render(
            <KanbanBoard
                tickets={tickets}
                onOpenTicket={noop}
                onStatusChange={vi.fn().mockResolvedValue(undefined)}
                onLoadMore={noop}
                hasMore={false}
                isLoadingMore={false}
                {...props}
            />
        );

    it('renders all five status columns with ticket counts', () => {
        const tickets = [
            buildTicket({ id: 't-1', title: 'Alpha Bug', status: TicketStatus.Open }),
            buildTicket({ id: 't-2', title: 'Beta Bug', status: TicketStatus.Open }),
            buildTicket({ id: 't-3', title: 'Gamma Bug', status: TicketStatus.InProgress }),
        ];
        renderBoard(tickets);

        Object.values(TicketStatus).forEach((status) => {
            expect(screen.getByText(status)).toBeInTheDocument();
        });
        expect(screen.getByText('Alpha Bug')).toBeInTheDocument();
        expect(screen.getByText('Beta Bug')).toBeInTheDocument();
        expect(screen.getByText('Gamma Bug')).toBeInTheDocument();
    });

    it('opens a ticket when a card is clicked', async () => {
        const onOpenTicket = vi.fn();
        const tickets = [
            buildTicket({ id: 't-1', title: 'Clickable Bug', status: TicketStatus.Open }),
        ];
        renderBoard(tickets, { onOpenTicket });

        await userEvent.click(screen.getByText('Clickable Bug'));
        expect(onOpenTicket).toHaveBeenCalledTimes(1);
        expect(onOpenTicket).toHaveBeenCalledWith(expect.objectContaining({ id: 't-1' }));
    });

    it('persists a status change when a card is dragged to another column', async () => {
        const onStatusChange = vi.fn().mockResolvedValue(undefined);
        const tickets = [
            buildTicket({ id: 't-1', title: 'Move Me', status: TicketStatus.Open }),
        ];
        renderBoard(tickets, { onStatusChange });

        const dragOver = dndKitMocks.dragOverRef.current!;
        const dragEnd = dndKitMocks.dragEndRef.current!;

        act(() => {
            dragOver(makeDragEvent('t-1', TicketStatus.Open, TicketStatus.InProgress, 'column', TicketStatus.InProgress));
        });
        act(() => {
            dragEnd(makeDragEvent('t-1', TicketStatus.Open, TicketStatus.InProgress, 'column', TicketStatus.InProgress));
        });

        expect(onStatusChange).toHaveBeenCalledTimes(1);
        expect(onStatusChange).toHaveBeenCalledWith('t-1', TicketStatus.InProgress);
    });

    it('does not persist same-column reorders (visual only)', async () => {
        const onStatusChange = vi.fn().mockResolvedValue(undefined);
        const tickets = [
            buildTicket({ id: 't-1', title: 'First', status: TicketStatus.Open }),
            buildTicket({ id: 't-2', title: 'Second', status: TicketStatus.Open }),
        ];
        renderBoard(tickets, { onStatusChange });

        const dragOver = dndKitMocks.dragOverRef.current!;
        const dragEnd = dndKitMocks.dragEndRef.current!;

        // Reorder t-1 to be after t-2 within the Open column
        act(() => {
            dragOver(makeDragEvent('t-1', TicketStatus.Open, 't-2', 'ticket', TicketStatus.Open));
        });
        act(() => {
            dragEnd(makeDragEvent('t-1', TicketStatus.Open, 't-2', 'ticket', TicketStatus.Open));
        });

        expect(onStatusChange).not.toHaveBeenCalled();
    });

    it('pins the dragged card to the TOP of the target column during drag-over', () => {
        const tickets = [
            buildTicket({ id: 't-1', title: 'First', status: TicketStatus.Open }),
            buildTicket({ id: 't-2', title: 'Second', status: TicketStatus.Open }),
        ];
        const { container } = renderBoard(tickets);

        // Exclude the floating preview clone (it duplicates the dragged card's title)
        const cardTitles = () =>
            Array.from(container.querySelectorAll('h4'))
                .filter((h) => !h.closest('[data-testid="kanban-overlay"]'))
                .map((h) => h.textContent);

        // Initial order: First, Second
        expect(cardTitles()).toEqual(['First', 'Second']);

        const dragOver = dndKitMocks.dragOverRef.current!;
        act(() => {
            // Drag "Second" but hover over the column itself (any position)
            dragOver(makeDragEvent('t-2', TicketStatus.Open, TicketStatus.Open, 'column', TicketStatus.Open));
        });

        // Regardless of hover position, the dragged card goes to the top
        expect(cardTitles()).toEqual(['Second', 'First']);
    });

    it('pins the dragged card to the top of its column immediately on drag start', () => {
        const tickets = [
            buildTicket({ id: 't-1', title: 'First', status: TicketStatus.Open }),
            buildTicket({ id: 't-2', title: 'Second', status: TicketStatus.Open }),
        ];
        const { container } = renderBoard(tickets);

        const cardTitles = () =>
            Array.from(container.querySelectorAll('h4'))
                .filter((h) => !h.closest('[data-testid="kanban-overlay"]'))
                .map((h) => h.textContent);

        expect(cardTitles()).toEqual(['First', 'Second']);

        const dragStart = dndKitMocks.dragStartRef.current!;
        act(() => {
            dragStart({ active: { id: 't-2', data: { current: { type: 'ticket', status: TicketStatus.Open } } } });
        });

        // The dragged card jumps to the top as soon as the drag begins
        expect(cardTitles()).toEqual(['Second', 'First']);
    });

    it('pins the dragged card to the top when moving between columns', () => {
        const tickets = [
            buildTicket({ id: 't-1', title: 'First', status: TicketStatus.Open }),
            buildTicket({ id: 't-2', title: 'Second', status: TicketStatus.InProgress }),
        ];
        const { container } = renderBoard(tickets);

        const cardTitles = () =>
            Array.from(container.querySelectorAll('h4')).map((h) => h.textContent);

        const dragOver = dndKitMocks.dragOverRef.current!;
        act(() => {
            dragOver(makeDragEvent('t-2', TicketStatus.InProgress, TicketStatus.Open, 'column', TicketStatus.Open));
        });

        // "Second" lands above "First" (top of the Open column)
        expect(cardTitles()).toEqual(['Second', 'First']);
    });

    it('never duplicates the card id when drag-over alternates between columns', () => {
        const tickets = [
            buildTicket({ id: 't-1', title: 'First', status: TicketStatus.Open }),
            buildTicket({ id: 't-2', title: 'Second', status: TicketStatus.InProgress }),
        ];
        const { container } = renderBoard(tickets);

        const cardTitles = () =>
            Array.from(container.querySelectorAll('h4'))
                .filter((h) => !h.closest('[data-testid="kanban-overlay"]'))
                .map((h) => h.textContent);

        const dragOver = dndKitMocks.dragOverRef.current!;

        // Drag "Second" (In Progress) over the Open column
        act(() => {
            dragOver(makeDragEvent('t-2', TicketStatus.InProgress, TicketStatus.Open, 'column', TicketStatus.Open));
        });
        // Pointer crosses back to the source column: the card's active data is
        // still "In Progress" (frozen at drag start) but it currently lives in
        // Open — it must be moved back, not duplicated.
        act(() => {
            dragOver(makeDragEvent('t-2', TicketStatus.InProgress, TicketStatus.InProgress, 'column', TicketStatus.InProgress));
        });
        // Cross over again
        act(() => {
            dragOver(makeDragEvent('t-2', TicketStatus.InProgress, TicketStatus.Open, 'column', TicketStatus.Open));
        });

        // Exactly one copy of each card across the whole board
        expect(cardTitles().filter((t) => t === 'First').length).toBe(1);
        expect(cardTitles().filter((t) => t === 'Second').length).toBe(1);
    });

    it('persists a status change when dropped on the active card itself after hovering another column', () => {
        const onStatusChange = vi.fn().mockResolvedValue(undefined);
        const tickets = [
            buildTicket({ id: 't-1', title: 'First', status: TicketStatus.Open }),
            buildTicket({ id: 't-2', title: 'Second', status: TicketStatus.InProgress }),
        ];
        renderBoard(tickets, { onStatusChange });

        const dragOver = dndKitMocks.dragOverRef.current!;
        const dragEnd = dndKitMocks.dragEndRef.current!;

        // Hover over the Open column, then drop on the active card itself
        act(() => {
            dragOver(makeDragEvent('t-2', TicketStatus.InProgress, TicketStatus.Open, 'column', TicketStatus.Open));
        });
        act(() => {
            dragEnd(makeDragEvent('t-2', TicketStatus.InProgress, 't-2', 'ticket', TicketStatus.InProgress));
        });

        // The stale data on the card itself must not cancel the drop
        expect(onStatusChange).toHaveBeenCalledTimes(1);
        expect(onStatusChange).toHaveBeenCalledWith('t-2', TicketStatus.Open);
    });

    it('preserves the pinned-to-top order when tickets update (merge re-sync)', () => {
        const tickets = [
            buildTicket({ id: 't-1', title: 'First', status: TicketStatus.Open }),
            buildTicket({ id: 't-2', title: 'Second', status: TicketStatus.Open }),
        ];
        const { container, rerender } = renderBoard(tickets);

        const cardTitles = () =>
            Array.from(container.querySelectorAll('h4'))
                .filter((h) => !h.closest('[data-testid="kanban-overlay"]'))
                .map((h) => h.textContent);

        // Pin "Second" to the top of the Open column
        const dragOver = dndKitMocks.dragOverRef.current!;
        act(() => {
            dragOver(makeDragEvent('t-2', TicketStatus.Open, TicketStatus.Open, 'column', TicketStatus.Open));
        });
        expect(cardTitles()).toEqual(['Second', 'First']);

        // Simulated optimistic update: t-1 moved to InProgress, t-3 loaded via load-more
        rerender(
            <KanbanBoard
                tickets={[
                    buildTicket({ id: 't-2', title: 'Second', status: TicketStatus.Open }),
                    buildTicket({ id: 't-3', title: 'Third', status: TicketStatus.Open }),
                    buildTicket({ id: 't-1', title: 'First', status: TicketStatus.InProgress }),
                ]}
                onOpenTicket={noop}
                onStatusChange={vi.fn().mockResolvedValue(undefined)}
                onLoadMore={noop}
                hasMore={false}
                isLoadingMore={false}
            />
        );

        // Pinned top order kept in Open, new ticket appended, t-1 moved to InProgress
        expect(cardTitles()).toEqual(['Second', 'Third', 'First']);
    });

    it('fires load-more when a column sentinel becomes visible', () => {
        const onLoadMore = vi.fn();
        const tickets = [
            buildTicket({ id: 't-1', title: 'Load More Bug', status: TicketStatus.Open }),
        ];
        renderBoard(tickets, { onLoadMore, hasMore: true });

        expect(onLoadMore).not.toHaveBeenCalled();
        observerCallbacks.forEach((callback) => {
            callback(
                [{ isIntersecting: true } as IntersectionObserverEntry],
                {} as IntersectionObserver
            );
        });
        expect(onLoadMore).toHaveBeenCalled();
    });

    it('shows an empty state inside empty columns', () => {
        const tickets = [
            buildTicket({ id: 't-1', title: 'Only Open Bug', status: TicketStatus.Open }),
        ];
        renderBoard(tickets);

        // 4 of the 5 columns have no tickets
        expect(screen.getAllByText('No tickets').length).toBe(4);
    });
});
