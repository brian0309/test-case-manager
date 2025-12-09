import { TestRun } from '../../../models/testRun.model.js';
import { TestCase } from '../../../models/testCase.model.js';
import { TestSuite } from '../../../models/testSuite.model.js';
import { TestRunGroup } from '../../../models/testRunGroup.model.js';
import { Types } from 'mongoose';
import {
    ReportFilterParams,
    TrendReportParams,
    ProjectSummaryReport,
    TrendReport,
    TrendDataPoint,
    SuiteComparisonReport,
    SuiteComparisonItem,
    TestCaseHealthReport,
    FlakyTestItem,
    NeverExecutedTestItem,
    MostFailingTestItem,
    DetailedRunReport,
    SuiteBreakdownItem,
    GroupBreakdownItem,
    RecentActivityItem,
} from '../types/reporting.types.js';
import { TestRunStatus, RunItemStatus } from '../../../services/testRun/types/testRun.types.js';

/**
 * Reporting Service
 * Provides aggregation and analytics for test runs, suites, and test cases
 */
export class ReportingService {
    /**
     * Build date range filter for MongoDB queries
     */
    private buildDateFilter(startDate?: string, endDate?: string): { completedAt?: any } {
        const filter: { completedAt?: any } = {};
        
        if (startDate || endDate) {
            filter.completedAt = {};
            if (startDate) {
                filter.completedAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.completedAt.$lte = end;
            }
        }
        
        return filter;
    }

    /**
     * Build common filter for test runs
     */
    private buildRunFilter(projectId: string, params: ReportFilterParams): any {
        const filter: any = { projectId: new Types.ObjectId(projectId) };
        
        // Date range
        const dateFilter = this.buildDateFilter(params.startDate, params.endDate);
        if (dateFilter.completedAt) {
            filter.completedAt = dateFilter.completedAt;
        }
        
        // Suite filter
        if (params.suiteId) {
            filter.suiteId = new Types.ObjectId(params.suiteId);
        }
        
        // Group filter
        if (params.groupId) {
            filter.groupId = new Types.ObjectId(params.groupId);
        }
        
        // Environment filter
        if (params.environment) {
            filter.environment = params.environment;
        }
        
        // Tags filter
        if (params.tags && params.tags.length > 0) {
            filter.tags = { $in: params.tags };
        }
        
        // Status filter
        if (params.status) {
            filter.status = params.status;
        }
        
        return filter;
    }

