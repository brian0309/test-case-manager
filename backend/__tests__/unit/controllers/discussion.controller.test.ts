import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../../helpers/testHelpers';

jest.mock('../../../services/discussion/services/discussion.service');
jest.mock('../../../services/testCase/services/project.service');
jest.mock('../../../socket/socketManager');

import * as discussionController from '../../../services/discussion/controllers/discussion.controller';
import * as discussionService from '../../../services/discussion/services/discussion.service';
import * as projectService from '../../../services/testCase/services/project.service';
import { socketManager } from '../../../socket/socketManager';

const mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;

describe('Discussion Controller - deleteDiscussionMessage', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = createMockRequest({
      params: { testCaseId: 'case-1', messageId: 'message-1' },
      userId: 'user-1',
    });
    mockResponse = createMockResponse();

    (discussionService.getProjectIdForTestCase as jest.MockedFunction<typeof discussionService.getProjectIdForTestCase>)
      .mockResolvedValue('project-1');
    (projectService.hasProjectAccess as jest.MockedFunction<typeof projectService.hasProjectAccess>)
      .mockResolvedValue(true);
    (discussionService.getMessageById as jest.MockedFunction<typeof discussionService.getMessageById>)
      .mockResolvedValue({
        id: 'message-1',
        testCaseId: 'case-1',
        projectId: 'project-1',
        user: {
          id: 'user-1',
          name: 'Owner',
          avatar: 'avatar.png',
        },
        type: 'comment',
        body: 'hello',
        bodyFormat: 'plain',
        attachments: [],
        createdAt: '2026-03-07T09:00:00.000Z',
        updatedAt: '2026-03-07T09:00:00.000Z',
      } as any);
    (discussionService.deleteMessage as jest.MockedFunction<typeof discussionService.deleteMessage>)
      .mockResolvedValue(true);
    (mockSocketManager.emitToProject as jest.MockedFunction<any>).mockImplementation(() => {});
  });

  it('deletes a message when requested by its owner', async () => {
    await discussionController.deleteDiscussionMessage(mockRequest, mockResponse as any);

    expect(discussionService.deleteMessage).toHaveBeenCalledWith('case-1', 'project-1', 'message-1');
    expect(mockSocketManager.emitToProject).toHaveBeenCalledWith(
      'project-1',
      'discussion:deleted',
      {
        messageId: 'message-1',
        testCaseId: 'case-1',
        projectId: 'project-1',
      }
    );
    expect(mockResponse.status).toHaveBeenCalledWith(200);
  });

  it('rejects deletion when the requester does not own the message', async () => {
    (discussionService.getMessageById as jest.MockedFunction<typeof discussionService.getMessageById>)
      .mockResolvedValue({
        id: 'message-1',
        testCaseId: 'case-1',
        projectId: 'project-1',
        user: {
          id: 'user-2',
          name: 'Other User',
          avatar: 'avatar.png',
        },
        type: 'comment',
        body: 'hello',
        bodyFormat: 'plain',
        attachments: [],
        createdAt: '2026-03-07T09:00:00.000Z',
        updatedAt: '2026-03-07T09:00:00.000Z',
      } as any);

    await discussionController.deleteDiscussionMessage(mockRequest, mockResponse as any);

    expect(discussionService.deleteMessage).not.toHaveBeenCalled();
    expect(mockSocketManager.emitToProject).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'You can only delete your own messages',
    });
  });
});