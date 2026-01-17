import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTestManagerStore } from '../../store/testManagerStore';
import { reportingApi } from '../../services/reportingApi';
import {
    ProjectSummaryReport,
    TrendReport,
    SuiteComparisonReport,
    TestCaseHealthReport,
} from '../../types/testManager';
import EmptyProjectState from '../../components/testManager/EmptyProjectState';
import ContextBreadcrumb from '../../components/testManager/ContextBreadcrumb';
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
} from 'lucide-react';

const COLORS = {
    passed: '#10B981',
    failed: '#EF4444',
    blocked: '#F59E0B',
    skipped: '#6B7280',
    primary: '#3B82F6',
};

const AnalyticsPage: React.FC = () => {
    const { activeProject } = useTestManagerStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'suites' | 'health'>('overview');
    
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
    
    // Report data
    const [summaryReport, setSummaryReport] = useState<ProjectSummaryReport | null>(null);
    const [trendReport, setTrendReport] = useState<TrendReport | null>(null);
    const [suiteReport, setSuiteReport] = useState<SuiteComparisonReport | null>(null);
    const [healthReport, setHealthReport] = useState<TestCaseHealthReport | null>(null);

    // Sync URL params when state changes
    useEffect(() => {
        const params: Record<string, string> = { range: dateRange, groupBy };
        if (dateRange === 'custom') {
            params.start = customRange.start;
            params.end = customRange.end;
        }
        setSearchParams(params, { replace: true });
    }, [dateRange, customRange, groupBy, setSearchParams]);

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
            };

            // Fetch reports in parallel
            const [summary, trends, suites, health] = await Promise.all([
                reportingApi.getProjectSummary(activeProject, params),
                reportingApi.getTrendReport(activeProject, { ...params, groupBy }),
                reportingApi.getSuiteComparison(activeProject, params),
                reportingApi.getTestCaseHealth(activeProject, params),
            ]);

            setSummaryReport(summary);
            setTrendReport(trends);
            setSuiteReport(suites);
            setHealthReport(health);
        } catch (error: unknown) {
            const message = (error as { message?: string })?.message || 'Failed to load reports';
            toast.error(message);
            console.error('Error fetching reports:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeProject, dateRange, groupBy, getDateRange]);

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
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-auto sm:h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sm:sticky sm:top-0 sm:z-20">
                <div className="flex items-center justify-between mb-3">
                    <ContextBreadcrumb showSuiteSelector={false} />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchReports}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            title="Refresh"
                        >
                            <Activity className="w-5 h-5" />
                        </button>
                        <button
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            title="Export Report"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
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
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4">
                <div className="flex gap-4">
                    {[
                        { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
                        { id: 'trends' as const, label: 'Trends', icon: TrendingUp },
                        { id: 'suites' as const, label: 'Suites', icon: Target },
                        { id: 'health' as const, label: 'Test Health', icon: Activity },
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
                    <HealthTab healthReport={healthReport} />
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
    // Prepare data for pie chart
    const pieData = [
        { name: 'Passed', value: summaryReport.overallStats.totalPassed, color: COLORS.passed },
        { name: 'Failed', value: summaryReport.overallStats.totalFailed, color: COLORS.failed },
        { name: 'Blocked', value: summaryReport.overallStats.totalBlocked, color: COLORS.blocked },
        { name: 'Skipped', value: summaryReport.overallStats.totalSkipped, color: COLORS.skipped },
    ].filter(item => item.value > 0);

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
                    value={`${summaryReport.overallStats.averagePassRate.toFixed(1)}%`}
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
                {/* Pass Rate Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Test Results Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Pass Rate Trend */}
                {trendReport && trendReport.dataPoints.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Pass Rate Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendReport.dataPoints}>
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
                                    dataKey="passRate"
                                    stroke={COLORS.primary}
                                    strokeWidth={2}
                                    dot={{ fill: COLORS.primary, r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

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
                                {summaryReport.suiteBreakdown.map((suite) => (
                                    <tr key={suite.suiteId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{suite.suiteName}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suite.totalRuns}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suite.totalTests}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                suite.averagePassRate >= 80
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : suite.averagePassRate >= 60
                                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            }`}>
                                                {suite.averagePassRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                                            {formatDuration(suite.averageDuration)}
                                        </td>
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

// Trends Tab Component
const TrendsTab: React.FC<{ trendReport: TrendReport }> = ({ trendReport }) => {
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
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{trendReport.summary.averagePassRate}%</div>
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
                    <LineChart data={trendReport.dataPoints}>
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
                            dataKey="passRate"
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
        passRate: suite.passRate,
        failureRate: suite.failureRate,
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
                                <tr key={suite.suiteId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">{suite.suiteName}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suite.totalRuns}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suite.totalTests}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            suite.passRate >= 80
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : suite.passRate >= 60
                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        }`}>
                                            {suite.passRate.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">{suite.failureRate.toFixed(1)}%</td>
                                    <td className="py-3 px-4 text-center">
                                        {suite.trend === 'improving' && <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" />}
                                        {suite.trend === 'declining' && <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto" />}
                                        {suite.trend === 'stable' && <Minus className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-auto" />}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                                        {formatDuration(suite.averageDuration)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Health Tab Component
const HealthTab: React.FC<{ healthReport: TestCaseHealthReport }> = ({ healthReport }) => {
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
