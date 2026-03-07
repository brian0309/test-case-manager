import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RunDetailView from '../pages/testManager/components/RunDetailView';
import { RunItemStatus, TestRunStatus, type TestRun } from '../types/testManager';

vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: ({ count }: { count: number }) => ({
        getVirtualItems: () => Array.from({ length: count }, (_, index) => ({
            index,
            start: index * 52,
            end: (index + 1) * 52,
        })),
        getTotalSize: () => count * 52,
        measureElement: vi.fn(),
    }),
}));

vi.mock('lucide-react', () => ({
    ArrowLeft: () => <span data-testid="icon-arrow-left" />,
    ChevronRight: () => <span data-testid="icon-chevron-right" />,
    Eye: () => <span data-testid="icon-eye" />,
    Layers: () => <span data-testid="icon-layers" />,
    Map: () => <span data-testid="icon-map" />,
    ChevronDown: () => <span data-testid="icon-chevron-down" />,
    ChevronUp: () => <span data-testid="icon-chevron-up" />,
    Check: () => <span data-testid="icon-check" />,
    ArrowUpDown: () => <span data-testid="icon-arrow-up-down" />,
}));

describe('RunDetailView', () => {
    beforeEach(() => {
        if (!globalThis.ResizeObserver) {
            globalThis.ResizeObserver = class {
                observe() {}
                unobserve() {}
                disconnect() {}
            } as unknown as typeof ResizeObserver;
        }
    });

    it('renders suite names from the run item snapshot without requiring preloaded lookups', () => {
        const testRun: TestRun = {
            id: 'run-1',
            title: 'Regression Run',
            projectId: 'project-1',
            status: TestRunStatus.Draft,
            items: [
                {
                    id: 'item-1',
                    caseId: 'case-1',
                    caseSnapshot: {
                        title: 'Login works',
                        priority: 'High',
                        suiteId: 'suite-1',
                        suiteName: 'Authentication',
                        area: 'Auth',
                    },
                    order: 0,
                    status: RunItemStatus.NotRun,
                },
            ],
            createdBy: { id: 'user-1', name: 'QA', avatar: '' },
            resultsSummary: {
                total: 1,
                passed: 0,
                failed: 0,
                blocked: 0,
                skipped: 0,
                notRun: 1,
                passRate: 0,
                totalTimeSpent: 0,
            },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };

        render(
            <RunDetailView
                testRun={testRun}
                onBack={vi.fn()}
                onUpdateItem={vi.fn().mockResolvedValue(undefined)}
                onComplete={vi.fn().mockResolvedValue(undefined)}
                onOpenExecute={vi.fn()}
            />
        );

        expect(screen.getAllByText('Authentication').length).toBeGreaterThan(0);
    });

    it('filters run items using the shared search query', () => {
        const testRun: TestRun = {
            id: 'run-1',
            title: 'Regression Run',
            projectId: 'project-1',
            status: TestRunStatus.Draft,
            items: [
                {
                    id: 'item-1',
                    caseId: 'case-1',
                    caseSnapshot: {
                        title: 'Login works',
                        priority: 'High',
                        suiteName: 'Authentication',
                        area: 'Auth',
                    },
                    order: 0,
                    status: RunItemStatus.NotRun,
                },
                {
                    id: 'item-2',
                    caseId: 'case-2',
                    caseSnapshot: {
                        title: 'Profile saves changes',
                        priority: 'Medium',
                        suiteName: 'Profile',
                        area: 'Settings',
                    },
                    order: 1,
                    status: RunItemStatus.NotRun,
                },
            ],
            createdBy: { id: 'user-1', name: 'QA', avatar: '' },
            resultsSummary: {
                total: 2,
                passed: 0,
                failed: 0,
                blocked: 0,
                skipped: 0,
                notRun: 2,
                passRate: 0,
                totalTimeSpent: 0,
            },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };

        render(
            <RunDetailView
                testRun={testRun}
                searchQuery="auth"
                onBack={vi.fn()}
                onUpdateItem={vi.fn().mockResolvedValue(undefined)}
                onComplete={vi.fn().mockResolvedValue(undefined)}
                onOpenExecute={vi.fn()}
            />
        );

        expect(screen.getAllByText('Login works').length).toBeGreaterThan(0);
        expect(screen.queryByText('Profile saves changes')).not.toBeInTheDocument();
    });
});
