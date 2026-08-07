import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { shallow } from 'zustand/shallow';
import toast from 'react-hot-toast';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTestManagerStore, mapTicketResponse } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import TicketModal from '../../components/testManager/TicketModal';
import TicketFiltersSheet from '../../components/testManager/TicketFiltersSheet';
import TicketDetailView from './components/TicketDetailView';
import KanbanBoard from '../../components/testManager/KanbanBoard';
import {
    Ticket,
    TicketStatus,
    TicketPriority,
    TicketSeverity,
    FailureType,
} from '../../types/testManager';
import {
    Bug,
    Loader2,
    ChevronRight,
    X,
    Check,
    ChevronDown,
    Filter,
    LayoutList,
    SquareKanban,
} from 'lucide-react';
import { CreateTicketRequest, UpdateTicketRequest, TicketListResponse } from '../../types/api/testManager.api';
import { ticketApi } from '../../services/ticketApi';
import { testRunApi } from '../../services/testRunApi';
import { useRealtimeTickets } from '../../hooks/useRealtimeTickets';
import { getTagColor } from '../../utils/tagColors';
import {
    getTicketStatusColor,
    getTicketPriorityColor,
    getTicketSeverityColor,
    getFailureTypeColor,
} from '../../utils/ticketColors';

const TICKETS_PAGE_SIZE = 30;

const getTicketPriorityBarColor = (priority: TicketPriority): string => {
    switch (priority) {
        case TicketPriority.Critical: return 'bg-red-500';
        case TicketPriority.High: return 'bg-orange-500';
        case TicketPriority.Medium: return 'bg-yellow-500';
        case TicketPriority.Low: return 'bg-blue-500';
        default: return 'bg-gray-400';
    }
};