    /**
     * Get project summary report
     */
    async getProjectSummary(projectId: string, params: ReportFilterParams): Promise<ProjectSummaryReport> {
        const filter = this.buildRunFilter(projectId, params);
        
        // Get all runs with basic aggregation
        const runs = await TestRun.find(filter)
            .populate('suiteId', 'name')
            .populate('groupId', 'name color')
            .sort({ completedAt: -1 })
            .lean();

        // Calculate overall statistics
        let totalTests = 0;
        let totalPassed = 0;
        let totalFailed = 0;
        let totalBlocked = 0;
        let totalSkipped = 0;
        let totalNotRun = 0;
        let totalDuration = 0;
        let completedRuns = 0;

        const statusCounts = {
            [TestRunStatus.Draft]: 0,
            [TestRunStatus.InProgress]: 0,
            [TestRunStatus.Completed]: 0,
            [TestRunStatus.Abandoned]: 0,
        };

        const suiteMap = new Map<string, any>();
        const groupMap = new Map<string, any>();

        runs.forEach(run => {
            statusCounts[run.status]++;
            
            if (run.status === TestRunStatus.Completed) {
                completedRuns++;
            }

            totalTests += run.resultsSummary.total;
            totalPassed += run.resultsSummary.passed;
            totalFailed += run.resultsSummary.failed;
            totalBlocked += run.resultsSummary.blocked;
            totalSkipped += run.resultsSummary.skipped;
            totalNotRun += run.resultsSummary.notRun;
            totalDuration += run.resultsSummary.totalTimeSpent;

            // Suite breakdown
            if (run.suiteId) {
                const suiteId = run.suiteId._id?.toString() || run.suiteId.toString();
                const suiteName = (run.suiteId as any).name || 'Unknown Suite';
                
                if (!suiteMap.has(suiteId)) {
                    suiteMap.set(suiteId, {
                        suiteId,
                        suiteName,
                        totalRuns: 0,
                        totalTests: 0,
                        totalPassed: 0,
                        totalFailed: 0,
                        totalDuration: 0,
                    });
                }
                
                const suite = suiteMap.get(suiteId);
                suite.totalRuns++;
                suite.totalTests += run.resultsSummary.total;
                suite.totalPassed += run.resultsSummary.passed;
                suite.totalFailed += run.resultsSummary.failed;
                suite.totalDuration += run.resultsSummary.totalTimeSpent;
            }

            // Group breakdown
            if (run.groupId) {
                const groupId = run.groupId._id?.toString() || run.groupId.toString();
                const groupName = (run.groupId as any).name || 'Unknown Group';
                const groupColor = (run.groupId as any).color || '#6B7280';
                
                if (!groupMap.has(groupId)) {
                    groupMap.set(groupId, {
                        groupId,
                        groupName,
                        groupColor,
                        totalRuns: 0,
                        totalTests: 0,
                        totalPassed: 0,
                    });
                }
                
                const group = groupMap.get(groupId);
                group.totalRuns++;
                group.totalTests += run.resultsSummary.total;
                group.totalPassed += run.resultsSummary.passed;
            }
        });

        // Calculate suite breakdown with averages
        const suiteBreakdown: SuiteBreakdownItem[] = Array.from(suiteMap.values()).map(suite => ({
            suiteId: suite.suiteId,
            suiteName: suite.suiteName,
            totalRuns: suite.totalRuns,
            averagePassRate: suite.totalTests > 0 ? (suite.totalPassed / suite.totalTests) * 100 : 0,
            totalTests: suite.totalTests,
            totalPassed: suite.totalPassed,
            totalFailed: suite.totalFailed,
            averageDuration: suite.totalRuns > 0 ? suite.totalDuration / suite.totalRuns : 0,
        }));

        // Calculate group breakdown with averages
        const groupBreakdown: GroupBreakdownItem[] = Array.from(groupMap.values()).map(group => ({
            groupId: group.groupId,
            groupName: group.groupName,
            groupColor: group.groupColor,
            totalRuns: group.totalRuns,
            averagePassRate: group.totalTests > 0 ? (group.totalPassed / group.totalTests) * 100 : 0,
            totalTests: group.totalTests,
        }));

        // Recent activity (last 10 completed runs)
        const recentActivity: RecentActivityItem[] = runs
            .filter(run => run.status === TestRunStatus.Completed)
            .slice(0, 10)
            .map(run => ({
                runId: run._id.toString(),
                title: run.title,
                status: run.status,
                completedAt: run.completedAt || null,
                passRate: run.resultsSummary.passRate,
                duration: run.resultsSummary.totalTimeSpent,
            }));

        // Determine date range
        const dateRange = {
            startDate: params.startDate || (runs.length > 0 && runs[runs.length - 1].createdAt ? runs[runs.length - 1].createdAt.toISOString() : new Date().toISOString()),
            endDate: params.endDate || new Date().toISOString(),
        };

        return {
            projectId,
            dateRange,
            totalRuns: runs.length,
            completedRuns,
            inProgressRuns: statusCounts[TestRunStatus.InProgress],
            draftRuns: statusCounts[TestRunStatus.Draft],
            abandonedRuns: statusCounts[TestRunStatus.Abandoned],
            overallStats: {
                totalTests,
                totalPassed,
                totalFailed,
                totalBlocked,
                totalSkipped,
                totalNotRun,
                averagePassRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
                averageDuration: completedRuns > 0 ? totalDuration / completedRuns : 0,
            },
            suiteBreakdown,
            groupBreakdown,
            recentActivity,
        };
    }

