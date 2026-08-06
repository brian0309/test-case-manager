import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExecuteRunModal from '../pages/testManager/components/ExecuteRunModal';
import { Priority, RunItemStatus, Status, TestRunStatus, type TestRun, type TestCase } from '../types/testManager';

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Replace the heavy tiptap editor with a simple controlled textarea keyed by placeholder.
vi.mock('../components/testManager/RichTextEditor', () => ({
    default: ({
        content,
        onChange,
        placeholder,
        editable,
    }: {
        content: string;
        onChange: (value: string) => void;
        placeholder?: string;
        editable?: boolean;
    }) => (
        <textarea
            aria-label={placeholder || 'rich-text'}
            value={content}
            disabled={editable === false}
            onChange={(event) => onChange?.(event.target.value)}
        />
    ),
}));

const buildRun = (): TestRun => ({
    id: 'run-1',
    title: 'Regression Run',
    projectId: 'project-1',
    status: TestRunStatus.InProgress,
    items: [
        {
            id: 'item-1',
            caseId: 'case-1',
            caseSnapshot: { title: 'Login works', priority: 'High' },
            order: 0,
            status: RunItemStatus.NotRun,
        },
        {
            id: 'item-2',
            caseId: 'case-2',
            caseSnapshot: { title: 'Logout works', priority: 'Low' },
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
});

const renderModal = (overrides: Partial<React.ComponentProps<typeof ExecuteRunModal>> = {}) => {
    const onUpdateItem = vi.fn().mockResolvedValue(undefined);
    const onCreateTicket = vi.fn().mockResolvedValue(undefined);

    render(
        <ExecuteRunModal
            isOpen
            onClose={vi.fn()}
            testRun={buildRun()}
            onUpdateItem={onUpdateItem}
            onComplete={vi.fn().mockResolvedValue(undefined)}
            onCreateTicket={onCreateTicket}
            {...overrides}
        />
    );

    return { onUpdateItem, onCreateTicket };
};

const buildTestCase = (overrides: Partial<TestCase> = {}): TestCase => ({
    id: 'case-1',
    title: 'Login works',
    priority: Priority.Medium,
    status: Status.Ready,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    assignedTester: { id: 'user-1', name: 'QA', avatar: '' },
    steps: [],
    suite: 'Smoke',
    projectId: 'project-1',
    ...overrides,
});

const clickFail = async (user: ReturnType<typeof userEvent.setup>) => {
    const failButtons = screen.getAllByRole('button', { name: 'Fail' });
    await user.click(failButtons[0]);
};

describe('ExecuteRunModal bug-on-fail flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('opens the bug panel and does not commit the status when Fail is pressed', async () => {
        const user = userEvent.setup();
        const { onUpdateItem } = renderModal();

        await clickFail(user);

        expect(screen.getByText('Log a bug')).toBeInTheDocument();
        expect(onUpdateItem).not.toHaveBeenCalled();
    });

    it('requires a description before the ticket can be created', async () => {
        const user = userEvent.setup();
        renderModal();

        await clickFail(user);

        const description = screen.getByLabelText(/Describe what went wrong/i);
        await user.clear(description);

        const createButton = screen.getByRole('button', { name: 'Create ticket & continue' });
        expect(createButton).toBeDisabled();

        await user.type(description, 'Login button throws a 500 error');
        expect(createButton).toBeEnabled();
    });

    it('creates a ticket linked to the run and item, then commits Failed', async () => {
        const user = userEvent.setup();
        const { onUpdateItem, onCreateTicket } = renderModal();

        await clickFail(user);

        const description = screen.getByLabelText(/Describe what went wrong/i);
        await user.clear(description);
        await user.type(description, 'Login button throws a 500 error');

        await user.click(screen.getByRole('button', { name: 'Create ticket & continue' }));

        await waitFor(() => {
            expect(onCreateTicket).toHaveBeenCalledTimes(1);
        });

        const ticketArg = onCreateTicket.mock.calls[0][0];
        expect(ticketArg.relatedRunId).toBe('run-1');
        expect(ticketArg.relatedRunItemId).toBe('item-1');
        expect(ticketArg.title).toContain('Login works');

        await waitFor(() => {
            expect(onUpdateItem).toHaveBeenCalledWith('item-1', RunItemStatus.Failed, expect.anything());
        });
    });

    it('skips ticket creation but still commits Failed', async () => {
        const user = userEvent.setup();
        const { onUpdateItem, onCreateTicket } = renderModal();

        await clickFail(user);

        await user.click(screen.getByRole('button', { name: 'Skip - mark failed without ticket' }));

        await waitFor(() => {
            expect(onUpdateItem).toHaveBeenCalledWith('item-1', RunItemStatus.Failed, expect.anything());
        });
        expect(onCreateTicket).not.toHaveBeenCalled();
    });

    it('keeps the panel open and does not commit Failed when ticket creation fails', async () => {
        const user = userEvent.setup();
        const onCreateTicket = vi.fn().mockRejectedValue(new Error('Network down'));
        const { onUpdateItem } = renderModal({ onCreateTicket });

        await clickFail(user);

        const description = screen.getByLabelText(/Describe what went wrong/i);
        await user.clear(description);
        await user.type(description, 'Login button throws a 500 error');

        await user.click(screen.getByRole('button', { name: 'Create ticket & continue' }));

        await waitFor(() => {
            expect(screen.getByText('Network down')).toBeInTheDocument();
        });

        expect(onUpdateItem).not.toHaveBeenCalled();
        expect(screen.getByText('Log a bug')).toBeInTheDocument();
    });
});

describe('ExecuteRunModal snapshot divergence', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders no status chip when no live test cases are loaded', () => {
        renderModal();
        expect(screen.queryByText('Snapshot up to date')).not.toBeInTheDocument();
        expect(screen.queryByText(/Test case updated/)).not.toBeInTheDocument();
        expect(screen.queryByText('Source test case no longer exists')).not.toBeInTheDocument();
    });

    it('shows an amber chip and expandable diff when the live case differs from the snapshot', async () => {
        const user = userEvent.setup();
        renderModal({
            availableTestCases: [
                buildTestCase({ id: 'case-1', title: 'Login works (updated)', priority: Priority.High }),
            ],
        });

        const chip = screen.getByRole('button', { name: /Test case updated/ });
        expect(chip).toHaveTextContent('Test case updated · 1 field changed');

        await user.click(chip);
        expect(screen.getByText('Snapshot (what ran)')).toBeInTheDocument();
        expect(screen.getByText('Live case (now)')).toBeInTheDocument();
        expect(screen.getByText('Login works (updated)')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Update snapshot to latest' })).not.toBeInTheDocument();
    });

    it('shows a green chip when the snapshot matches the live case', () => {
        renderModal({
            availableTestCases: [
                buildTestCase({ id: 'case-1', title: 'Login works', priority: Priority.High }),
            ],
        });
        expect(screen.getByText('Snapshot up to date')).toBeInTheDocument();
    });

    it('reports the source test case as deleted when the live case is missing', () => {
        renderModal({
            availableTestCases: [buildTestCase({ id: 'case-2', title: 'Logout works' })],
        });
        expect(screen.getByText('Source test case no longer exists')).toBeInTheDocument();
    });
});
