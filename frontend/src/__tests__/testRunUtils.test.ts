import { describe, expect, it } from 'vitest';
import { TestRunStatus, type TestRunListItem } from '../types/testManager';
import { filterTestRunsBySearch } from '../pages/testManager/components/testRunUtils';

describe('filterTestRunsBySearch', () => {
    const runs: TestRunListItem[] = [
        {
            id: 'run-1',
            title: 'Regression Run',
            description: 'Full smoke coverage',
            projectId: 'project-1',
            suiteId: 'suite-1',
            suiteName: 'Authentication',
            status: TestRunStatus.Draft,
            environment: 'Staging',
            tags: ['smoke'],
            itemCount: 10,
            createdBy: { id: 'user-1', name: 'QA Engineer', avatar: '' },
            resultsSummary: {
                total: 10,
                passed: 0,
                failed: 0,
                blocked: 0,
                skipped: 0,
                notRun: 10,
                passRate: 0,
                totalTimeSpent: 0,
            },
            groupId: 'group-1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
            id: 'run-2',
            title: 'Billing Checks',
            description: 'Payments regression',
            projectId: 'project-1',
            status: TestRunStatus.Completed,
            environment: 'Production',
            itemCount: 6,
            createdBy: { id: 'user-2', name: 'Release QA', avatar: '' },
            resultsSummary: {
                total: 6,
                passed: 6,
                failed: 0,
                blocked: 0,
                skipped: 0,
                notRun: 0,
                passRate: 100,
                totalTimeSpent: 0,
            },
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
        },
    ];

    it('matches run fields and related group names', () => {
        const groupNameById = new Map([['group-1', 'Release Train']]);

        expect(filterTestRunsBySearch(runs, 'auth', groupNameById)).toEqual([runs[0]]);
        expect(filterTestRunsBySearch(runs, 'release train', groupNameById)).toEqual([runs[0]]);
        expect(filterTestRunsBySearch(runs, 'production', groupNameById)).toEqual([runs[1]]);
    });

    it('returns all runs for an empty query', () => {
        expect(filterTestRunsBySearch(runs, '   ')).toEqual(runs);
    });
});
