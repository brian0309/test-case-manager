import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { shallow } from 'zustand/shallow';
import toast from 'react-hot-toast';
import { useTestManagerStore, mapTicketResponse } from '../../store/testManagerStore';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import TicketModal from '../../components/testManager/TicketModal';
import TicketDetailView from './components/TicketDetailView';
import {
    Ticket,
    TicketStatus,
    TicketPriority,
    TicketSeverity,
} from '../../types/testManager';
import {
    Bug,
    Loader2,
    ChevronRight,
    X,
    Check,
    ChevronDown,
    Filter,
} from 'lucide-react';
import { CreateTicketRequest, UpdateTicketRequest } from '../../types/api/testManager.api';
import { ticketApi } from '../../services/ticketApi';
import { testRunApi } from '../../services/testRunApi';
import { getTagColor } from '../../utils/tagColors';
import {
    getTicketStatusColor,
    getTicketPriorityColor,
    getTicketSeverityColor,
} from '../../utils/ticketColors';

const TICKETS_PAGE_SIZE = 30;

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
        projects,
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
            projects: state.projects,
        }),
        shallow
    );

    const location = useLocation();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [testRunOptions, setTestRunOptions] = useState<{ id: string; title: string }[]>([]);

    // Quick filter state
    const [selectedStatusFilters, setSelectedStatusFilters] = useState<TicketStatus[]>([]);
    const [selectedPriorityFilters, setSelectedPriorityFilters] = useState<TicketPriority[]>([]);
    const [selectedSeverityFilters, setSelectedSeverityFilters] = useState<TicketSeverity[]>([]);
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false);
    const [isSeverityFilterOpen, setIsSeverityFilterOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // Pagination state
    const [ticketsOffset, setTicketsOffset] = useState(0);
    const [ticketsHasMore, setTicketsHasMore] = useState(false);
    const [ticketsTotal, setTicketsTotal] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const listContainerRef = useRef<HTMLDivElement>(null);

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
        return result;
    }, [tickets, selectedStatusFilters, selectedPriorityFilters, selectedSeverityFilters]);

    const hasActiveFilters = selectedStatusFilters.length > 0 || selectedPriorityFilters.length > 0 || selectedSeverityFilters.length > 0;

    // Check for URL state to open create modal
    useEffect(() => {
        if (location.state && (location.state as any).openNewTicket) {
            setIsCreateModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

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
    }, [activeProject]);

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

    const handleLoadMoreTickets = useCallback(() => {
        if (!ticketsHasMore || isLoadingMore || isLoading) return;
        loadTickets(false, ticketsOffset);
    }, [loadTickets, ticketsHasMore, isLoadingMore, isLoading, ticketsOffset]);

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
    }, [handleLoadMoreTickets, ticketsHasMore, isLoading, isLoadingMore]);

    // Close filter dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsStatusFilterOpen(false);
                setIsPriorityFilterOpen(false);
                setIsSeverityFilterOpen(false);
            }
        };

        if (isStatusFilterOpen || isPriorityFilterOpen || isSeverityFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isStatusFilterOpen, isPriorityFilterOpen, isSeverityFilterOpen]);

    const handleCreateTicket = useCallback(async (data: {
        title: string;
        description?: string;
        priority: TicketPriority;
        severity: TicketSeverity;
        status?: TicketStatus;
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
        assignedToId?: string;
        tags?: string[];
    }) => {
        if (!activeProject || !activeTicket) return;
        const request: UpdateTicketRequest = {
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            severity: data.severity,
            assignedToId: data.assignedToId,
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

    const openTicketDetail = useCallback((ticket: Ticket) => {
        setActiveTicket(ticket);
        setTicketDetailViewOpen(true);
    }, [setActiveTicket, setTicketDetailViewOpen]);

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
        <div className="h-full flex flex-col">
            {/* Header area with quick filters */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Bug size={18} className="text-red-500" />
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Tickets ({ticketsTotal || tickets.length})
                        </h2>
                    </div>
                    <div ref={filterDropdownRef} className="flex items-center gap-2">
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

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setSelectedStatusFilters([]);
                                setSelectedPriorityFilters([]);
                                setSelectedSeverityFilters([]);
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

            {/* Ticket list */}
            {filteredTickets.length > 0 && (
                <div ref={listContainerRef} className="flex-1 overflow-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
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
                            {filteredTickets.map((ticket) => (
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
                            ))}
                        </tbody>
                    </table>

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
                    <div className="flex justify-end">
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