    /**
     * Get trend report (time-series data)
     */
    async getTrendReport(projectId: string, params: TrendReportParams): Promise<TrendReport> {
        const filter = this.buildRunFilter(projectId, params);
        filter.status = TestRunStatus.Completed; // Only completed runs for trends

        // Set default date range if not provided (last 30 days)
        const endDate = params.endDate ? new Date(params.endDate) : new Date();
        const startDate = params.startDate ? new Date(params.startDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        filter.completedAt = {
            $gte: startDate,
            $lte: endDate,
        };

        // Determine grouping format based on groupBy parameter
        let dateFormat: any;
        let periodFormat: string;
        
        switch (params.groupBy) {
            case 'day':
                dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } };
                periodFormat = '%b %-d';
                break;
            case 'week':
                dateFormat = {
                    $dateToString: {
                        format: '%Y-W%V',
                        date: '$completedAt',
                    },
                };
                periodFormat = 'Week %V';
                break;
            case 'month':
                dateFormat = { $dateToString: { format: '%Y-%m', date: '$completedAt' } };
                periodFormat = '%B %Y';
                break;
            default:
                dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } };
                periodFormat = '%b %-d';
        }

        const aggregation = await TestRun.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: dateFormat,
                    runsCompleted: { $sum: 1 },
                    totalTests: { $sum: '$resultsSummary.total' },
                    passed: { $sum: '$resultsSummary.passed' },
                    failed: { $sum: '$resultsSummary.failed' },
                    blocked: { $sum: '$resultsSummary.blocked' },
                    skipped: { $sum: '$resultsSummary.skipped' },
                    totalDuration: { $sum: '$resultsSummary.totalTime' },
                    firstDate: { $min: '$completedAt' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const dataPoints: TrendDataPoint[] = aggregation.map(item => {
            const passRate = item.totalTests > 0 ? (item.passed / item.totalTests) * 100 : 0;
            const averageDuration = item.runsCompleted > 0 ? item.totalDuration / item.runsCompleted : 0;

            return {
                period: item._id,
                periodLabel: this.formatPeriodLabel(item.firstDate, params.groupBy),
                runsCompleted: item.runsCompleted,
                totalTests: item.totalTests,
                passed: item.passed,
                failed: item.failed,
                blocked: item.blocked,
                skipped: item.skipped,
                passRate: Math.round(passRate * 10) / 10,
                averageDuration: Math.round(averageDuration),
            };
        });

        // Calculate summary and trend direction
        const totalRuns = dataPoints.reduce((sum, dp) => sum + dp.runsCompleted, 0);
        const averagePassRate = dataPoints.length > 0
            ? dataPoints.reduce((sum, dp) => sum + dp.passRate, 0) / dataPoints.length
            : 0;

        let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
        let changePercentage = 0;

        if (dataPoints.length >= 2) {
            const firstHalf = dataPoints.slice(0, Math.ceil(dataPoints.length / 2));
            const secondHalf = dataPoints.slice(Math.ceil(dataPoints.length / 2));
            
            const firstHalfAvg = firstHalf.reduce((sum, dp) => sum + dp.passRate, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((sum, dp) => sum + dp.passRate, 0) / secondHalf.length;
            
            changePercentage = secondHalfAvg - firstHalfAvg;
            
            if (changePercentage > 2) {
                trendDirection = 'improving';
            } else if (changePercentage < -2) {
                trendDirection = 'declining';
            }
        }

        return {
            projectId,
            dateRange: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            groupBy: params.groupBy,
            dataPoints,
            summary: {
                totalRuns,
                averagePassRate: Math.round(averagePassRate * 10) / 10,
                trendDirection,
                changePercentage: Math.round(changePercentage * 10) / 10,
            },
        };
    }

    /**
     * Format period label for display
     */
    private formatPeriodLabel(date: Date, groupBy: 'day' | 'week' | 'month'): string {
        const d = new Date(date);
        
        switch (groupBy) {
            case 'day':
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            case 'week':
                const weekNum = this.getWeekNumber(d);
                return `Week ${weekNum}`;
            case 'month':
                return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            default:
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    /**
     * Get ISO week number
     */
    private getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    /**
     * Get suite comparison report
     */
    async getSuiteComparison(projectId: string, params: ReportFilterParams): Promise<SuiteComparisonReport> {
        const filter = this.buildRunFilter(projectId, params);
        filter.status = TestRunStatus.Completed;

        const runs = await TestRun.find(filter)
            .populate('suiteId', 'name')
            .sort({ completedAt: -1 })
            .lean();

        const suiteMap = new Map<string, any>();

        runs.forEach(run => {
            if (!run.suiteId) return;

            const suiteId = run.suiteId._id?.toString() || run.suiteId.toString();
            const suiteName = (run.suiteId as any).name || 'Unknown Suite';

            if (!suiteMap.has(suiteId)) {
                suiteMap.set(suiteId, {
                    suiteId,
                    suiteName,
                    runs: [],
                    totalRuns: 0,
                    totalTests: 0,
                    passed: 0,
                    failed: 0,
                    blocked: 0,
                    skipped: 0,
                    totalDuration: 0,
                });
            }

            const suite = suiteMap.get(suiteId);
            suite.runs.push({
                passRate: run.resultsSummary.passRate,
                completedAt: run.completedAt,
            });
            suite.totalRuns++;
            suite.totalTests += run.resultsSummary.total;
            suite.passed += run.resultsSummary.passed;
            suite.failed += run.resultsSummary.failed;
            suite.blocked += run.resultsSummary.blocked;
            suite.skipped += run.resultsSummary.skipped;
            suite.totalDuration += run.resultsSummary.totalTimeSpent;
        });

        const suites: SuiteComparisonItem[] = Array.from(suiteMap.values()).map(suite => {
            const passRate = suite.totalTests > 0 ? (suite.passed / suite.totalTests) * 100 : 0;
            const failureRate = suite.totalTests > 0 ? (suite.failed / suite.totalTests) * 100 : 0;
            const averageDuration = suite.totalRuns > 0 ? suite.totalDuration / suite.totalRuns : 0;

            // Calculate trend
            let trend: 'improving' | 'declining' | 'stable' = 'stable';
            if (suite.runs.length >= 2) {
                const recentRuns = suite.runs.slice(0, Math.min(5, suite.runs.length));
                const olderRuns = suite.runs.slice(Math.min(5, suite.runs.length));

                if (olderRuns.length > 0) {
                    const recentAvg = recentRuns.reduce((sum: number, r: any) => sum + r.passRate, 0) / recentRuns.length;
                    const olderAvg = olderRuns.reduce((sum: number, r: any) => sum + r.passRate, 0) / olderRuns.length;

                    if (recentAvg > olderAvg + 2) trend = 'improving';
                    else if (recentAvg < olderAvg - 2) trend = 'declining';
                }
            }

            return {
                suiteId: suite.suiteId,
                suiteName: suite.suiteName,
                totalRuns: suite.totalRuns,
                totalTests: suite.totalTests,
                passed: suite.passed,
                failed: suite.failed,
                blocked: suite.blocked,
                skipped: suite.skipped,
                passRate: Math.round(passRate * 10) / 10,
                averageDuration: Math.round(averageDuration),
                trend,
                failureRate: Math.round(failureRate * 10) / 10,
            };
        });

        const dateRange = {
            startDate: params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: params.endDate || new Date().toISOString(),
        };

        return {
            projectId,
            dateRange,
            suites: suites.sort((a, b) => b.totalRuns - a.totalRuns),
        };
    }

    /**
     * Get test case health report
     */
    async getTestCaseHealth(projectId: string, params: ReportFilterParams): Promise<TestCaseHealthReport> {
        const filter = this.buildRunFilter(projectId, params);

        // Get all completed runs with items
        const runs = await TestRun.find(filter)
            .select('items')
            .lean();

        // Map to track test case executions
        const caseExecutionMap = new Map<string, any>();

        runs.forEach(run => {
            run.items.forEach(item => {
                const caseId = item.caseId.toString();

                if (!caseExecutionMap.has(caseId)) {
                    caseExecutionMap.set(caseId, {
                        caseId,
                        title: item.caseSnapshot.title,
                        suite: 'Unknown',
                        executions: [],
                    });
                }

                caseExecutionMap.get(caseId).executions.push({
                    status: item.status,
                    executedAt: item.executedAt,
                });
            });
        });

        // Calculate flaky tests
        const flakyTests: FlakyTestItem[] = [];
        const mostFailingTests: MostFailingTestItem[] = [];

        caseExecutionMap.forEach(caseData => {
            const executions = caseData.executions;
            if (executions.length < 3) return; // Need at least 3 executions to determine flakiness

            const passCount = executions.filter((e: any) => e.status === RunItemStatus.Passed).length;
            const failCount = executions.filter((e: any) => e.status === RunItemStatus.Failed).length;
            const totalCount = executions.length;

            // Flaky score: tests that alternate between pass/fail
            let transitions = 0;
            for (let i = 1; i < executions.length; i++) {
                const prev = executions[i - 1].status;
                const curr = executions[i].status;
                if ((prev === RunItemStatus.Passed && curr === RunItemStatus.Failed) ||
                    (prev === RunItemStatus.Failed && curr === RunItemStatus.Passed)) {
                    transitions++;
                }
            }

            const flakyScore = totalCount > 1 ? (transitions / (totalCount - 1)) * 100 : 0;

            if (flakyScore > 30 && passCount > 0 && failCount > 0) {
                flakyTests.push({
                    caseId: caseData.caseId,
                    title: caseData.title,
                    suite: caseData.suite,
                    executionCount: totalCount,
                    passCount,
                    failCount,
                    flakyScore: Math.round(flakyScore),
                    recentResults: executions.slice(0, 10).map((e: any) => e.status),
                });
            }

            // Most failing tests
            const failureRate = totalCount > 0 ? (failCount / totalCount) * 100 : 0;
            if (failureRate > 30 && failCount >= 3) {
                const sortedExecutions = executions
                    .filter((e: any) => e.status === RunItemStatus.Failed && e.executedAt)
                    .sort((a: any, b: any) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());

                mostFailingTests.push({
                    caseId: caseData.caseId,
                    title: caseData.title,
                    suite: caseData.suite,
                    executionCount: totalCount,
                    failCount,
                    failureRate: Math.round(failureRate * 10) / 10,
                    lastFailedAt: sortedExecutions.length > 0 ? sortedExecutions[0].executedAt : null,
                });
            }
        });

        // Get never executed tests
        const allCases = await TestCase.find({ projectId: new Types.ObjectId(projectId) })
            .select('_id title suite createdAt')
            .lean();

        const executedCaseIds = new Set(caseExecutionMap.keys());
        const neverExecutedTests: NeverExecutedTestItem[] = allCases
            .filter(tc => !executedCaseIds.has(tc._id.toString()))
            .map(tc => {
                const createdAt = new Date(tc.createdAt);
                const now = new Date();
                const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    caseId: tc._id.toString(),
                    title: tc.title,
                    suite: 'Unknown',
                    createdAt,
                    daysSinceCreation,
                };
            });

        const dateRange = {
            startDate: params.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: params.endDate || new Date().toISOString(),
        };

        return {
            projectId,
            dateRange,
            flakyTests: flakyTests.sort((a, b) => b.flakyScore - a.flakyScore).slice(0, 20),
            neverExecutedTests: neverExecutedTests.slice(0, 50),
            mostFailingTests: mostFailingTests.sort((a, b) => b.failureRate - a.failureRate).slice(0, 20),
            summary: {
                totalUniqueCases: allCases.length,
                flakyCount: flakyTests.length,
                neverExecutedCount: neverExecutedTests.length,
                highFailureCount: mostFailingTests.length,
            },
        };
    }

    /**
     * Get detailed run report
     */
    async getDetailedRunReport(runId: string): Promise<DetailedRunReport> {
        const run = await TestRun.findById(runId)
            .populate('suiteId', 'name')
            .populate('groupId', 'name color')
            .populate('createdBy', 'name')
            .populate('items.executedBy', 'name')
            .lean();

        if (!run) {
            throw new Error('Test run not found');
        }

        const items = run.items.map(item => ({
            itemId: item._id?.toString() || '',
            caseId: item.caseId.toString(),
            title: item.caseSnapshot.title,
            status: item.status,
            executedBy: (item.executedBy as any)?.name || null,
            executedAt: item.executedAt || null,
            timeSpent: item.timeSpent || 0,
            actualResult: item.actualResult || '',
        }));

        // Build timeline
        const timeline: any[] = [
            {
                timestamp: run.createdAt,
                action: 'created',
                user: (run.createdBy as any)?.name || 'Unknown',
                details: `Test run "${run.title}" created`,
            },
        ];

        if (run.status === TestRunStatus.InProgress || run.status === TestRunStatus.Completed) {
            const firstExecution = run.items.find(i => i.executedAt);
            if (firstExecution) {
                timeline.push({
                    timestamp: firstExecution.executedAt,
                    action: 'started',
                    user: (firstExecution.executedBy as any)?.name || 'Unknown',
                    details: 'Test execution started',
                });
            }
        }

        if (run.status === TestRunStatus.Completed && run.completedAt) {
            timeline.push({
                timestamp: run.completedAt,
                action: 'completed',
                user: (run.createdBy as any)?.name || 'Unknown',
                details: `Test run completed with ${run.resultsSummary.passRate}% pass rate`,
            });
        }

        if (run.status === TestRunStatus.Abandoned) {
            timeline.push({
                timestamp: run.updatedAt,
                action: 'abandoned',
                user: (run.createdBy as any)?.name || 'Unknown',
                details: 'Test run abandoned',
            });
        }

        return {
            runId: run._id.toString(),
            title: run.title,
            description: run.description || '',
            status: run.status,
            createdAt: run.createdAt,
            completedAt: run.completedAt || null,
            createdBy: (run.createdBy as any)?.name || 'Unknown',
            suite: run.suiteId ? {
                id: run.suiteId._id?.toString() || run.suiteId.toString(),
                name: (run.suiteId as any).name || 'Unknown Suite',
            } : null,
            group: run.groupId ? {
                id: run.groupId._id?.toString() || run.groupId.toString(),
                name: (run.groupId as any).name || 'Unknown Group',
                color: (run.groupId as any).color || '#6B7280',
            } : null,
            environment: run.environment || '',
            tags: run.tags || [],
            duration: run.resultsSummary.totalTimeSpent,
            statistics: {
                total: run.resultsSummary.total,
                passed: run.resultsSummary.passed,
                failed: run.resultsSummary.failed,
                blocked: run.resultsSummary.blocked,
                skipped: run.resultsSummary.skipped,
                notRun: run.resultsSummary.notRun,
                passRate: run.resultsSummary.passRate,
            },
            items,
            timeline: timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        };
    }
}

export default new ReportingService();
