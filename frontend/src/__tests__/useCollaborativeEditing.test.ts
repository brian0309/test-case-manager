import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCollaborativeEditing } from '../hooks/useCollaborativeEditing';
import { TestCase } from '../types/testManager';

type SocketEventHandler = (data: unknown) => void;

const { socketService, socketHandlers, mockUser } = vi.hoisted(() => {
    const socketHandlers = new Map<string, SocketEventHandler>();
    const mockUser = {
        _id: 'me',
        name: 'Me',
        profilePicture: 'https://example.com/me.png',
    };
    const socketService = {
        isConnected: vi.fn(() => false),
        connect: vi.fn(),
        joinTestCase: vi.fn(),
        leaveTestCase: vi.fn(),
        emitFieldEdit: vi.fn(),
        on: vi.fn((event: string, cb: SocketEventHandler) => {
            socketHandlers.set(event, cb);
        }),
        off: vi.fn((event: string) => {
            socketHandlers.delete(event);
        }),
    };
    return { socketService, socketHandlers, mockUser };
});

vi.mock('../services/socket', () => ({
    socketService,
}));

vi.mock('../store/authStore', () => ({
    useAuthStore: () => ({ user: mockUser }),
}));

const testCase = {
    id: 'case-1',
    projectId: 'project-1',
    suiteId: 'suite-1',
} as unknown as TestCase;

const emit = (event: string, data: unknown) => {
    act(() => {
        socketHandlers.get(event)?.(data);
    });
};

describe('useCollaborativeEditing', () => {
    const onFieldUpdate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        socketHandlers.clear();
        socketService.isConnected.mockReturnValue(false);
    });

    afterEach(() => {
        onFieldUpdate.mockClear();
    });

    it('joins the test case room with user info on mount and leaves on unmount', () => {
        const { unmount } = renderHook(() => useCollaborativeEditing({ testCase, onFieldUpdate }));

        expect(socketService.connect).toHaveBeenCalled();
        expect(socketService.joinTestCase).toHaveBeenCalledWith('case-1', 'project-1', {
            id: 'me',
            name: 'Me',
            avatar: 'https://example.com/me.png',
        });

        unmount();
        expect(socketService.leaveTestCase).toHaveBeenCalledWith('case-1', 'project-1', 'me');
    });

    it('shows presence users excluding self and dedupes duplicate sockets', () => {
        const { result } = renderHook(() => useCollaborativeEditing({ testCase, onFieldUpdate }));

        emit('testcase:presence', {
            testCaseId: 'case-1',
            projectId: 'project-1',
            users: [
                { id: 'me', name: 'Me' },
                { id: 'bob', name: 'Bob', avatar: 'https://example.com/bob.png' },
                { id: 'bob', name: 'Bob', avatar: 'https://example.com/bob.png' },
                { id: 'alice', name: 'Alice' },
            ],
        });

        expect(result.current.collaboratingUsers).toEqual([
            { id: 'bob', name: 'Bob', avatar: 'https://example.com/bob.png' },
            { id: 'alice', name: 'Alice' },
        ]);
    });

    it('appends users on user-joined and ignores duplicates', () => {
        const { result } = renderHook(() => useCollaborativeEditing({ testCase, onFieldUpdate }));

        emit('testcase:user-joined', {
            testCaseId: 'case-1',
            projectId: 'project-1',
            user: { id: 'bob', name: 'Bob' },
        });
        expect(result.current.collaboratingUsers).toHaveLength(1);

        emit('testcase:user-joined', {
            testCaseId: 'case-1',
            projectId: 'project-1',
            user: { id: 'bob', name: 'Bob' },
        });
        expect(result.current.collaboratingUsers).toHaveLength(1);

        emit('testcase:user-joined', {
            testCaseId: 'case-1',
            projectId: 'project-1',
            user: { id: 'alice', name: 'Alice' },
        });
        expect(result.current.collaboratingUsers).toHaveLength(2);
    });

    it('removes users on user-left', () => {
        const { result } = renderHook(() => useCollaborativeEditing({ testCase, onFieldUpdate }));

        emit('testcase:user-joined', {
            testCaseId: 'case-1',
            projectId: 'project-1',
            user: { id: 'bob', name: 'Bob' },
        });
        emit('testcase:user-joined', {
            testCaseId: 'case-1',
            projectId: 'project-1',
            user: { id: 'alice', name: 'Alice' },
        });
        expect(result.current.collaboratingUsers).toHaveLength(2);

        emit('testcase:user-left', {
            testCaseId: 'case-1',
            projectId: 'project-1',
            userId: 'bob',
        });
        expect(result.current.collaboratingUsers).toEqual([
            { id: 'alice', name: 'Alice' },
        ]);
    });

    it('ignores presence events for other test cases', () => {
        const { result } = renderHook(() => useCollaborativeEditing({ testCase, onFieldUpdate }));

        emit('testcase:presence', {
            testCaseId: 'other-case',
            projectId: 'project-1',
            users: [{ id: 'bob', name: 'Bob' }],
        });
        expect(result.current.collaboratingUsers).toEqual([]);
    });

    it('unsubscribes from all socket events on unmount', () => {
        const { unmount } = renderHook(() => useCollaborativeEditing({ testCase, onFieldUpdate }));

        unmount();

        expect(socketService.off).toHaveBeenCalledWith('testcase:editing', expect.any(Function));
        expect(socketService.off).toHaveBeenCalledWith('testcase:user-joined', expect.any(Function));
        expect(socketService.off).toHaveBeenCalledWith('testcase:user-left', expect.any(Function));
        expect(socketService.off).toHaveBeenCalledWith('testcase:presence', expect.any(Function));
    });
});