const TicketsPage: React.FC = () => {
    const {
        activeProject,
        tickets,
        isLoading,
        createTicket,
        updateTicket,
        deleteTicket,
        setActiveTicket,
        activeTicket,
        setTicketDetailViewOpen,
        setActiveProject,
        projects,
        ticketsTotal,
        setTicketsTotal,
        ticketView,
        setTicketView,
        updateTicketStatus,
    } = useTestManagerStore(
        (state) => ({
            activeProject: state.activeProject,
            tickets: state.tickets,
            isLoading: state.isLoading,
            createTicket: state.createTicket,
            updateTicket: state.updateTicket,
            deleteTicket: state.deleteTicket,
            setActiveTicket: state.setActiveTicket,
            activeTicket: state.activeTicket,
            setTicketDetailViewOpen: state.setTicketDetailViewOpen,
            setActiveProject: state.setActiveProject,
            projects: state.projects,
            ticketsTotal: state.ticketsTotal,
            setTicketsTotal: state.setTicketsTotal,
            ticketView: state.ticketView,
            setTicketView: state.setTicketView,
            updateTicketStatus: state.updateTicketStatus,
        }),
        shallow
    );

    // Live collaboration: sync ticket changes across users in real time
    useRealtimeTickets({ projectId: activeProject });

    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const processedTicketIdRef = useRef<string | null>(null);
    const [testRunOptions, setTestRunOptions] = useState<{ id: string; title: string }[]>([]);

    // Quick filter state
    const [selectedStatusFilters, setSelectedStatusFilters] = useState<TicketStatus[]>([]);
    const [selectedPriorityFilters, setSelectedPriorityFilters] = useState<TicketPriority[]>([]);
    const [selectedSeverityFilters, setSelectedSeverityFilters] = useState<TicketSeverity[]>([]);
    const [selectedFailureTypeFilter, setSelectedFailureTypeFilter] = useState<FailureType | null>(null);
    const [selectedTeamFilter, setSelectedTeamFilter] = useState<string | null>(null);
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false);
    const [isSeverityFilterOpen, setIsSeverityFilterOpen] = useState(false);
    const [isFailureTypeFilterOpen, setIsFailureTypeFilterOpen] = useState(false);
    const [isTeamFilterOpen, setIsTeamFilterOpen] = useState(false);
    const [isMobileFilterSheetOpen, setIsMobileFilterSheetOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // Pagination state
    const [ticketsOffset, setTicketsOffset] = useState(0);
    const [ticketsHasMore, setTicketsHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const listContainerRef = useRef<HTMLDivElement>(null);
    const ticketsHasMoreRef = useRef(ticketsHasMore);
    const isLoadingMoreRef = useRef(isLoadingMore);
    const isLoadingRef = useRef(isLoading);
    const ticketsOffsetRef = useRef(ticketsOffset);
    ticketsHasMoreRef.current = ticketsHasMore;
    isLoadingMoreRef.current = isLoadingMore;
    isLoadingRef.current = isLoading;
    ticketsOffsetRef.current = ticketsOffset;

    const currentProject = projects.find((p) => p.id === activeProject);
    const projectMembers = currentProject?.members || [];

    // Compute all unique tags from all tickets for auto-suggestions
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        tickets.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
        return Array.from(tagSet).sort();
    }, [tickets]);

    // Client-side filtered tickets based on quick filters
    const filteredTickets = useMemo(() => {
        let result = tickets;
        if (selectedStatusFilters.length > 0) {
            result = result.filter((t) => selectedStatusFilters.includes(t.status));
        }
        if (selectedPriorityFilters.length > 0) {
            result = result.filter((t) => selectedPriorityFilters.includes(t.priority));
        }
        if (selectedSeverityFilters.length > 0) {
            result = result.filter((t) => selectedSeverityFilters.includes(t.severity));
        }
        if (selectedFailureTypeFilter) {
            result = result.filter((t) => t.failureType === selectedFailureTypeFilter);
        }
        if (selectedTeamFilter) {
            result = result.filter((t) => t.team === selectedTeamFilter);
        }
        return result;
    }, [tickets, selectedStatusFilters, selectedPriorityFilters, selectedSeverityFilters, selectedFailureTypeFilter, selectedTeamFilter]);

    // All unique teams for the team filter dropdown
    const allTeams = useMemo(() => {
        const teamSet = new Set<string>();
        tickets.forEach((t) => {
            if (t.team) teamSet.add(t.team);
        });
        return Array.from(teamSet).sort();
    }, [tickets]);

    // Virtualization setup
    const ROW_HEIGHT_ESTIMATE = 60;
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(600);

    // Dynamically size the virtual container to fill available space
    useEffect(() => {
        const el = tableScrollRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const h = entry.contentRect.height;
                if (h > 0) setContainerHeight(h);
            }
        });
        // Observe the parent so the scroll container can stretch to fill it
        if (el.parentElement) observer.observe(el.parentElement);
        return () => observer.disconnect();
    }, []);

    const rowVirtualizer = useVirtualizer({
        count: filteredTickets.length,
        getScrollElement: () => tableScrollRef.current,
        estimateSize: () => ROW_HEIGHT_ESTIMATE,
        overscan: 5,
    });

    // Trigger re-measurement when the dataset changes (e.g. real-time socket updates)
    const previousDataLength = useRef(filteredTickets.length);
    const measureRafId = useRef<number>(0);
    useEffect(() => {
        if (filteredTickets.length !== previousDataLength.current) {
            previousDataLength.current = filteredTickets.length;
            measureRafId.current = requestAnimationFrame(() => {
                rowVirtualizer.measure();
            });
        }
        return () => {
            if (measureRafId.current) {
                cancelAnimationFrame(measureRafId.current);
            }
        };
    }, [filteredTickets.length, rowVirtualizer]);

    const hasActiveFilters = selectedStatusFilters.length > 0 || selectedPriorityFilters.length > 0 || selectedSeverityFilters.length > 0 || !!selectedFailureTypeFilter || !!selectedTeamFilter;

    const handleApplyFilters = useCallback((
        status: TicketStatus[],
        priority: TicketPriority[],
        severity: TicketSeverity[],
        failureType: FailureType | null,
        team: string | null,
    ) => {
        setSelectedStatusFilters(status);
        setSelectedPriorityFilters(priority);
        setSelectedSeverityFilters(severity);
        setSelectedFailureTypeFilter(failureType);
        setSelectedTeamFilter(team);
    }, []);

    // Check for URL state to open create modal
    useEffect(() => {
        if (location.state && (location.state as { openNewTicket?: boolean }).openNewTicket) {
            setIsCreateModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Handle ticketId URL parameter for direct links
    useEffect(() => {
        const ticketId = searchParams.get('ticketId');

        if (!ticketId || processedTicketIdRef.current === ticketId) {
            return;
        }

        processedTicketIdRef.current = ticketId;

        const loadTicketFromUrl = async () => {
            try {
                const ticketResponse = await ticketApi.getTicketById(ticketId);
                const mappedTicket = mapTicketResponse(ticketResponse as TicketListResponse);

                if (ticketResponse.projectId) {
                    setActiveProject(ticketResponse.projectId);
                }

                setActiveTicket(mappedTicket);
                setTicketDetailViewOpen(true);

                setSearchParams({}, { replace: true });
            } catch (error) {
                console.error('Failed to load ticket from URL:', error);
                toast.error('Failed to load ticket. It may not exist or you may not have access.');
                setSearchParams({}, { replace: true });
            }
        };

        loadTicketFromUrl();
    }, [searchParams, setSearchParams, setActiveProject, setActiveTicket, setTicketDetailViewOpen]);

    // Handle failureType/team URL parameters for deep links from analytics
    useEffect(() => {
        const failureTypeParam = searchParams.get('failureType');
        const teamParam = searchParams.get('team');

        const next = new URLSearchParams(searchParams);

        if (failureTypeParam && (Object.values(FailureType) as string[]).includes(failureTypeParam)) {
            setSelectedFailureTypeFilter(failureTypeParam as FailureType);
            next.delete('failureType');
        }

        if (teamParam) {
            setSelectedTeamFilter(teamParam);
            next.delete('team');
        }

        if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // Fetch tickets (paginated) when project changes
    const loadTickets = useCallback(async (reset = true, offsetValue = 0) => {
        if (!activeProject) return;
        if (reset) {
            useTestManagerStore.setState({ isLoading: true, error: null });
            try {
                const result = await ticketApi.getTicketsPaginated(activeProject, {
                    limit: TICKETS_PAGE_SIZE,
                    offset: 0,
                });
                useTestManagerStore.setState({
                    tickets: result.items.map(mapTicketResponse),
                    isLoading: false,
                });
                setTicketsTotal(result.meta.total);
                setTicketsOffset(result.items.length);
                setTicketsHasMore(result.meta.hasMore && result.items.length < result.meta.total);
            } catch (error: unknown) {
                useTestManagerStore.setState({
                    error: (error as Error).message,
                    isLoading: false,
                });
            }
        } else {
            setIsLoadingMore(true);
            try {
                const result = await ticketApi.getTicketsPaginated(activeProject, {
                    limit: TICKETS_PAGE_SIZE,
                    offset: offsetValue,
                });

                const currentTickets = useTestManagerStore.getState().tickets;
                const existingIds = new Set(currentTickets.map((t) => t.id));
                const incomingItems = result.items.filter((t) => !existingIds.has(t.id));
                if (incomingItems.length > 0) {
                    useTestManagerStore.setState((state) => ({
                        tickets: [...state.tickets, ...incomingItems.map(mapTicketResponse)],
                    }));
                }

                const totalLoaded = offsetValue + result.items.length;
                setTicketsOffset(totalLoaded);
                setTicketsTotal(result.meta.total);
                setTicketsHasMore(result.meta.hasMore && totalLoaded < result.meta.total);
            } catch (error: unknown) {
                toast.error((error as Error).message || 'Failed to load tickets');
            } finally {
                setIsLoadingMore(false);
            }
        }
    }, [activeProject, setTicketsTotal]);

    const loadTicketsRef = useRef(loadTickets);
    loadTicketsRef.current = loadTickets;

    // Fetch tickets and test runs when project changes
    useEffect(() => {
        if (activeProject) {
            loadTickets(true);
            // Fetch test runs for the create modal dropdown
            testRunApi.getTestRuns(activeProject)
                .then((runs) => setTestRunOptions(runs.map((r) => ({ id: r.id, title: r.title }))))
                .catch(() => {});
        }
    }, [activeProject, loadTickets]);

    // Stable ref-based load-more handler — avoids recreating the IntersectionObserver
    // on every pagination load, preventing disconnect/reconnect churn.
    const handleLoadMoreTickets = useCallback(() => {
        if (!ticketsHasMoreRef.current || isLoadingMoreRef.current || isLoadingRef.current) return;
        loadTicketsRef.current(false, ticketsOffsetRef.current);
    }, []);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (!ticketsHasMore || isLoading || isLoadingMore) {
            return;
        }

        const sentinel = loadMoreSentinelRef.current;
        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first?.isIntersecting) {
                    handleLoadMoreTickets();
                }
            },
            {
                root: listContainerRef.current,
                rootMargin: '200px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [ticketsHasMore, isLoading, isLoadingMore, handleLoadMoreTickets]);

    // Close filter dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsStatusFilterOpen(false);
                setIsPriorityFilterOpen(false);
                setIsSeverityFilterOpen(false);
                setIsFailureTypeFilterOpen(false);
                setIsTeamFilterOpen(false);
            }
        };

        if (isStatusFilterOpen || isPriorityFilterOpen || isSeverityFilterOpen || isFailureTypeFilterOpen || isTeamFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isStatusFilterOpen, isPriorityFilterOpen, isSeverityFilterOpen, isFailureTypeFilterOpen, isTeamFilterOpen]);

    const handleCreateTicket = useCallback(async (data: {
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
        if (!activeProject) return;
        const request: CreateTicketRequest = {
            title: data.title,
            description: data.description,
            priority: data.priority,
            severity: data.severity,
            failureType: data.failureType,
            team: data.team,
            assignedToId: data.assignedToId,
            relatedRunId: data.relatedRunId,
            tags: data.tags,
        };
        await createTicket(activeProject, request);
        toast.success('Ticket created successfully');
    }, [activeProject, createTicket]);

    const handleUpdateTicket = useCallback(async (data: {
        title?: string;
        description?: string;
        status?: TicketStatus;
        priority?: TicketPriority;
        severity?: TicketSeverity;
        failureType?: FailureType;
        team?: string;
        assignedToId?: string;
        relatedRunId?: string;
        tags?: string[];
    }) => {
        if (!activeProject || !activeTicket) return;
        const request: UpdateTicketRequest = {
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
        };
        await updateTicket(activeProject, activeTicket.id, request);
        toast.success('Ticket updated');
    }, [activeProject, activeTicket, updateTicket]);

    const handleDeleteTicket = useCallback(async () => {
        if (!activeProject || !activeTicket) return;
        await deleteTicket(activeProject, activeTicket.id);
        setActiveTicket(null);
        setTicketDetailViewOpen(false);
        toast.success('Ticket deleted');
    }, [activeProject, activeTicket, deleteTicket, setActiveTicket, setTicketDetailViewOpen]);

    const openTicketDetail = useCallback(async (ticket: Ticket) => {
        setActiveTicket(ticket);
        setTicketDetailViewOpen(true);
        try {
            const detailResponse = await ticketApi.getTicketById(ticket.id);
            const mappedTicket = mapTicketResponse(detailResponse as TicketListResponse);
            setActiveTicket(mappedTicket);
        } catch (error) {
            console.error('Failed to load ticket detail:', error);
        }
    }, [setActiveTicket, setTicketDetailViewOpen]);

    const handleStatusChange = useCallback(async (ticketId: string, status: TicketStatus) => {
        if (!activeProject) return;
        try {
            await updateTicketStatus(activeProject, ticketId, status);
            toast.success(`Ticket moved to ${status}`);
        } catch {
            toast.error('Failed to update ticket status');
        }
    }, [activeProject, updateTicketStatus]);

    const closeTicketDetail = useCallback(() => {
        setActiveTicket(null);
        setTicketDetailViewOpen(false);
    }, [setActiveTicket, setTicketDetailViewOpen]);

    // No project selected
    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view and manage tickets"
            />
        );
    }

    return (
        <div className="flex flex-col h-auto md:h-full bg-white dark:bg-gray-900">
            {/* Header area with quick filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 px-3 md:px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 md:sticky md:top-0 md:z-20">
                <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none">
                    <div className="flex items-center gap-2 min-w-0">
                        <Bug size={18} className="text-red-500 flex-shrink-0" />
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                            Tickets ({ticketsTotal || tickets.length})
                        </h2>
                    </div>

                    {/* Desktop filter dropdowns */}
                    <div ref={filterDropdownRef} className="hidden md:flex items-center gap-2">
                    {/* Status Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsStatusFilterOpen(!isStatusFilterOpen);
                                setIsPriorityFilterOpen(false);
                                setIsSeverityFilterOpen(false);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                                selectedStatusFilters.length > 0
                                    ? 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Filter size={13} />
                            Status
                            {selectedStatusFilters.length > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                                    {selectedStatusFilters.length}
                                </span>
                            )}
                            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isStatusFilterOpen && (
                            <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                                <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</p>
                                </div>
                                <div className="max-h-52 overflow-y-auto">
                                    {Object.values(TicketStatus).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() =>
                                                setSelectedStatusFilters((prev) =>
                                                    prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
                                                )
                                            }
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                                selectedStatusFilters.includes(status)
                                                    ? 'bg-blue-50 dark:bg-blue-900/30'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getTicketStatusColor(status)}`}>
                                                {status}
                                            </span>
                                            {selectedStatusFilters.includes(status) && (
                                                <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Priority Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsPriorityFilterOpen(!isPriorityFilterOpen);
                                setIsStatusFilterOpen(false);
                                setIsSeverityFilterOpen(false);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                                selectedPriorityFilters.length > 0
                                    ? 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Filter size={13} />
                            Priority
                            {selectedPriorityFilters.length > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                                    {selectedPriorityFilters.length}
                                </span>
                            )}
                            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isPriorityFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isPriorityFilterOpen && (
                            <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                                <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Priority</p>
                                </div>
                                <div className="max-h-52 overflow-y-auto">
                                    {Object.values(TicketPriority).map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={() =>
                                                setSelectedPriorityFilters((prev) =>
                                                    prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
                                                )
                                            }
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                                selectedPriorityFilters.includes(priority)
                                                    ? 'bg-blue-50 dark:bg-blue-900/30'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getTicketPriorityColor(priority)}`}>
                                                {priority}
                                            </span>
                                            {selectedPriorityFilters.includes(priority) && (
                                                <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Severity Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsSeverityFilterOpen(!isSeverityFilterOpen);
                                setIsStatusFilterOpen(false);
                                setIsPriorityFilterOpen(false);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                                selectedSeverityFilters.length > 0
                                    ? 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Filter size={13} />
                            Severity
                            {selectedSeverityFilters.length > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                                    {selectedSeverityFilters.length}
                                </span>
                            )}
                            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isSeverityFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isSeverityFilterOpen && (
                            <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                                <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Severity</p>
                                </div>
                                <div className="max-h-52 overflow-y-auto">
                                    {Object.values(TicketSeverity).map((severity) => (
                                        <button
                                            key={severity}
                                            onClick={() =>
                                                setSelectedSeverityFilters((prev) =>
                                                    prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
                                                )
                                            }
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                                selectedSeverityFilters.includes(severity)
                                                    ? 'bg-blue-50 dark:bg-blue-900/30'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getTicketSeverityColor(severity)}`}>
                                                {severity}
                                            </span>
                                            {selectedSeverityFilters.includes(severity) && (
                                                <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Failure Type Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsFailureTypeFilterOpen(!isFailureTypeFilterOpen);
                                setIsStatusFilterOpen(false);
                                setIsPriorityFilterOpen(false);
                                setIsSeverityFilterOpen(false);
                                setIsTeamFilterOpen(false);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                                selectedFailureTypeFilter
                                    ? 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Filter size={13} />
                            Type
                            {selectedFailureTypeFilter && (
                                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                                    {1}
                                </span>
                            )}
                            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isFailureTypeFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isFailureTypeFilterOpen && (
                            <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                                <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Failure Type</p>
                                </div>
                                <button
                                    onClick={() => setSelectedFailureTypeFilter(null)}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                        !selectedFailureTypeFilter ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span className="text-gray-500 dark:text-gray-400">All types</span>
                                    {!selectedFailureTypeFilter && <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />}
                                </button>
                                <div className="max-h-52 overflow-y-auto">
                                    {Object.values(FailureType).map((failureType) => (
                                        <button
                                            key={failureType}
                                            onClick={() => setSelectedFailureTypeFilter(failureType === selectedFailureTypeFilter ? null : failureType)}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                                selectedFailureTypeFilter === failureType
                                                    ? 'bg-blue-50 dark:bg-blue-900/30'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getFailureTypeColor(failureType)}`}>
                                                {failureType}
                                            </span>
                                            {selectedFailureTypeFilter === failureType && (
                                                <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Team Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsTeamFilterOpen(!isTeamFilterOpen);
                                setIsStatusFilterOpen(false);
                                setIsPriorityFilterOpen(false);
                                setIsSeverityFilterOpen(false);
                                setIsFailureTypeFilterOpen(false);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                                selectedTeamFilter
                                    ? 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Filter size={13} />
                            Team
                            {selectedTeamFilter && (
                                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                                    {1}
                                </span>
                            )}
                            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isTeamFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isTeamFilterOpen && (
                            <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                                <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Team</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTeamFilter(null)}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                        !selectedTeamFilter ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span className="text-gray-500 dark:text-gray-400">All teams</span>
                                    {!selectedTeamFilter && <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />}
                                </button>
                                <div className="max-h-52 overflow-y-auto">
                                    {allTeams.length === 0 && (
                                        <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No teams yet</p>
                                    )}
                                    {allTeams.map((team) => (
                                        <button
                                            key={team}
                                            onClick={() => setSelectedTeamFilter(team === selectedTeamFilter ? null : team)}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                                selectedTeamFilter === team ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <span className="text-gray-700 dark:text-gray-200">{team}</span>
                                            {selectedTeamFilter === team && (
                                                <Check size={12} className="ml-auto text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setSelectedStatusFilters([]);
                                setSelectedPriorityFilters([]);
                                setSelectedSeverityFilters([]);
                                setSelectedFailureTypeFilter(null);
                                setSelectedTeamFilter(null);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            title="Clear all filters"
                        >
                            <X size={13} />
                            Clear
                        </button>
                    )}
                    </div>
                </div>

                {/* View toggle: list / kanban */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button
                        onClick={() => setTicketView('list')}
                        className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
                            ticketView === 'list'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                        title="List view"
                        aria-label="Switch to list view"
                    >
                        <LayoutList size={14} />
                    </button>
                    <button
                        onClick={() => setTicketView('kanban')}
                        className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
                            ticketView === 'kanban'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                        title="Kanban board"
                        aria-label="Switch to kanban board"
                    >
                        <SquareKanban size={14} />
                    </button>
                </div>

                {/* Mobile Filters button */}
                <button
                    onClick={() => setIsMobileFilterSheetOpen(true)}
                    className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors flex-shrink-0 ${
                        hasActiveFilters
                            ? 'border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                    aria-label="Open ticket filters"
                >
                    <Filter size={13} />
                    Filters
                    {hasActiveFilters && (
                        <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                            {selectedStatusFilters.length + selectedPriorityFilters.length + selectedSeverityFilters.length + (selectedFailureTypeFilter ? 1 : 0) + (selectedTeamFilter ? 1 : 0)}
                        </span>
                    )}
                </button>
            </div>

            {/* Loading state */}
            {isLoading && tickets.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            )}

            {/* Empty state - no tickets at all */}
            {!isLoading && tickets.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <Bug size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">No tickets yet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4 max-w-sm">
                        Create your first ticket to track bugs, issues, or tasks for this project.
                    </p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Create Ticket
                    </button>
                </div>
            )}

            {/* Empty state - no tickets match filters */}
            {!isLoading && tickets.length > 0 && filteredTickets.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <Filter size={40} className="text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">No tickets match filters</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4 max-w-sm">
                        Try adjusting or clearing your filters to see all tickets.
                    </p>
                    <button
                        onClick={() => {
                            setSelectedStatusFilters([]);
                            setSelectedPriorityFilters([]);
                            setSelectedSeverityFilters([]);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <X size={16} />
                        Clear Filters
                    </button>
                </div>
            )}

            {/* Ticket list - Kanban board */}
            {filteredTickets.length > 0 && ticketView === 'kanban' && (
                <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <KanbanBoard
                            tickets={filteredTickets}
                            onOpenTicket={openTicketDetail}
                            onStatusChange={handleStatusChange}
                            onLoadMore={handleLoadMoreTickets}
                            hasMore={ticketsHasMore}
                            isLoadingMore={isLoadingMore}
                        />
                    </div>

                    {/* Status text */}
                    <div className="flex justify-end px-4 md:px-6 py-1.5">
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                            {hasActiveFilters ? (
                                <>Showing {filteredTickets.length} of {tickets.length} tickets</>
                            ) : (
                                <>Loaded {Math.min(ticketsOffset, tickets.length)} / {ticketsTotal || tickets.length} tickets</>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Ticket list */}
            {filteredTickets.length > 0 && ticketView === 'list' && (
                <div ref={listContainerRef} className="flex-1 overflow-auto">
                    {/* Desktop table */}
                    <div
                        ref={tableScrollRef}
                        className="hidden md:block"
                        style={{ height: containerHeight, overflowY: 'auto' }}
                    >
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10 bg-white dark:bg-gray-900">
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned To</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                <th className="w-10 px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Spacer row for virtual scroll offset above visible rows */}
                            {rowVirtualizer.getVirtualItems().length > 0 && (
                                <tr aria-hidden="true">
                                    <td style={{ height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0, padding: 0, border: 'none' }} />
                                </tr>
                            )}
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const ticket = filteredTickets[virtualRow.index];
                                if (!ticket) return null;
                                return (
                                <tr
                                    key={ticket.id}
                                    onClick={() => openTicketDetail(ticket)}
                                    className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <Bug size={14} className="text-red-400 flex-shrink-0" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                                                    {ticket.title}
                                                </span>
                                            </div>
                                            {ticket.tags.length > 0 && (
                                                <div className="flex items-center gap-1 ml-6">
                                                    {ticket.tags.slice(0, 3).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getTagColor(tag)}`}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {ticket.tags.length > 3 && (
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-0.5">
                                                            +{ticket.tags.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {(ticket.failureType || ticket.team || ticket.firstReproducedAt || (ticket.returnedCount ?? 0) > 0) && (
                                                <div className="flex items-center gap-1 ml-6 mt-0.5 flex-wrap">
                                                    {ticket.failureType && (
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getFailureTypeColor(ticket.failureType)}`}>
                                                            {ticket.failureType}
                                                        </span>
                                                    )}
                                                    {ticket.team && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                            {ticket.team}
                                                        </span>
                                                    )}
                                                    {ticket.firstReproducedAt && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                            Reproduced
                                                        </span>
                                                    )}
                                                    {(ticket.returnedCount ?? 0) > 0 && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                                            Returned ×{ticket.returnedCount}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTicketStatusColor(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTicketPriorityColor(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTicketSeverityColor(ticket.severity)}`}>
                                            {ticket.severity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {ticket.assignedTo ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                                                    {ticket.assignedTo.name}
                                                </span>
                                                <img
                                                    src={ticket.assignedTo.avatar}
                                                    alt={ticket.assignedTo.name}
                                                    className="h-6 w-6 rounded-full border border-gray-200 dark:border-gray-600"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            {new Date(ticket.createdAt).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <ChevronRight size={14} className="text-gray-400" />
                                    </td>
                                </tr>
                                );
                            })}
                            {(() => {
                                const visibleRows = rowVirtualizer.getVirtualItems();
                                const lastVisibleRow = visibleRows[visibleRows.length - 1];
                                const bottomPad = lastVisibleRow
                                    ? rowVirtualizer.getTotalSize() - lastVisibleRow.end
                                    : 0;
                                return bottomPad > 0 ? (
                                    <tr aria-hidden="true">
                                        <td style={{ height: bottomPad, padding: 0, border: 'none' }} />
                                    </tr>
                                ) : null;
                            })()}
                        </tbody>
                    </table>
                    </div>

                    {/* Mobile ticket cards */}
                    <div className="md:hidden px-2 pt-2 pb-1">
                        {filteredTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => openTicketDetail(ticket)}
                                className="relative mac-card overflow-hidden cursor-pointer transition-all active:scale-[0.98] mb-3"
                            >
                                {/* Priority Color Bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getTicketPriorityBarColor(ticket.priority)}`} />

                                <div className="p-4 pl-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Top Row: Status, Priority, Severity */}
                                            <div className="flex items-center flex-wrap gap-1.5 mb-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTicketStatusColor(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTicketPriorityColor(ticket.priority)}`}>
                                                    {ticket.priority}
                                                </span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTicketSeverityColor(ticket.severity)}`}>
                                                    {ticket.severity}
                                                </span>
                                                {ticket.failureType && (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getFailureTypeColor(ticket.failureType)}`}>
                                                        {ticket.failureType}
                                                    </span>
                                                )}
                                                {ticket.firstReproducedAt && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                        Reproduced
                                                    </span>
                                                )}
                                                {(ticket.returnedCount ?? 0) > 0 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                                        Returned ×{ticket.returnedCount}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <h4 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                                                {ticket.title}
                                            </h4>

                                            {/* Tags */}
                                            {ticket.tags.length > 0 && (
                                                <div className="flex items-center gap-1 mt-2">
                                                    {ticket.tags.slice(0, 3).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getTagColor(tag)}`}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {ticket.tags.length > 3 && (
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                            +{ticket.tags.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Footer: Assignee & Date */}
                                            <div className="mt-4 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {ticket.assignedTo ? (
                                                        <>
                                                            <img
                                                                src={ticket.assignedTo.avatar}
                                                                alt={ticket.assignedTo.name}
                                                                className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-700 flex-shrink-0"
                                                            />
                                                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate">
                                                                {ticket.assignedTo.name}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">Unassigned</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-tight flex-shrink-0">
                                                    {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load more sentinel */}
                    {ticketsHasMore && (
                        <div ref={loadMoreSentinelRef} className="flex justify-center py-2">
                            {isLoadingMore && (
                                <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading more tickets...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status text */}
                    <div className="flex justify-end px-4 md:px-0">
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                            {hasActiveFilters ? (
                                <>Showing {filteredTickets.length} of {tickets.length} tickets</>
                            ) : (
                                <>Loaded {Math.min(ticketsOffset, tickets.length)} / {ticketsTotal || tickets.length} tickets</>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Ticket Modal */}
            <TicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateTicket}
                projectMembers={projectMembers.map((m) => ({ id: m.id, name: m.name }))}
                testRuns={testRunOptions}
                tagSuggestions={allTags}
            />

            {/* Mobile Filter Sheet */}
            <TicketFiltersSheet
                isOpen={isMobileFilterSheetOpen}
                onClose={() => setIsMobileFilterSheetOpen(false)}
                selectedStatus={selectedStatusFilters}
                selectedPriority={selectedPriorityFilters}
                selectedSeverity={selectedSeverityFilters}
                selectedFailureType={selectedFailureTypeFilter}
                selectedTeam={selectedTeamFilter}
                teams={allTeams}
                onApply={handleApplyFilters}
            />

            {/* Ticket Detail View */}
            {activeTicket && (
                <TicketDetailView
                    ticket={activeTicket}
                    onClose={closeTicketDetail}
                    onUpdate={handleUpdateTicket}
                    onDelete={handleDeleteTicket}
                    projectMembers={projectMembers.map((m) => ({ id: m.id, name: m.name }))}
                    testRuns={testRunOptions}
                    tagSuggestions={allTags}
                />
            )}
        </div>
    );
};

export default TicketsPage;
