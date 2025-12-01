
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
    area?: string;
    expectedResult?: string;
    testDescription?: string;
    comments?: string;
    history?: HistoryEntry[];
    projectId: string;
}

export interface TestRun {
    id: string;
    title: string;
    status: string;
    progress: number;
    assignedTo: Tester;
    caseResults: any[];
    dueDate: string;
}

export type ViewMode = 'projects' | 'cases' | 'suites' | 'plans';
