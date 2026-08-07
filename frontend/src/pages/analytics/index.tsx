import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTestManagerStore } from '../../store/testManagerStore';
import { reportingApi } from '../../services/reportingApi';
import { testRunApi } from '../../services/testRunApi';
import { exportReportToCSV, exportReportToPDF } from '../../utils/exportReports';
import {
    ProjectSummaryReport,
    TrendReport,
    SuiteComparisonReport,
    TestCaseHealthReport,
    TicketMetricsReport,
    TicketTriageSegment,
    FailureType,
    ReturnReason,
    TestRunGroup,
} from '../../types/testManager';
import { getFailureTypeColor } from '../../utils/ticketColors';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
import TagInput from '../../components/testManager/TagInput';
import toast from 'react-hot-toast';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Activity,
    CheckCircle,
    XCircle,
    AlertCircle,
    Clock,
    Target,
    BarChart3,
    Download,
    FileText,
    ChevronDown,
    Ticket,
} from 'lucide-react';

const COLORS = {
    passed: '#10B981',
    failed: '#EF4444',
    blocked: '#F59E0B',
    skipped: '#6B7280',
    primary: '#3B82F6',
};

const calculatePassRate = (passed: number, failed: number): number => {
    const executedTotal = passed + failed;
    if (executedTotal === 0) return 0;
    return (passed / executedTotal) * 100;
};

const calculateFailRate = (passed: number, failed: number): number => {
    const executedTotal = passed + failed;
    if (executedTotal === 0) return 0;
    return (failed / executedTotal) * 100;
};

const renderPieLabel = ({ name, percent }: { name?: string; percent?: number }): string => {
    const percentage = (percent ?? 0) * 100;
    if (percentage < 4) return '';
    return `${name ?? ''} ${percentage.toFixed(0)}%`;
};

