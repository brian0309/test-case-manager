import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiscussionPanel from '../components/testManager/DiscussionPanel';

const {
    deleteDiscussionMessage,
    fetchDiscussionMessages,
    sendDiscussionMessage,
    updateDiscussionMessageFixState,
    socketService,
} = vi.hoisted(() => ({
    deleteDiscussionMessage: vi.fn(),
    fetchDiscussionMessages: vi.fn(),
    sendDiscussionMessage: vi.fn(),
    updateDiscussionMessageFixState: vi.fn(),
    socketService: {
        isConnected: vi.fn(() => true),
        connect: vi.fn(),
        joinProject: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

vi.mock('../services/discussionApi', () => ({
    deleteDiscussionMessage,
    fetchDiscussionMessages,
    sendDiscussionMessage,
    updateDiscussionMessageFixState,
}));

vi.mock('../services/socket', () => ({
    socketService,
}));

vi.mock('../store/authStore', () => ({
    useAuthStore: () => ({
        user: { _id: 'user-1', name: 'QA User' },
    }),
}));

vi.mock('../utils/imageUpload', () => ({
    uploadImage: vi.fn(),
    validateImageFile: vi.fn(() => null),
}));

describe('DiscussionPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('confirm', vi.fn(() => true));
        fetchDiscussionMessages.mockResolvedValue([
            {
                id: 'message-own',
                testCaseId: 'case-1',
                projectId: 'project-1',
                user: {
                    id: 'user-1',
                    name: 'QA User',
                    avatar: 'https://example.com/avatar-self.png',
                },
                type: 'comment',
                body: 'Owner message',
                bodyFormat: 'plain',
                attachments: [],
                createdAt: '2026-03-07T09:00:00.000Z',
                updatedAt: '2026-03-07T09:00:00.000Z',
            },
            {
                id: 'message-1',
                testCaseId: 'case-1',
                projectId: 'project-1',
                user: {
                    id: 'user-2',
                    name: 'QA User',
                    avatar: 'https://example.com/avatar.png',
                },
                type: 'system',
                body: '<p><strong>Formatted failure</strong> with <em>rich text</em>.</p>',
                bodyFormat: 'html',
                fixState: 'not-fixed',
                relatedRunId: 'run-1',
                relatedRunItemId: 'item-1',
                attachments: [],
                createdAt: '2026-03-07T10:00:00.000Z',
                updatedAt: '2026-03-07T10:00:00.000Z',
            },
        ]);
        deleteDiscussionMessage.mockResolvedValue('message-own');
        sendDiscussionMessage.mockResolvedValue(undefined);
        updateDiscussionMessageFixState.mockImplementation(async (_testCaseId, _messageId, _projectId, fixState) => ({
            id: 'message-1',
            testCaseId: 'case-1',
            projectId: 'project-1',
            user: {
                id: 'user-2',
                name: 'QA User',
                avatar: 'https://example.com/avatar.png',
            },
            type: 'system',
            body: '<p><strong>Formatted failure</strong> with <em>rich text</em>.</p>',
            bodyFormat: 'html',
            fixState,
            relatedRunId: 'run-1',
            relatedRunItemId: 'item-1',
            attachments: [],
            createdAt: '2026-03-07T10:00:00.000Z',
            updatedAt: '2026-03-07T10:00:00.000Z',
        }));

        window.HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders HTML discussion bodies and tracked fix state controls', async () => {
        render(<DiscussionPanel testCaseId="case-1" projectId="project-1" />);

        expect(await screen.findByText('Formatted failure')).toBeInTheDocument();
        expect(screen.getByText('rich text', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('Not Fixed')).toBeInTheDocument();
        expect(screen.getByTitle('Mark fixed')).toBeInTheDocument();
        expect(screen.getByTitle('Mark not fixed')).toBeInTheDocument();
    });

    it('updates the tracked fix state when the check button is pressed', async () => {
        const user = userEvent.setup();

        render(<DiscussionPanel testCaseId="case-1" projectId="project-1" />);

        await screen.findByText('Formatted failure');
        await user.click(screen.getByTitle('Mark fixed'));

        await waitFor(() => {
            expect(updateDiscussionMessageFixState).toHaveBeenCalledWith('case-1', 'message-1', 'project-1', 'fixed');
        });

        expect(screen.getByText('Fixed')).toBeInTheDocument();
    });

    it('only shows the message actions menu for the message owner', async () => {
        render(<DiscussionPanel testCaseId="case-1" projectId="project-1" />);

        await screen.findByText('Owner message');

        expect(screen.getAllByTitle('Message actions')).toHaveLength(1);
        expect(screen.getByText('Formatted failure')).toBeInTheDocument();
    });

    it('deletes an owned message from the thread', async () => {
        const user = userEvent.setup();

        render(<DiscussionPanel testCaseId="case-1" projectId="project-1" />);

        await screen.findByText('Owner message');
        await user.click(screen.getByTitle('Message actions'));
        await user.click(screen.getByRole('menuitem', { name: 'Delete message' }));

        await waitFor(() => {
            expect(deleteDiscussionMessage).toHaveBeenCalledWith('case-1', 'message-own');
        });

        expect(screen.queryByText('Owner message')).not.toBeInTheDocument();
        expect(screen.getByText('Formatted failure')).toBeInTheDocument();
    });
});