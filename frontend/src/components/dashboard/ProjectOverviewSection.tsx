import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { Folder, Layers, ListChecks, Ticket, PlayCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTestManagerStore } from '../../store/testManagerStore';
import ProjectSelector from '../testManager/ProjectSelector';
import { getProjectDashboardStats, ProjectDashboardStats } from '../../services/statisticsApi';
import { TicketStatus, TestRunStatus } from '../../types/testManager';

const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
    [TicketStatus.Open]: '#3B82F6',
    [TicketStatus.InProgress]: '#F59E0B',
    [TicketStatus.Resolved]: '#10B981',
    [TicketStatus.Closed]: '#9CA3AF',
    [TicketStatus.Reopened]: '#A855F7',
};

const RUN_STATUS_COLORS: Record<TestRunStatus, string> = {
    [TestRunStatus.Draft]: '#9CA3AF',
    [TestRunStatus.InProgress]: '#3B82F6',
    [TestRunStatus.Completed]: '#10B981',
    [TestRunStatus.Abandoned]: '#EF4444',
};

const ProjectOverviewSection: React.FC = () => {
    const navigate = useNavigate();
    const activeProject = useTestManagerStore((state) => state.activeProject);
    const projects = useTestManagerStore((state) => state.projects);
    const fetchProjects = useTestManagerStore((state) => state.fetchProjects);

    const [stats, setStats] = useState<ProjectDashboardStats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (!activeProject) {
            setStats(null);
            return;
        }

        let cancelled = false;
        setLoading(true);

        getProjectDashboardStats(activeProject)
            .then((data) => {
                if (!cancelled) setStats(data);
            })
            .catch((error) => {
                console.error('Failed to fetch project dashboard stats:', error);
                if (!cancelled) toast.error('Failed to load project overview.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [activeProject]);

    if (!activeProject) return null;

    const activeProjectMeta = projects.find((project) => project.id === activeProject);
    const ticketsTotal = stats?.ticketsByStatus.reduce((sum, item) => sum + item.count, 0) ?? 0;

    const goToTicketsByStatus = (statuses: TicketStatus[]) => {
        if (statuses.length === 0) {
            navigate('/test-manager/tickets');
            return;
        }
        const statusParam = statuses.map((status) => encodeURIComponent(status)).join(',');
        navigate(`/test-manager/tickets?status=${statusParam}`);
    };

    const goToRunsByStatus = (status: TestRunStatus) => {
        navigate(`/test-manager/runs?runStatus=${encodeURIComponent(status)}`);
    };

    const runCount = (status: TestRunStatus) =>
        stats?.runsByStatus.find((item) => item.status === status)?.count ?? 0;

    const statTileClass =
        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-4 sm:p-6 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300 cursor-pointer';

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-6"
        >
            {/* Project header + switcher */}
            <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-11 w-11 rounded-xl ${activeProjectMeta?.color || 'bg-blue-500'} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                            <Folder className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-gray-900 tracking-tight dark:text-gray-100 truncate">
                                {activeProjectMeta?.name || stats?.projectName || 'Project Overview'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {activeProjectMeta?.description || 'Selected project overview'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ProjectSelector stayOnPage />
                        <button
                            onClick={() => navigate('/test-manager/suites')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#007AFF] hover:bg-[#0062cc] dark:bg-system-darkBlue dark:hover:bg-[#0056b3] text-white rounded-lg transition-colors text-sm font-medium shadow-sm whitespace-nowrap"
                        >
                            Open Project
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {loading || !stats ? (
                    Array(4)
                        .fill(0)
                        .map((_, i) => (
                            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-4 sm:p-6 h-36 animate-pulse"></div>
                        ))
                ) : (
                    <>
                        {/* Tickets */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={statTileClass}
                            onClick={() => goToTicketsByStatus([])}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tickets</p>
                                    <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight dark:text-gray-100">{ticketsTotal}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex-shrink-0">
                                    <Ticket className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                                {stats.ticketsByStatus.map((item) =>
                                    item.count > 0 ? (
                                        <div
                                            key={item.status}
                                            title={`${item.status}: ${item.count}`}
                                            className="h-full transition-all"
                                            style={{ width: `${(item.count / (ticketsTotal || 1)) * 100}%`, backgroundColor: TICKET_STATUS_COLORS[item.status] }}
                                        />
                                    ) : null
                                )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                                {stats.ticketsByStatus.map((item) => (
                                    <button
                                        key={item.status}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            goToTicketsByStatus([item.status]);
                                        }}
                                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                    >
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TICKET_STATUS_COLORS[item.status] }} />
                                        <span className="font-medium">{item.count}</span>
                                        <span className="hidden sm:inline">{item.status}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Test Runs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className={statTileClass}
                            onClick={() => navigate('/test-manager/runs')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Test Runs</p>
                                    <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight dark:text-gray-100">{stats.runsByStatus.reduce((sum, item) => sum + item.count, 0)}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                                    <PlayCircle className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goToRunsByStatus(TestRunStatus.Completed);
                                    }}
                                    className="flex items-center justify-between w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-system-green" />
                                        Completed
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{runCount(TestRunStatus.Completed)}</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goToRunsByStatus(TestRunStatus.InProgress);
                                    }}
                                    className="flex items-center justify-between w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-3.5 w-3.5 rounded-full border-2 border-system-blue" />
                                        In Progress
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{runCount(TestRunStatus.InProgress)}</span>
                                </button>
                                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RUN_STATUS_COLORS[TestRunStatus.Draft] }} />
                                        Draft
                                    </span>
                                    <span>{runCount(TestRunStatus.Draft)}</span>
                                    <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RUN_STATUS_COLORS[TestRunStatus.Abandoned] }} />
                                        Abandoned
                                    </span>
                                    <span>{runCount(TestRunStatus.Abandoned)}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Suites */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={statTileClass}
                            onClick={() => navigate('/test-manager/suites')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Test Suites</p>
                                    <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight dark:text-gray-100">{stats.suitesCount}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400 flex-shrink-0">
                                    <Layers className="w-6 h-6" />
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">View suites and organize test cases</p>
                        </motion.div>

                        {/* Test Cases */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className={statTileClass}
                            onClick={() => navigate('/test-manager/cases')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Test Cases</p>
                                    <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight dark:text-gray-100">{stats.casesCount}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 flex-shrink-0">
                                    <ListChecks className="w-6 h-6" />
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">Browse and manage test cases</p>
                        </motion.div>
                    </>
                )}
            </div>

            {/* Ticket status breakdown */}
            {!loading && stats && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden"
                >
                    <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight dark:text-gray-100">Tickets by Status</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Click a status to view filtered tickets</p>
                        </div>
                        <button
                            onClick={() => goToTicketsByStatus([])}
                            className="flex items-center gap-1 text-sm font-medium text-[#007AFF] dark:text-system-blue hover:underline whitespace-nowrap"
                        >
                            All Tickets
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {stats.ticketsByStatus.map((item) => (
                            <button
                                key={item.status}
                                onClick={() => goToTicketsByStatus([item.status])}
                                className="w-full flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors group"
                            >
                                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TICKET_STATUS_COLORS[item.status] }} />
                                <span className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">{item.status}</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{item.count}</span>
                                <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.section>
    );
};

export default ProjectOverviewSection;
