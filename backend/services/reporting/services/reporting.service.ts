import { TestRun } from '../../../models/testRun.model.js';
import { TestCase } from '../../../models/testCase.model.js';
import { TestSuite } from '../../../models/testSuite.model.js';
import { Ticket } from '../../../models/ticket.model.js';
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
    FailedRunCaseItem,
    DetailedRunReport,
    SuiteBreakdownItem,
    GroupBreakdownItem,
    RecentActivityItem,
    TicketMetricsFilterParams,
    TicketMetricsReport,
    TicketTriageSegment,
    TicketReturnReasonStat,
    TicketTriageDataPoint,
} from '../types/reporting.types.js';
import { TestRunStatus, RunItemStatus } from '../../../services/testRun/types/testRun.types.js';
import { FailureType } from '../../../services/ticket/types/ticket.types.js';

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
        
        // Get all runs with items for accurate suite breakdown
        const runs = await TestRun.find(filter)
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

        const groupMap = new Map<string, any>();

        // Collect all unique caseIds from all runs for suite breakdown
        const allCaseIds = new Set<string>();
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

            // Collect case IDs for suite breakdown
            run.items?.forEach(item => {
                allCaseIds.add(item.caseId.toString());
            });

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

        // Fetch test cases with their suite information for accurate breakdown
        const testCases = await TestCase.find({
            _id: { $in: Array.from(allCaseIds).map(id => new Types.ObjectId(id)) }
        })
            .select('_id suiteId')
            .lean();

        // Create a map of caseId -> suiteId
        const caseToSuiteMap = new Map<string, string>();
        testCases.forEach(tc => {
            caseToSuiteMap.set(tc._id.toString(), tc.suiteId.toString());
        });

        // Fetch all suites for the project to get their names
        const suites = await TestSuite.find({
            projectId: new Types.ObjectId(projectId)
        })
            .select('_id name')
            .lean();

        // Create a map of suiteId -> suiteName
        const suiteNameMap = new Map<string, string>();
        suites.forEach(suite => {
            suiteNameMap.set(suite._id.toString(), suite.name);
        });

        // Calculate suite breakdown based on actual test case suites
        const suiteMap = new Map<string, any>();
        runs.forEach(run => {
            run.items?.forEach(item => {
                const caseId = item.caseId.toString();
                const suiteId = caseToSuiteMap.get(caseId);
                
                if (!suiteId) return;

                const suiteName = suiteNameMap.get(suiteId) || 'Unknown Suite';
                
                if (!suiteMap.has(suiteId)) {
                    suiteMap.set(suiteId, {
                        suiteId,
                        suiteName,
                        runIds: new Set(),
                        totalTests: 0,
                        totalPassed: 0,
                        totalFailed: 0,
                        totalDuration: 0,
                    });
                }
                
                const suite = suiteMap.get(suiteId);
                suite.runIds.add(run._id.toString());
                suite.totalTests++;
                if (item.status === RunItemStatus.Passed) {
                    suite.totalPassed++;
                } else if (item.status === RunItemStatus.Failed) {
                    suite.totalFailed++;
                }
                suite.totalDuration += item.timeSpent || 0;
            });
        });

        // Calculate suite breakdown with averages
        const suiteBreakdown: SuiteBreakdownItem[] = Array.from(suiteMap.values()).map(suite => ({
            suiteId: suite.suiteId,
            suiteName: suite.suiteName,
            totalRuns: suite.runIds.size,
            averagePassRate: suite.totalTests > 0 ? (suite.totalPassed / suite.totalTests) * 100 : 0,
            totalTests: suite.totalTests,
            totalPassed: suite.totalPassed,
            totalFailed: suite.totalFailed,
            averageDuration: suite.runIds.size > 0 ? suite.totalDuration / suite.runIds.size : 0,
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
        let dateFormat: unknown;
        
        switch (params.groupBy) {
            case 'day':
                dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } };
                break;
            case 'week':
                dateFormat = {
                    $dateToString: {
                        format: '%Y-W%V',
                        date: '$completedAt',
                    },
                };
                break;
            case 'month':
                dateFormat = { $dateToString: { format: '%Y-%m', date: '$completedAt' } };
                break;
            default:
                dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } };
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
            case 'week': {
                const weekNum = this.getWeekNumber(d);
                return `Week ${weekNum}`;
            }
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
     * This method aggregates test results by the actual suite each test case belongs to,
     * rather than by the run's suite assignment. This provides accurate metrics when
     * test runs contain test cases from multiple suites.
     */
    async getSuiteComparison(projectId: string, params: ReportFilterParams): Promise<SuiteComparisonReport> {
        const filter = this.buildRunFilter(projectId, params);
        filter.status = TestRunStatus.Completed;

        // Get all completed runs with their items
        const runs = await TestRun.find(filter)
            .select('items resultsSummary completedAt')
            .sort({ completedAt: -1 })
            .lean();

        // Collect all unique caseIds from all runs
        const allCaseIds = new Set<string>();
        runs.forEach(run => {
            run.items.forEach(item => {
                allCaseIds.add(item.caseId.toString());
            });
        });

        // Fetch test cases with their suite information
        const testCases = await TestCase.find({
            _id: { $in: Array.from(allCaseIds).map(id => new Types.ObjectId(id)) }
        })
            .select('_id suiteId')
            .lean();

        // Create a map of caseId -> suiteId
        const caseToSuiteMap = new Map<string, string>();
        testCases.forEach(tc => {
            caseToSuiteMap.set(tc._id.toString(), tc.suiteId.toString());
        });

        // Fetch all suites for the project to get their names
        const suites = await TestSuite.find({
            projectId: new Types.ObjectId(projectId)
        })
            .select('_id name')
            .lean();

        // Create a map of suiteId -> suiteName
        const suiteNameMap = new Map<string, string>();
        suites.forEach(suite => {
            suiteNameMap.set(suite._id.toString(), suite.name);
        });

        // Aggregate results by actual suite
        const suiteMap = new Map<string, any>();

        runs.forEach(run => {
            // Track which suites were involved in this run for trend calculation
            const suitesInRun = new Map<string, { passed: number; total: number }>();

            run.items.forEach(item => {
                const caseId = item.caseId.toString();
                const suiteId = caseToSuiteMap.get(caseId);
                
                if (!suiteId) return; // Skip if case no longer exists

                const suiteName = suiteNameMap.get(suiteId) || 'Unknown Suite';

                if (!suiteMap.has(suiteId)) {
                    suiteMap.set(suiteId, {
                        suiteId,
                        suiteName,
                        runSnapshots: [], // For trend calculation
                        totalExecutions: 0, // Total individual test case executions
                        passed: 0,
                        failed: 0,
                        blocked: 0,
                        skipped: 0,
                        notRun: 0,
                        totalDuration: 0,
                        runIds: new Set(), // Track unique runs that included this suite's tests
                    });
                }

                const suite = suiteMap.get(suiteId);
                
                // Count results based on individual test case status
                suite.totalExecutions++;
                switch (item.status) {
                    case RunItemStatus.Passed:
                        suite.passed++;
                        break;
                    case RunItemStatus.Failed:
                        suite.failed++;
                        break;
                    case RunItemStatus.Blocked:
                        suite.blocked++;
                        break;
                    case RunItemStatus.Skipped:
                        suite.skipped++;
                        break;
                    case RunItemStatus.NotRun:
                        suite.notRun++;
                        break;
                }
                
                suite.totalDuration += item.timeSpent || 0;
                suite.runIds.add(run._id.toString());

                // Track per-run stats for this suite
                if (!suitesInRun.has(suiteId)) {
                    suitesInRun.set(suiteId, { passed: 0, total: 0 });
                }
                const runSuiteStats = suitesInRun.get(suiteId)!;
                runSuiteStats.total++;
                if (item.status === RunItemStatus.Passed) {
                    runSuiteStats.passed++;
                }
            });

            // Store run-level pass rates per suite for trend calculation
            suitesInRun.forEach((stats, suiteId) => {
                const suite = suiteMap.get(suiteId);
                if (suite && stats.total > 0) {
                    suite.runSnapshots.push({
                        passRate: (stats.passed / stats.total) * 100,
                        completedAt: run.completedAt,
                    });
                }
            });
        });

        // Calculate final metrics for each suite
        const suitesResult: SuiteComparisonItem[] = Array.from(suiteMap.values()).map(suite => {
            const executedTests = suite.totalExecutions - suite.notRun;
            const passRate = executedTests > 0 ? (suite.passed / executedTests) * 100 : 0;
            const failureRate = executedTests > 0 ? (suite.failed / executedTests) * 100 : 0;
            const totalRuns = suite.runIds.size;
            const averageDuration = totalRuns > 0 ? suite.totalDuration / totalRuns : 0;

            // Calculate trend based on recent run snapshots
            let trend: 'improving' | 'declining' | 'stable' = 'stable';
            const snapshots = suite.runSnapshots.sort((a: any, b: any) => 
                new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            );
            
            if (snapshots.length >= 2) {
                const recentSnapshots = snapshots.slice(0, Math.min(5, Math.ceil(snapshots.length / 2)));
                const olderSnapshots = snapshots.slice(Math.min(5, Math.ceil(snapshots.length / 2)));

                if (olderSnapshots.length > 0) {
                    const recentAvg = recentSnapshots.reduce((sum: number, r: any) => sum + r.passRate, 0) / recentSnapshots.length;
                    const olderAvg = olderSnapshots.reduce((sum: number, r: any) => sum + r.passRate, 0) / olderSnapshots.length;

                    if (recentAvg > olderAvg + 2) trend = 'improving';
                    else if (recentAvg < olderAvg - 2) trend = 'declining';
                }
            }

            return {
                suiteId: suite.suiteId,
                suiteName: suite.suiteName,
                totalRuns,
                totalTests: suite.totalExecutions,
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
            suites: suitesResult.sort((a, b) => b.totalRuns - a.totalRuns),
        };
    }

    /**
     * Get test case health report
     */
    async getTestCaseHealth(projectId: string, params: ReportFilterParams): Promise<TestCaseHealthReport> {
        const filter = this.buildRunFilter(projectId, params);

        // Get all completed runs with items
        const runs = await TestRun.find(filter)
            .select('title suiteId items')
            .lean();

        const failedRunCases: FailedRunCaseItem[] = [];

        // Collect all unique caseIds from runs
        const allCaseIds = new Set<string>();
        runs.forEach(run => {
            run.items.forEach(item => {
                allCaseIds.add(item.caseId.toString());
            });
        });

        // Fetch test cases with their suite information
        const testCasesForSuites = await TestCase.find({
            _id: { $in: Array.from(allCaseIds).map(id => new Types.ObjectId(id)) }
        })
            .select('_id suiteId')
            .lean();

        // Create a map of caseId -> suiteId
        const caseToSuiteMap = new Map<string, string>();
        testCasesForSuites.forEach(tc => {
            caseToSuiteMap.set(tc._id.toString(), tc.suiteId.toString());
        });

        // Fetch all suites for the project to get their names
        const suitesForNames = await TestSuite.find({
            projectId: new Types.ObjectId(projectId)
        })
            .select('_id name')
            .lean();

        // Create a map of suiteId -> suiteName
        const suiteNameMap = new Map<string, string>();
        suitesForNames.forEach(suite => {
            suiteNameMap.set(suite._id.toString(), suite.name);
        });

        // Map to track test case executions
        const caseExecutionMap = new Map<string, any>();

        runs.forEach(run => {
            run.items.forEach(item => {
                const caseId = item.caseId.toString();
                const suiteId = caseToSuiteMap.get(caseId);
                const suiteName = suiteId ? (suiteNameMap.get(suiteId) || 'Unknown') : 'Unknown';

                if (item.status === RunItemStatus.Failed) {
                    failedRunCases.push({
                        runId: run._id.toString(),
                        runName: run.title,
                        itemId: item._id?.toString() || '',
                        caseId,
                        testCaseName: item.caseSnapshot.title,
                        testSuite: suiteName,
                        area: item.caseSnapshot.area || 'Unassigned',
                        failedAt: item.executedAt || null,
                    });
                }

                if (!caseExecutionMap.has(caseId)) {
                    caseExecutionMap.set(caseId, {
                        caseId,
                        title: item.caseSnapshot.title,
                        suite: suiteName,
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

        // Get never executed tests (with suite information)
        const allCases = await TestCase.find({ projectId: new Types.ObjectId(projectId) })
            .select('_id title suiteId createdAt')
            .lean();

        const executedCaseIds = new Set(caseExecutionMap.keys());
        const neverExecutedTests: NeverExecutedTestItem[] = allCases
            .filter(tc => !executedCaseIds.has(tc._id.toString()))
            .map(tc => {
                const createdAt = new Date(tc.createdAt);
                const now = new Date();
                const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
                const suiteName = tc.suiteId ? (suiteNameMap.get(tc.suiteId.toString()) || 'Unknown') : 'Unknown';

                return {
                    caseId: tc._id.toString(),
                    title: tc.title,
                    suite: suiteName,
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
            failedRunCases: failedRunCases
                .sort((a, b) => {
                    const aTime = a.failedAt ? new Date(a.failedAt).getTime() : 0;
                    const bTime = b.failedAt ? new Date(b.failedAt).getTime() : 0;
                    return bTime - aTime;
                })
                .slice(0, 100),
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

    /**
     * Build a filter for ticket triage metrics queries
     */
    private buildTicketFilter(projectId: string, params: TicketMetricsFilterParams): any {
        const filter: any = { projectId: new Types.ObjectId(projectId) };

        if (params.startDate || params.endDate) {
            filter.createdAt = {};
            if (params.startDate) {
                filter.createdAt.$gte = new Date(params.startDate);
            }
            if (params.endDate) {
                const end = new Date(params.endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        if (params.failureType) {
            filter.failureType = params.failureType;
        }

        if (params.team) {
            filter.team = params.team;
        }

        if (params.status) {
            filter.status = params.status;
        }

        if (params.severity) {
            filter.severity = params.severity;
        }

        if (params.priority) {
            filter.priority = params.priority;
        }

        return filter;
    }

    /**
     * Compute time-to-reproduce stats (hours) from a list of ticket docs.
     * TTR is measured from failure time (run item executedAt, captured at
     * ticket creation) to firstReproducedAt. Tickets without a reproduction
     * are excluded from TTR stats but still count toward created totals.
     */
    private buildTtrStats(tickets: any[]): { median: number | null; avg: number | null; p75: number | null } {
        const ttrs: number[] = [];

        for (const t of tickets) {
            if (!t.firstReproducedAt) continue;
            const failureTime = t.failureAt ? new Date(t.failureAt).getTime() : new Date(t.createdAt).getTime();
            const reproducedTime = new Date(t.firstReproducedAt).getTime();
            const hours = (reproducedTime - failureTime) / (1000 * 60 * 60);
            if (hours >= 0) {
                ttrs.push(hours);
            }
        }

        if (ttrs.length === 0) {
            return { median: null, avg: null, p75: null };
        }

        ttrs.sort((a, b) => a - b);
        const percentile = (p: number): number => {
            const idx = Math.min(ttrs.length - 1, Math.floor((p / 100) * ttrs.length));
            return Math.round(ttrs[idx] * 10) / 10;
        };
        const avg = ttrs.reduce((sum, v) => sum + v, 0) / ttrs.length;

        return {
            median: percentile(50),
            avg: Math.round(avg * 10) / 10,
            p75: percentile(75),
        };
    }

    /**
     * Build a triage segment (stats for one failure type / team bucket)
     */
    private buildTriageSegment(key: string, label: string, tickets: any[]): TicketTriageSegment {
        const ttr = this.buildTtrStats(tickets);
        const reproduced = tickets.filter((t) => t.firstReproducedAt).length;
        const returned = tickets.filter((t) => (t.returnedCount || 0) > 0).length;

        return {
            key,
            label,
            ticketsCreated: tickets.length,
            ticketsReproduced: reproduced,
            reproductionRate: tickets.length > 0 ? Math.round((reproduced / tickets.length) * 1000) / 10 : 0,
            timeToReproduceMedianHours: ttr.median,
            timeToReproduceAvgHours: ttr.avg,
            timeToReproduceP75Hours: ttr.p75,
            returnedCount: returned,
            returnedRate: tickets.length > 0 ? Math.round((returned / tickets.length) * 1000) / 10 : 0,
        };
    }

    /**
     * Get ticket triage metrics: time-to-reproduce, % returned for missing
     * context, segmented by failure type and team.
     */
    async getTicketMetrics(projectId: string, params: TicketMetricsFilterParams): Promise<TicketMetricsReport> {
        const filter = this.buildTicketFilter(projectId, params);
        const groupBy = params.groupBy || 'day';

        const tickets = await Ticket.find(filter)
            .select('failureType team status severity priority createdAt failureAt firstReproducedAt returnedCount lastReturnedAt lastReturnReason')
            .sort({ createdAt: -1 })
            .lean();

        const kpiTtr = this.buildTtrStats(tickets);
        const reproducedCount = tickets.filter((t) => t.firstReproducedAt).length;
        const returnedCount = tickets.filter((t) => (t.returnedCount || 0) > 0).length;

        // Segment by failure type
        const byFailureType: TicketTriageSegment[] = [];
        const failureTypeValues = Object.values(FailureType);
        for (const ft of failureTypeValues) {
            const bucket = tickets.filter((t) => t.failureType === ft);
            if (bucket.length === 0) continue;
            byFailureType.push(this.buildTriageSegment(ft, ft, bucket));
        }
        const noTypeBucket = tickets.filter((t) => !t.failureType);
        if (noTypeBucket.length > 0) {
            byFailureType.push(this.buildTriageSegment('Unspecified', 'Unspecified', noTypeBucket));
        }
        byFailureType.sort((a, b) => b.ticketsCreated - a.ticketsCreated);

        // Segment by team
        const byTeamMap = new Map<string, any[]>();
        for (const t of tickets) {
            const key = (t.team || '').trim() || 'Unspecified';
            if (!byTeamMap.has(key)) byTeamMap.set(key, []);
            byTeamMap.get(key)!.push(t);
        }
        const byTeam: TicketTriageSegment[] = Array.from(byTeamMap.entries())
            .map(([key, bucket]) => this.buildTriageSegment(key, key, bucket))
            .sort((a, b) => b.ticketsCreated - a.ticketsCreated);

        // Returns by reason
        const reasonMap = new Map<string, number>();
        for (const t of tickets) {
            if (!t.lastReturnReason) continue;
            reasonMap.set(t.lastReturnReason, (reasonMap.get(t.lastReturnReason) || 0) + 1);
        }
        const returnsByReason: TicketReturnReasonStat[] = Array.from(reasonMap.entries())
            .map(([reason, count]) => ({ reason: reason as TicketReturnReasonStat['reason'], count }))
            .sort((a, b) => b.count - a.count);

        // Trend series
        const dateFormatMap: Record<string, unknown> = {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            week: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        };
        const matchCreated = { ...filter };
        const matchReproduced = { ...filter, firstReproducedAt: { $exists: true, $ne: null } };
        const matchReturned = { ...filter, lastReturnedAt: { $exists: true, $ne: null } };

        const [createdAgg, reproducedAgg, returnedAgg] = await Promise.all([
            Ticket.aggregate([
                { $match: matchCreated },
                { $group: { _id: dateFormatMap[groupBy], count: { $sum: 1 }, firstDate: { $min: '$createdAt' } } },
                { $sort: { _id: 1 } },
            ]),
            Ticket.aggregate([
                { $match: matchReproduced },
                { $group: { _id: { $dateToString: { format: (dateFormatMap[groupBy] as any).format, date: '$firstReproducedAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Ticket.aggregate([
                { $match: matchReturned },
                { $group: { _id: { $dateToString: { format: (dateFormatMap[groupBy] as any).format, date: '$lastReturnedAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
        ]);

        const toMap = (agg: any[]) => new Map(agg.map((a) => [a._id, a.count]));
        const createdMap = toMap(createdAgg);
        const reproducedMap = toMap(reproducedAgg);
        const returnedMap = toMap(returnedAgg);

        const allPeriods = new Set([...createdMap.keys(), ...reproducedMap.keys(), ...returnedMap.keys()]);
        const trend: TicketTriageDataPoint[] = Array.from(allPeriods)
            .sort()
            .map((period) => {
                const first = createdAgg.find((a) => a._id === period);
                return {
                    period,
                    periodLabel: this.formatPeriodLabel(first?.firstDate ? new Date(first.firstDate) : new Date(), groupBy),
                    ticketsCreated: createdMap.get(period) || 0,
                    ticketsReproduced: reproducedMap.get(period) || 0,
                    ticketsReturned: returnedMap.get(period) || 0,
                };
            });

        const endDate = params.endDate ? new Date(params.endDate) : new Date();
        const startDate = params.startDate ? new Date(params.startDate) : new Date(0);

        return {
            projectId,
            dateRange: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            kpis: {
                ticketsCreated: tickets.length,
                ticketsReproduced: reproducedCount,
                reproductionRate: tickets.length > 0 ? Math.round((reproducedCount / tickets.length) * 1000) / 10 : 0,
                timeToReproduceMedianHours: kpiTtr.median,
                timeToReproduceAvgHours: kpiTtr.avg,
                timeToReproduceP75Hours: kpiTtr.p75,
                ticketsReturned: returnedCount,
                returnedRate: tickets.length > 0 ? Math.round((returnedCount / tickets.length) * 1000) / 10 : 0,
            },
            byFailureType,
            byTeam,
            returnsByReason,
            trend,
        };
    }
}

export default new ReportingService();
