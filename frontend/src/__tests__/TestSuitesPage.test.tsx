import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import TestSuitesPage from '../pages/testManager/TestSuitesPage';
import { Priority, Status, type Project, type TestCase, type TestSuite, type Tester } from '../types/testManager';

const mockStore = vi.hoisted(() => ({
    current: null as ReturnType<typeof createStoreState> | null,
}));

vi.mock('../store/testManagerStore', () => ({
    useTestManagerStore: () => mockStore.current,
}));

vi.mock('../hooks/useRealtimeTestCases', () => ({
    useRealtimeTestCases: vi.fn(),
}));

vi.mock('../hooks/useProjectPresence', () => ({
    useProjectPresence: () => ({
        projectUsers: [],
    }),
}));

vi.mock('../components/testManager/EmptyProjectState', () => ({
    default: ({ title, description }: { title: string; description: string }) => (
        <div>
            <h1>{title}</h1>
            <p>{description}</p>
        </div>
    ),
}));

vi.mock('../components/testManager/TestSuiteList', () => ({
    default: ({
        testSuites,
        allowDerivedFallback,
        emptyState,
    }: {
        testSuites: TestSuite[];
        allowDerivedFallback?: boolean;
        emptyState?: { title: string; description: string };
    }) => (
        <div>
            <div data-testid="suite-count">{testSuites.length}</div>
            <div data-testid="allow-derived">{String(allowDerivedFallback)}</div>
            {testSuites.map((suite) => (
                <div key={suite.id}>{suite.name}</div>
            ))}
            {emptyState && (
                <div>
                    <h2>{emptyState.title}</h2>
                    <p>{emptyState.description}</p>
                </div>
            )}
        </div>
    ),
}));

vi.mock('../components/testManager/TestSuiteCreateModal', () => ({
    default: () => null,
}));

vi.mock('../components/testManager/TestSuiteEditModal', () => ({
    default: () => null,
}));

vi.mock('../components/testManager/ConfirmationModal', () => ({
    default: () => null,
}));

vi.mock('../components/testManager/ContextBreadcrumb', () => ({
    default: () => <div data-testid="context-breadcrumb" />,
}));

vi.mock('../components/testManager/ProjectPresenceIndicator', () => ({
    default: () => null,
}));

vi.mock('../components/testManager/TagInput', () => ({
    default: () => null,
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const tester: Tester = {
    id: 'tester-1',
    name: 'QA',
    avatar: '',
};

const project: Project = {
    id: 'project-1',
    name: 'Website',
    description: 'Main project',
    color: '#2563eb',
    ownerId: 'owner-1',
    members: [],
    stats: {
        suites: 1,
        cases: 1,
        members: 1,
    },
    updatedAt: '2026-01-01T00:00:00.000Z',
};

function createTestCase(overrides: Partial<TestCase> = {}): TestCase {
    return {
        id: 'case-1',
        title: 'Login works',
        priority: Priority.High,
        status: Status.Draft,
        createdAt: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
        assignedTester: tester,
        steps: [],
        suite: 'Authentication',
        projectId: 'project-1',
        ...overrides,
    };
}

function createTestSuite(overrides: Partial<TestSuite> = {}): TestSuite {
    return {
        id: 'suite-1',
        name: 'Authentication',
        description: 'Covers auth flows',
        projectId: 'project-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

function createStoreState(overrides: Partial<ReturnType<typeof createStoreStateBase>> = {}) {
    return {
        ...createStoreStateBase(),
        ...overrides,
    };
}

function createStoreStateBase() {
    return {
        activeProject: 'project-1',
        testCases: [createTestCase()],
        testSuites: [createTestSuite()],
        projects: [project],
        setActiveSuiteWithId: vi.fn(),
        fetchTestCases: vi.fn(),
        fetchTestSuites: vi.fn().mockResolvedValue(undefined),
        fetchTestCasesByProject: vi.fn().mockResolvedValue(undefined),
        fetchProjects: vi.fn().mockResolvedValue(undefined),
        updateTestSuite: vi.fn(),
        deleteTestSuite: vi.fn(),
        setActiveProject: vi.fn(),
        setActiveArea: vi.fn(),
        clearFilters: vi.fn(),
        searchQuery: '',
        clearSearchQuery: vi.fn(),
    };
}

describe('TestSuitesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const localStorageMock = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };

        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });

        mockStore.current = createStoreState();
    });

    it('shows a no-results state instead of falling back to all suites when search has no match', async () => {
        mockStore.current = createStoreState({
            searchQuery: 'billing',
        });

        render(
            <MemoryRouter initialEntries={['/test-manager/suites']}>
                <TestSuitesPage />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByTestId('suite-count')).toHaveTextContent('0'));
        expect(screen.getByTestId('allow-derived')).toHaveTextContent('false');
        expect(screen.getByText('No Test Suites Found')).toBeInTheDocument();
        expect(screen.getByText('No test suites match your search or filters.')).toBeInTheDocument();
        expect(screen.queryByText('Authentication')).not.toBeInTheDocument();
    });

    it('derives suites from project test cases before filtering when suite data is unavailable', async () => {
        mockStore.current = createStoreState({
            testSuites: [],
            testCases: [createTestCase({ suite: 'Authentication' })],
            searchQuery: 'auth',
        });

        render(
            <MemoryRouter initialEntries={['/test-manager/suites']}>
                <TestSuitesPage />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByTestId('suite-count')).toHaveTextContent('1'));
        expect(screen.getByTestId('allow-derived')).toHaveTextContent('false');
        expect(screen.getByText('Authentication')).toBeInTheDocument();
        expect(screen.queryByText('No Test Suites Found')).not.toBeInTheDocument();
    });
});
