
export enum Priority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Critical = 'Critical'
}

export enum Status {
    Draft = 'Draft',
    InReview = 'In Review',
    Ready = 'Ready',
    Updated = 'Updated',
    Archived = 'Archived',
}

export enum TestRunStatus {
    Draft = 'Draft',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Abandoned = 'Abandoned'
}

export enum RunItemStatus {
    NotRun = 'Not Run',
    ReadyForTesting = 'Ready for Testing',
    InProgress = 'In Progress',
    Passed = 'Passed',
    Failed = 'Failed',
    Blocked = 'Blocked',
    Skipped = 'Skipped',
    OutOfScope = 'Out of Scope',
}

export interface Tester {
    id: string;
    name: string;
    avatar: string;
}

export interface TestStep {
    id: string;
    action: string;
    expectedResult: string;
}

export interface ProjectMember {
    id: string;
    name: string;
    email: string;
}

export interface CustomFieldOption {
    id: string;
    label: string;
}

export interface CustomFieldDefinition {
    id: string;
    key?: string;
    label: string;
    type: 'text' | 'long_text' | 'dropdown' | 'wysiwyg';
    required?: boolean;
    options?: CustomFieldOption[];
    defaultValue?: string;
    showOnTableByDefault?: boolean;
    order?: number;
    deleted?: boolean;
    deletedAt?: string;
}

export interface HiddenDefaultFields {
    area?: boolean;
    testDescription?: boolean;
    stepsContent?: boolean;
    expectedResult?: boolean;
    comments?: boolean;
    priority?: boolean;
    status?: boolean;
    assignedTester?: boolean;
}

export interface HiddenDefaultColumns {
    id?: boolean;
    title?: boolean;
    priority?: boolean;
    status?: boolean;
    createdAt?: boolean;
    lastModified?: boolean;
    assignedTester?: boolean;
}

export interface ProjectSettings {
    testCases?: {
        hiddenDefaultFields?: HiddenDefaultFields;
        table?: {
            hiddenDefaultColumns?: HiddenDefaultColumns;
            visibleCustomFieldIds?: string[];
        };
        customFields?: CustomFieldDefinition[];
    };
}

export interface Project {
    id: string;
    name: string;
    description: string;
    color: string;
    ownerId: string;
    members: ProjectMember[];
    stats: {
        suites: number;
        cases: number;
        members: number;
    };
    updatedAt: string;
    settings?: ProjectSettings;
}

export interface TestSuite {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    projectId: string;
    createdAt: string;
    updatedAt: string;
}

export interface HistoryEntry {
    id: string;
    timestamp: string;
    user: Tester;
    snapshot: Partial<TestCase>;
    changedFields: string[];
}

export interface TestCase {
    id: string;
    title: string;
    priority: Priority;
    status: Status; // Unified status
    createdAt: string;
    lastModified: string;
    assignedTester: Tester;
    steps: TestStep[];
    stepsContent?: string;
    suite: string;
    suiteId?: string;
    area?: string;
    expectedResult?: string;
    testDescription?: string;
    comments?: string;
    customFields?: Record<string, string>;
    history?: HistoryEntry[];
    projectId: string;
    order?: number;
}

// Test Run Types
export interface CaseSnapshot {
    title: string;
    priority?: string;
    suiteId?: string;
    suiteName?: string;
    area?: string;
    expectedResult?: string;
    testDescription?: string;
    stepsContent?: string;
}

export interface RunItem {
    id: string;
    caseId: string;
    caseSnapshot: CaseSnapshot;
    order: number;
    status: RunItemStatus;
    assignedTo?: Tester;
    actualResult?: string;
    attachments?: string[];
    timeSpent?: number;
    executedAt?: string;
    executedBy?: Tester;
}

export interface ResultsSummary {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    notRun: number;
    passRate: number;
    totalTimeSpent: number;
}

export interface TestRun {
    id: string;
    title: string;
    description?: string;
    projectId: string;
    suiteId?: string;
    suiteName?: string;
    status: TestRunStatus;
    environment?: string;
    tags?: string[];
    items: RunItem[];
    createdBy: Tester;
    startedAt?: string;
    completedAt?: string;
    resultsSummary: ResultsSummary;
    groupId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TestRunListItem {
    id: string;
    title: string;
    description?: string;
    projectId: string;
    suiteId?: string;
    suiteName?: string;
    status: TestRunStatus;
    environment?: string;
    tags?: string[];
    itemCount: number;
    createdBy: Tester;
    startedAt?: string;
    completedAt?: string;
    resultsSummary: ResultsSummary;
    groupId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TestRunGroup {
    id: string;
    name: string;
    description?: string;
    projectId: string;
    color?: string;
    createdBy: Tester;
    createdAt: string;
    updatedAt: string;
}

// ===== Reporting Types =====

export interface ReportFilterParams {
    startDate?: string;
    endDate?: string;
    suiteId?: string;
    groupId?: string;
    environment?: string;
    tags?: string[];
    status?: TestRunStatus;
}

export interface TrendReportParams extends ReportFilterParams {
    groupBy: 'day' | 'week' | 'month';
}

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
        averageDuration: number;
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
        changePercentage: number;
    };
}

export interface TrendDataPoint {
    period: string;
    periodLabel: string;
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
    flakyScore: number;
    recentResults: RunItemStatus[];
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

// ===== Ticket Types =====

export enum TicketStatus {
    Open = 'Open',
    InProgress = 'In Progress',
    Resolved = 'Resolved',
    Closed = 'Closed',
    Reopened = 'Reopened',
}

export enum TicketPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Critical = 'Critical',
}

export enum TicketSeverity {
    Trivial = 'Trivial',
    Minor = 'Minor',
    Major = 'Major',
    Critical = 'Critical',
    Blocker = 'Blocker',
}

export interface TicketAttachment {
    url: string;
    filename: string;
    fileSize: number;
    contentType: string;
}

export interface Ticket {
    id: string;
    title: string;
    description?: string;
    projectId: string;
    status: TicketStatus;
    priority: TicketPriority;
    severity: TicketSeverity;
    assignedTo?: Tester;
    createdBy: Tester;
    relatedRunId?: string;
    relatedRunItemId?: string;
    attachments: TicketAttachment[];
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export type ViewMode = 'projects' | 'cases' | 'suites' | 'runs' | 'tickets';