const AnalyticsPage: React.FC = () => {
    const { activeProject, projects } = useTestManagerStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'suites' | 'health' | 'triage'>('overview');
    
    // Initialize state from URL params or defaults
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>(
        (searchParams.get('range') as '7d' | '30d' | '90d' | 'all' | 'custom') || '30d'
    );
    const [customRange, setCustomRange] = useState({
        start: searchParams.get('start') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: searchParams.get('end') || new Date().toISOString().split('T')[0]
    });
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>(
        (searchParams.get('groupBy') as 'day' | 'week' | 'month') || 'day'
    );
    const [selectedTags, setSelectedTags] = useState<string[]>(
        searchParams.get('tags') ? (searchParams.get('tags') as string).split(',') : []
    );
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>(
        searchParams.get('groupId') || ''
    );
    const [runGroups, setRunGroups] = useState<TestRunGroup[]>([]);
    
    // Report data
    const [summaryReport, setSummaryReport] = useState<ProjectSummaryReport | null>(null);
    const [trendReport, setTrendReport] = useState<TrendReport | null>(null);
    const [suiteReport, setSuiteReport] = useState<SuiteComparisonReport | null>(null);
    const [healthReport, setHealthReport] = useState<TestCaseHealthReport | null>(null);
    const [ticketMetricsReport, setTicketMetricsReport] = useState<TicketMetricsReport | null>(null);

    // Export dropdown
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Close export menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
        };
        if (showExportMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showExportMenu]);

    const projectName = projects.find(p => p.id === activeProject)?.name;

    const handleExportCSV = useCallback(() => {
        if (!summaryReport) return;
        try {
            exportReportToCSV(summaryReport, trendReport, suiteReport, healthReport, projectName);
            toast.success('Report exported as CSV');
        } catch {
            toast.error('Failed to export CSV');
        }
        setShowExportMenu(false);
    }, [summaryReport, trendReport, suiteReport, healthReport, projectName]);

    const handleExportPDF = useCallback(() => {
        if (!summaryReport) return;
        try {
            exportReportToPDF(summaryReport, trendReport, suiteReport, healthReport, projectName);
        } catch {
            toast.error('Failed to export PDF');
        }
        setShowExportMenu(false);
    }, [summaryReport, trendReport, suiteReport, healthReport, projectName]);

    const handleOpenFailedRunCase = useCallback((runId: string, itemId: string, caseId: string) => {
        const runParam = encodeURIComponent(runId);
        const itemParam = encodeURIComponent(itemId);
        const caseParam = encodeURIComponent(caseId);
        const url = `/test-manager/runs?runId=${runParam}&itemId=${itemParam}&caseId=${caseParam}`;

        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
            navigate(url);
        }
    }, [navigate]);

    // Sync URL params when state changes
    useEffect(() => {
        const params: Record<string, string> = { range: dateRange, groupBy };
        if (dateRange === 'custom') {
            params.start = customRange.start;
            params.end = customRange.end;
        }
        if (selectedTags.length > 0) {
            params.tags = selectedTags.join(',');
        }
        if (selectedGroupId) {
            params.groupId = selectedGroupId;
        }
        setSearchParams(params, { replace: true });
    }, [dateRange, customRange, groupBy, selectedTags, selectedGroupId, setSearchParams]);

    // Calculate date range
    const getDateRange = useCallback(() => {
        if (dateRange === 'custom') {
            return {
                startDate: new Date(customRange.start).toISOString(),
                endDate: new Date(customRange.end).toISOString(),
            };
        }

        const endDate = new Date();
        let startDate = new Date();
        
        switch (dateRange) {
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
            case 'all':
                startDate = new Date(2020, 0, 1); // Far back date
                break;
        }
        
        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        };
    }, [dateRange, customRange]);

    // Fetch reports
    const fetchReports = useCallback(async () => {
        if (!activeProject) return;

        const range = getDateRange();
        
        // Validation for custom range
        if (dateRange === 'custom') {
            if (new Date(range.startDate) > new Date(range.endDate)) {
                toast.error('Start date cannot be after end date');
                return;
            }
        }
        
        setIsLoading(true);
        try {
            const params = {
                startDate: range.startDate,
                endDate: range.endDate,
                tags: selectedTags.length > 0 ? selectedTags : undefined,
                groupId: selectedGroupId || undefined,
            };

            // Fetch reports in parallel
            const [summary, trends, suites, health, ticketMetrics] = await Promise.all([
                reportingApi.getProjectSummary(activeProject, params),
                reportingApi.getTrendReport(activeProject, { ...params, groupBy }),
                reportingApi.getSuiteComparison(activeProject, params),
                reportingApi.getTestCaseHealth(activeProject, params),
                reportingApi.getTicketMetrics(activeProject, { ...params, groupBy }),
            ]);

            setSummaryReport(summary);
            setTrendReport(trends);
            setSuiteReport(suites);
            setHealthReport(health);
            setTicketMetricsReport(ticketMetrics);
        } catch (error: unknown) {
            const message = (error as { message?: string })?.message || 'Failed to load reports';
            toast.error(message);
            console.error('Error fetching reports:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeProject, dateRange, groupBy, selectedTags, selectedGroupId, getDateRange]);

    // Fetch tag suggestions
    useEffect(() => {
        if (activeProject) {
            testRunApi.getTagsByProject(activeProject)
                .then(setTagSuggestions)
                .catch(() => { /* ignore */ });
        }
    }, [activeProject]);

    // Fetch run groups
    useEffect(() => {
        if (activeProject) {
            testRunApi.getTestRunGroups(activeProject)
                .then((groups) => setRunGroups(groups.map(g => ({
                    id: g.id,
                    name: g.name,
                    description: g.description,
                    projectId: g.projectId,
                    color: g.color,
                    createdBy: g.createdBy,
                    createdAt: g.createdAt,
                    updatedAt: g.updatedAt,
                }))))
                .catch(() => { /* ignore */ });
        }
    }, [activeProject]);

    useEffect(() => {
        if (activeProject) {
            fetchReports();
        }
    }, [activeProject, fetchReports]);

    if (!activeProject) {
        return (
            <EmptyProjectState
                title="No Project Selected"
                description="Please select a project to view reports and analytics"
            />
        );
    }

    if (isLoading || !summaryReport) {
        return (
            <div className="flex flex-col h-auto sm:h-full bg-white dark:bg-gray-900">
                <div className="bg-white dark:bg-gray-900 sm:sticky sm:top-0 sm:z-20">
                    <ContextBreadcrumb showSuiteSelector={false} />
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-auto sm:h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sm:sticky sm:top-0 sm:z-20">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <ContextBreadcrumb
                        showSuiteSelector={false}
                        className="min-h-0 flex-1 min-w-0 border-b-0 px-0 py-0 sm:px-0"
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchReports}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            title="Refresh"
                        >
                            <Activity className="w-5 h-5" />
                        </button>
                        <div ref={exportMenuRef} className="relative">
                            <button
                                onClick={() => setShowExportMenu(prev => !prev)}
                                className="flex items-center gap-1 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                title="Export Report"
                            >
                                <Download className="w-5 h-5" />
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            {showExportMenu && (
                                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                                    <button
                                        onClick={handleExportCSV}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        Export as CSV
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        Export as PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap px-4 pb-3">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        {(['7d', '30d', '90d', 'all', 'custom'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    dateRange === range
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                }`}
                            >
                                {range === '7d' && '7d'}
                                {range === '30d' && '30d'}
                                {range === '90d' && '90d'}
                                {range === 'all' && 'All'}
                                {range === 'custom' && 'Custom'}
                            </button>
                        ))}
                    </div>

                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                            <div className="relative">
                                <input
                                    type="date"
                                    value={customRange.start}
                                    max={customRange.end}
                                    onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                                    className="text-sm border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <span className="text-gray-400 font-medium">to</span>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={customRange.end}
                                    min={customRange.start}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                                    className="text-sm border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'trends' && (
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            {(['day', 'week', 'month'] as const).map((group) => (
                                <button
                                    key={group}
                                    onClick={() => setGroupBy(group)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        groupBy === group
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                    }`}
                                >
                                    {group.charAt(0).toUpperCase() + group.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tag & Group filters */}
                <div className="mt-2 flex items-start gap-3 flex-wrap px-4 pb-3">
                    <div className="flex-1 min-w-[200px] max-w-md">
                        <TagInput
                            tags={selectedTags}
                            onChange={setSelectedTags}
                            suggestions={tagSuggestions}
                            placeholder="Filter by tags..."
                        />
                    </div>
                    <div className="min-w-[180px]">
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">All Run Groups</option>
                            {runGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4">
                <div className="flex gap-4">
                    {[
                        { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
                        { id: 'trends' as const, label: 'Trends', icon: TrendingUp },
                        { id: 'suites' as const, label: 'Suites', icon: Target },
                        { id: 'health' as const, label: 'Test Health', icon: Activity },
                        { id: 'triage' as const, label: 'Triage', icon: Ticket },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 sm:overflow-auto p-6">
                {activeTab === 'overview' && (
                    <OverviewTab summaryReport={summaryReport} trendReport={trendReport} />
                )}
                {activeTab === 'trends' && trendReport && (
                    <TrendsTab trendReport={trendReport} />
                )}
                {activeTab === 'suites' && suiteReport && (
                    <SuitesTab suiteReport={suiteReport} />
                )}
                {activeTab === 'health' && healthReport && (
                    <HealthTab healthReport={healthReport} onOpenFailedRunCase={handleOpenFailedRunCase} />
                )}
                {activeTab === 'triage' && ticketMetricsReport && (
                    <TriageTab report={ticketMetricsReport} onNavigateToTickets={navigate} />
                )}
            </div>
        </div>
    );
};

// Overview Tab Component
const OverviewTab: React.FC<{ summaryReport: ProjectSummaryReport; trendReport: TrendReport | null }> = ({
    summaryReport,
    trendReport,
}) => {
    const overallPassRate = calculatePassRate(
        summaryReport.overallStats.totalPassed,
        summaryReport.overallStats.totalFailed
    );

    const testCaseDistributionData = [
        { name: 'Passed', value: summaryReport.overallStats.totalPassed, color: COLORS.passed },
        { name: 'Failed', value: summaryReport.overallStats.totalFailed, color: COLORS.failed },
        { name: 'Blocked', value: summaryReport.overallStats.totalBlocked, color: COLORS.blocked },
        { name: 'Skipped', value: summaryReport.overallStats.totalSkipped, color: COLORS.skipped },
        { name: 'Not Run', value: summaryReport.overallStats.totalNotRun, color: COLORS.primary },
    ].filter(item => item.value > 0);

    const passFailDistributionData = [
        { name: 'Passed', value: summaryReport.overallStats.totalPassed, color: COLORS.passed },
        { name: 'Failed', value: summaryReport.overallStats.totalFailed, color: COLORS.failed },
    ].filter(item => item.value > 0);

    const trendChartData = trendReport
        ? trendReport.dataPoints.map((point) => ({
            ...point,
            computedPassRate: calculatePassRate(point.passed, point.failed),
        }))
        : [];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Test Runs"
                    value={summaryReport.totalRuns}
                    icon={<Activity className="w-5 h-5" />}
                    color="blue"
                />
                <KPICard
                    title="Average Pass Rate"
                    value={`${overallPassRate.toFixed(1)}%`}
                    icon={<CheckCircle className="w-5 h-5" />}
                    color="green"
                    trend={trendReport ? {
                        direction: trendReport.summary.trendDirection,
                        value: `${Math.abs(trendReport.summary.changePercentage).toFixed(1)}%`,
                    } : undefined}
                />
                <KPICard
                    title="Completed Runs"
                    value={summaryReport.completedRuns}
                    subtitle={`${summaryReport.inProgressRuns} in progress`}
                    icon={<Target className="w-5 h-5" />}
                    color="purple"
                />
                <KPICard
                    title="Avg Duration"
                    value={formatDuration(summaryReport.overallStats.averageDuration)}
                    icon={<Clock className="w-5 h-5" />}
                    color="orange"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Test Case Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Test Case Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={testCaseDistributionData}
                                cx="50%"
                                cy="45%"
                                labelLine={false}
                                label={renderPieLabel}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {testCaseDistributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Pass/Fail Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Test Pass/Fail Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={passFailDistributionData}
                                cx="50%"
                                cy="45%"
                                labelLine={false}
                                label={renderPieLabel}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {passFailDistributionData.map((entry, index) => (
                                    <Cell key={`pass-fail-cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Pass Rate Trend */}
            {trendReport && trendReport.dataPoints.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Pass Rate Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                            <XAxis
                                dataKey="periodLabel"
                                stroke="#6B7280"
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#6B7280"
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                domain={[0, 100]}
                            />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="computedPassRate"
                                stroke={COLORS.primary}
                                strokeWidth={2}
                                dot={{ fill: COLORS.primary, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Suite Breakdown */}
            {summaryReport.suiteBreakdown.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Suite Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Suite</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Runs</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Tests</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Pass Rate</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Avg Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryReport.suiteBreakdown.map((suite) => {
                                    const suitePassRate = calculatePassRate(suite.totalPassed, suite.totalFailed);

                                    return (
                                    <tr key={suite.suiteId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{suite.suiteName}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suite.totalRuns}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suite.totalTests}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                suitePassRate >= 80
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : suitePassRate >= 60
                                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            }`}>
                                                {suitePassRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                                            {formatDuration(suite.averageDuration)}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// Trends Tab Component
const TrendsTab: React.FC<{ trendReport: TrendReport }> = ({ trendReport }) => {
    const trendSummaryPassRate = (() => {
        const aggregate = trendReport.dataPoints.reduce(
            (acc, point) => ({
                passed: acc.passed + point.passed,
                failed: acc.failed + point.failed,
            }),
            { passed: 0, failed: 0 }
        );

        return calculatePassRate(aggregate.passed, aggregate.failed);
    })();

    const trendChartData = trendReport.dataPoints.map((point) => ({
        ...point,
        computedPassRate: calculatePassRate(point.passed, point.failed),
    }));

    return (
        <div className="space-y-6">
            {/* Trend Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Runs</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{trendReport.summary.totalRuns}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Average Pass Rate</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{trendSummaryPassRate.toFixed(1)}%</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Trend</div>
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${
                                trendReport.summary.trendDirection === 'improving'
                                    ? 'text-green-600 dark:text-green-400'
                                    : trendReport.summary.trendDirection === 'declining'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-600 dark:text-gray-400'
                            }`}>
                                {trendReport.summary.trendDirection === 'improving' && <TrendingUp className="w-6 h-6" />}
                                {trendReport.summary.trendDirection === 'declining' && <TrendingDown className="w-6 h-6" />}
                                {trendReport.summary.trendDirection === 'stable' && <Minus className="w-6 h-6" />}
                            </span>
                            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                {Math.abs(trendReport.summary.changePercentage).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pass Rate Over Time */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Pass Rate Over Time</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                            dataKey="periodLabel"
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <YAxis
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            domain={[0, 100]}
                            label={{ value: 'Pass Rate (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="computedPassRate"
                            stroke={COLORS.primary}
                            strokeWidth={2}
                            dot={{ fill: COLORS.primary, r: 4 }}
                            name="Pass Rate"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Test Execution Volume */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Test Execution Volume</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={trendReport.dataPoints}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                            dataKey="periodLabel"
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <YAxis
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="passed" stackId="a" fill={COLORS.passed} name="Passed" />
                        <Bar dataKey="failed" stackId="a" fill={COLORS.failed} name="Failed" />
                        <Bar dataKey="blocked" stackId="a" fill={COLORS.blocked} name="Blocked" />
                        <Bar dataKey="skipped" stackId="a" fill={COLORS.skipped} name="Skipped" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Suites Tab Component
const SuitesTab: React.FC<{ suiteReport: SuiteComparisonReport }> = ({ suiteReport }) => {
    const chartData = suiteReport.suites.map(suite => ({
        name: suite.suiteName.length > 20 ? suite.suiteName.substring(0, 20) + '...' : suite.suiteName,
        passRate: calculatePassRate(suite.passed, suite.failed),
        failureRate: calculateFailRate(suite.passed, suite.failed),
    }));

    return (
        <div className="space-y-6">
            {/* Suite Comparison Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Suite Pass Rates</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis type="number" domain={[0, 100]} stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} width={150} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="passRate" fill={COLORS.passed} name="Pass Rate %" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Suite Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Detailed Suite Metrics</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Suite</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Runs</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Tests</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Pass Rate</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Fail Rate</th>
                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Trend</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Avg Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suiteReport.suites.map((suite) => (
                                (() => {
                                    const suitePassRate = calculatePassRate(suite.passed, suite.failed);
                                    const suiteFailRate = calculateFailRate(suite.passed, suite.failed);

                                    return (
                                <tr key={suite.suiteId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">{suite.suiteName}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suite.totalRuns}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suite.totalTests}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            suitePassRate >= 80
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : suitePassRate >= 60
                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        }`}>
                                            {suitePassRate.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suiteFailRate.toFixed(1)}%</td>
                                    <td className="py-3 px-4 text-center">
                                        {suite.trend === 'improving' && <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" />}
                                        {suite.trend === 'declining' && <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto" />}
                                        {suite.trend === 'stable' && <Minus className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-auto" />}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                                        {formatDuration(suite.averageDuration)}
                                    </td>
                                </tr>
                                    );
                                })()
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Health Tab Component
const HealthTab: React.FC<{ healthReport: TestCaseHealthReport; onOpenFailedRunCase: (runId: string, itemId: string, caseId: string) => void }> = ({
    healthReport,
    onOpenFailedRunCase,
}) => {
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Test Cases</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{healthReport.summary.totalUniqueCases}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Flaky Tests</div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{healthReport.summary.flakyCount}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Never Executed</div>
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{healthReport.summary.neverExecutedCount}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">High Failure Rate</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{healthReport.summary.highFailureCount}</div>
                </div>
            </div>

            {/* Failed Test Run Cases */}
            {healthReport.failedRunCases.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        Failed Test Run Cases
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Test Case Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Test Run Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Test Suite</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Area</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {healthReport.failedRunCases.slice(0, 20).map((item) => (
                                    <tr
                                        key={`${item.runId}-${item.itemId}`}
                                        onClick={() => onOpenFailedRunCase(item.runId, item.itemId, item.caseId)}
                                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                        title="Open failed test case in test run"
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{item.testCaseName}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{item.runName}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{item.testSuite}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{item.area}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{item.failedAt ? new Date(item.failedAt).toLocaleString() : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Flaky Tests */}
            {healthReport.flakyTests.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        Flaky Tests
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Test Case</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Suite</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Executions</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Flaky Score</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Recent Results</th>
                                </tr>
                            </thead>
                            <tbody>
                                {healthReport.flakyTests.slice(0, 10).map((test) => (
                                    <tr key={test.caseId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{test.title}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{test.suite}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{test.executionCount}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                                {test.flakyScore}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-1">
                                                {test.recentResults.slice(0, 10).map((status, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`w-3 h-3 rounded-full ${
                                                            status === 'Passed'
                                                                ? 'bg-green-500'
                                                                : status === 'Failed'
                                                                ? 'bg-red-500'
                                                                : 'bg-gray-400'
                                                        }`}
                                                        title={status}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Most Failing Tests */}
            {healthReport.mostFailingTests.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        Most Failing Tests
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Test Case</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Suite</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Executions</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Failures</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Failure Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {healthReport.mostFailingTests.slice(0, 10).map((test) => (
                                    <tr key={test.caseId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{test.title}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{test.suite}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{test.executionCount}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{test.failCount}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                {test.failureRate.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Never Executed Tests */}
            {healthReport.neverExecutedTests.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        Never Executed Tests
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Test Case</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Suite</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Days Since Creation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {healthReport.neverExecutedTests.slice(0, 10).map((test) => (
                                    <tr key={test.caseId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{test.title}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{test.suite}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{test.daysSinceCreation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// Triage Tab Component
const formatHours = (hours: number | null): string => {
    if (hours === null || hours === undefined) return '—';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 48) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
};

const getReturnReasonColor = (reason: string): string => {
    switch (reason) {
        case ReturnReason.MissingSteps: return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
        case ReturnReason.MissingExpectedActual: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
        case ReturnReason.MissingEnvironmentBuild: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
        case ReturnReason.MissingAttachment: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
        case ReturnReason.NotReproducible: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
        default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
};

const TriageTab: React.FC<{ report: TicketMetricsReport; onNavigateToTickets: (url: string) => void }> = ({
    report,
    onNavigateToTickets,
}) => {
    const openTicketsWithFilter = (failureType?: string, team?: string) => {
        const params = new URLSearchParams();
        if (failureType) params.set('failureType', failureType);
        if (team) params.set('team', team);
        const query = params.toString();
        onNavigateToTickets(query ? `/test-manager/tickets?${query}` : '/test-manager/tickets');
    };

    const renderSegmentTable = (
        segments: TicketTriageSegment[],
        isTeam: boolean
    ) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {isTeam ? 'By Team' : 'By Failure Type'}
            </h3>
            {segments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No ticket data in this period.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {isTeam ? 'Team' : 'Failure Type'}
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Created</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Reproduced</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Repro Rate</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Median TTR</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Returned</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Return Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {segments.map((segment) => (
                                <tr
                                    key={segment.key}
                                    onClick={() => openTicketsWithFilter(isTeam ? undefined : segment.key, isTeam ? segment.key : undefined)}
                                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                    title={`View ${segment.label} tickets`}
                                >
                                    <td className="py-3 px-4">
                                        {isTeam ? (
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{segment.label}</span>
                                        ) : (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getFailureTypeColor(segment.key as FailureType)}`}>
                                                {segment.label}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{segment.ticketsCreated}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{segment.ticketsReproduced}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                            {segment.reproductionRate.toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{formatHours(segment.timeToReproduceMedianHours)}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{segment.returnedCount}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{segment.returnedRate.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const totalReturned = report.returnsByReason.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Tickets Created"
                    value={report.kpis.ticketsCreated}
                    icon={<Ticket className="w-5 h-5" />}
                    color="blue"
                />
                <KPICard
                    title="Reproduction Rate"
                    value={`${report.kpis.reproductionRate.toFixed(1)}%`}
                    subtitle={`${report.kpis.ticketsReproduced} reproduced`}
                    icon={<CheckCircle className="w-5 h-5" />}
                    color="green"
                />
                <KPICard
                    title="Median TTR"
                    value={formatHours(report.kpis.timeToReproduceMedianHours)}
                    subtitle={report.kpis.timeToReproduceAvgHours !== null ? `avg ${formatHours(report.kpis.timeToReproduceAvgHours)}` : undefined}
                    icon={<Clock className="w-5 h-5" />}
                    color="purple"
                />
                <KPICard
                    title="Returned for Info"
                    value={`${report.kpis.returnedRate.toFixed(1)}%`}
                    subtitle={`${report.kpis.ticketsReturned} tickets returned`}
                    icon={<AlertCircle className="w-5 h-5" />}
                    color="red"
                />
            </div>

            {/* Trend Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Triage Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={report.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                        <XAxis dataKey="periodLabel" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
                        <YAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="ticketsCreated" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Created" />
                        <Line type="monotone" dataKey="ticketsReproduced" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Reproduced" />
                        <Line type="monotone" dataKey="ticketsReturned" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} name="Returned" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Segmented tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderSegmentTable(report.byFailureType, false)}
                {renderSegmentTable(report.byTeam, true)}
            </div>

            {/* Returns by reason */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Return Reasons</h3>
                {report.returnsByReason.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No tickets were returned in this period.</p>
                ) : (
                    <div className="space-y-3">
                        {report.returnsByReason.map((item) => {
                            const percentage = totalReturned > 0 ? (item.count / totalReturned) * 100 : 0;
                            return (
                                <div key={item.reason} className="flex items-center gap-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-52 flex-shrink-0 ${getReturnReasonColor(item.reason)}`}>
                                        {item.reason}
                                    </span>
                                    <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16 text-right flex-shrink-0">
                                        {item.count} ({percentage.toFixed(0)}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// KPI Card Component
interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    trend?: {
        direction: 'improving' | 'declining' | 'stable';
        value: string;
    };
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, color, trend }) => {
    const colorClasses = {
        blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
        red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{value}</div>
            {subtitle && <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>}
            {trend && (
                <div className="flex items-center gap-1 mt-2">
                    {trend.direction === 'improving' && <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />}
                    {trend.direction === 'declining' && <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />}
                    {trend.direction === 'stable' && <Minus className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
                    <span className={`text-xs font-medium ${
                        trend.direction === 'improving'
                            ? 'text-green-600 dark:text-green-400'
                            : trend.direction === 'declining'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}>
                        {trend.value}
                    </span>
                </div>
            )}
        </div>
    );
};

// Utility function to format duration
const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
};

export default AnalyticsPage;
