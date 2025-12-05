
export enum Priority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Critical = 'Critical'
}

export enum Status {
    Draft = 'Draft',
    Passed = 'Passed',
    Failed = 'Failed',
    Retest = 'Retest',
    PassFixed = 'Pass - Fixed',
    Skipped = 'Skipped'
}

export enum TestRunStatus {
    Draft = 'Draft',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Abandoned = 'Abandoned'
}

export enum RunItemStatus {
    NotRun = 'Not Run',
    Passed = 'Passed',
    Failed = 'Failed',
    Blocked = 'Blocked',
    Skipped = 'Skipped'
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
}

export interface TestSuite {
    id: string;
    name: string;
    description?: string;
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
    history?: HistoryEntry[];
    projectId: string;
    order?: number;
}

// Test Run Types
export interface CaseSnapshot {
    title: string;
    priority?: string;
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

export type ViewMode = 'projects' | 'cases' | 'suites' | 'plans' | 'runs';
