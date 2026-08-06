import { TestRunStatus, RunItemStatus } from '../../../services/testRun/types/testRun.types.js';
import { FailureType, ReturnReason, TicketStatus } from '../../../services/ticket/types/ticket.types.js';

// ===== Request Types =====

export interface ReportFilterParams {
    startDate?: string;
    endDate?: string;
    suiteId?: string;
    groupId?: string;
    environment?: string;
    tags?: string[];
    status?: TestRunStatus;
}

export interface TicketMetricsFilterParams {
    startDate?: string;
    endDate?: string;
    failureType?: FailureType;
    team?: string;
    status?: TicketStatus;
    severity?: string;
    priority?: string;
    groupBy?: 'day' | 'week' | 'month';
}

export interface TrendReportParams extends ReportFilterParams {
    groupBy: 'day' | 'week' | 'month';
}

// ===== Response Types =====

export interface ProjectSummaryReport {
    projectId: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
    totalRuns: number;
    completedRuns: number;
    inProgressRuns: number;
    draftRuns: number;
    abandonedRuns: number;
    overallStats: {
        totalTests: number;
        totalPassed: number;
        totalFailed: number;
        totalBlocked: number;
        totalSkipped: number;
        totalNotRun: number;
        averagePassRate: number;
        averageDuration: number; // in seconds
    };
    suiteBreakdown: SuiteBreakdownItem[];
    groupBreakdown: GroupBreakdownItem[];
    recentActivity: RecentActivityItem[];
}

export interface SuiteBreakdownItem {
    suiteId: string;
    suiteName: string;
    totalRuns: number;
    averagePassRate: number;
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    averageDuration: number;
}

export interface GroupBreakdownItem {
    groupId: string;
    groupName: string;
    groupColor: string;
    totalRuns: number;
    averagePassRate: number;
    totalTests: number;
}

export interface RecentActivityItem {
    runId: string;
    title: string;
    status: TestRunStatus;
    completedAt: Date | null;
    passRate: number;
    duration: number;
}

export interface TrendReport {
    projectId: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
    groupBy: 'day' | 'week' | 'month';
    dataPoints: TrendDataPoint[];
    summary: {
        totalRuns: number;
        averagePassRate: number;
        trendDirection: 'improving' | 'declining' | 'stable';
        changePercentage: number; // percentage change from start to end
    };
}

export interface TrendDataPoint {
    period: string; // ISO date string (start of day/week/month)
    periodLabel: string; // Human-readable label (e.g., "Dec 1", "Week 48", "November 2025")
    runsCompleted: number;
    totalTests: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    passRate: number;
    averageDuration: number;
}

export interface SuiteComparisonReport {
    projectId: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
    suites: SuiteComparisonItem[];
}

export interface SuiteComparisonItem {
    suiteId: string;
    suiteName: string;
    totalRuns: number;
    totalTests: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    passRate: number;
    averageDuration: number;
    trend: 'improving' | 'declining' | 'stable';
    failureRate: number;
}

export interface TestCaseHealthReport {
    projectId: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
    failedRunCases: FailedRunCaseItem[];
    flakyTests: FlakyTestItem[];
    neverExecutedTests: NeverExecutedTestItem[];
    mostFailingTests: MostFailingTestItem[];
    summary: {
        totalUniqueCases: number;
        flakyCount: number;
        neverExecutedCount: number;
        highFailureCount: number;
    };
}

export interface FailedRunCaseItem {
    runId: string;
    runName: string;
    itemId: string;
    caseId: string;
    testCaseName: string;
    testSuite: string;
    area: string;
    failedAt: Date | null;
}

export interface FlakyTestItem {
    caseId: string;
    title: string;
    suite: string;
    executionCount: number;
    passCount: number;
    failCount: number;
    flakyScore: number; // 0-100, higher = more flaky
    recentResults: RunItemStatus[]; // last 10 executions
}

export interface NeverExecutedTestItem {
    caseId: string;
    title: string;
    suite: string;
    createdAt: Date;
    daysSinceCreation: number;
}

export interface MostFailingTestItem {
    caseId: string;
    title: string;
    suite: string;
    executionCount: number;
    failCount: number;
    failureRate: number;
    lastFailedAt: Date | null;
}

export interface DetailedRunReport {
    runId: string;
    title: string;
    description: string;
    status: TestRunStatus;
    createdAt: Date;
    completedAt: Date | null;
    createdBy: string;
    suite: {
        id: string;
        name: string;
    } | null;
    group: {
        id: string;
        name: string;
        color: string;
    } | null;
    environment: string;
    tags: string[];
    duration: number;
    statistics: {
        total: number;
        passed: number;
        failed: number;
        blocked: number;
        skipped: number;
        notRun: number;
        passRate: number;
    };
    items: DetailedRunItem[];
    timeline: RunTimelineEntry[];
}

export interface DetailedRunItem {
    itemId: string;
    caseId: string;
    title: string;
    status: RunItemStatus;
    executedBy: string | null;
    executedAt: Date | null;
    timeSpent: number;
    actualResult: string;
}

export interface RunTimelineEntry {
    timestamp: Date;
    action: 'created' | 'started' | 'item_executed' | 'completed' | 'abandoned';
    user: string;
    details: string;
}

// ===== Ticket Triage Metrics =====

export interface TicketTriageSegment {
    key: string;
    label: string;
    ticketsCreated: number;
    ticketsReproduced: number;
    reproductionRate: number; // percentage
    timeToReproduceMedianHours: number | null;
    timeToReproduceAvgHours: number | null;
    timeToReproduceP75Hours: number | null;
    returnedCount: number; // tickets with >= 1 return event
    returnedRate: number; // percentage of tickets created
}

export interface TicketReturnReasonStat {
    reason: ReturnReason;
    count: number;
}

export interface TicketTriageDataPoint {
    period: string;
    periodLabel: string;
    ticketsCreated: number;
    ticketsReproduced: number;
    ticketsReturned: number;
}

export interface TicketMetricsReport {
    projectId: string;
    dateRange: {
        startDate: string;
        endDate: string;
    };
    kpis: {
        ticketsCreated: number;
        ticketsReproduced: number;
        reproductionRate: number;
        timeToReproduceMedianHours: number | null;
        timeToReproduceAvgHours: number | null;
        timeToReproduceP75Hours: number | null;
        ticketsReturned: number;
        returnedRate: number;
    };
    byFailureType: TicketTriageSegment[];
    byTeam: TicketTriageSegment[];
    returnsByReason: TicketReturnReasonStat[];
    trend: TicketTriageDataPoint[];
}

// ===== Aggregation Helper Types =====

export interface AggregationPipelineStage {
    [key: string]: any;
}

export interface DateRangeFilter {
    $gte?: Date;
    $lte?: Date;
}
