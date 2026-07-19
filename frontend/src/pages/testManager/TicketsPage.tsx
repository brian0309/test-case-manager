import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { shallow } from 'zustand/shallow';
import toast from 'react-hot-toast';
import { useTestManagerStore } from '../../store/testManagerStore';
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
    Plus,
    Loader2,
    ChevronRight,
} from 'lucide-react';
import { CreateTicketRequest, UpdateTicketRequest } from '../../types/api/testManager.api';
import { testRunApi } from '../../services/testRunApi';
import { getTagColor } from '../../utils/tagColors';
import {
    getTicketStatusColor,
    getTicketPriorityTextColor,
    getTicketSeverityTextColor,
} from '../../utils/ticketColors';

const TicketsPage: React.FC = () => {
    const {
        activeProject,
        tickets,
        isLoading,
        fetchTickets,
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
            fetchTickets: state.fetchTickets,
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

    const currentProject = projects.find((p) => p.id === activeProject);
    const projectMembers = currentProject?.members || [];

    // Compute all unique tags from all tickets for auto-suggestions
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        tickets.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
        return Array.from(tagSet).sort();
    }, [tickets]);

    // Check for URL state to open create modal
    useEffect(() => {
        if (location.state && (location.state as any).openNewTicket) {
            setIsCreateModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Fetch tickets when project changes
    useEffect(() => {
        if (activeProject) {
            fetchTickets(activeProject);
            // Fetch test runs for the create modal dropdown
            testRunApi.getTestRuns(activeProject)
                .then((runs) => setTestRunOptions(runs.map((r) => ({ id: r.id, title: r.title }))))
                .catch(() => {});
        }
    }, [activeProject, fetchTickets]);

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
            {/* Header area with create button */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <Bug size={18} className="text-red-500" />
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Tickets ({tickets.length})
                    </h2>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} />
                    New Ticket
                </button>
            </div>

            {/* Loading state */}
            {isLoading && tickets.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            )}

            {/* Empty state */}
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
                        <Plus size={16} />
                        Create Ticket
                    </button>
                </div>
            )}

            {/* Ticket list */}
            {tickets.length > 0 && (
                <div className="flex-1 overflow-auto">
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
                            {tickets.map((ticket) => (
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
                                        <span className={`text-xs font-medium ${getTicketPriorityTextColor(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-medium ${getTicketSeverityTextColor(ticket.severity)}`}>
                                            {ticket.severity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {ticket.assignedTo?.name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-gray-500 dark:text-gray-500">
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <ChevronRight size={14} className="text-gray-400" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
