import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../../helpers/testHelpers';

// Mock dependencies
jest.mock('../../../services/testRun/services/testRun.service');
jest.mock('../../../models/testCase.model');
jest.mock('../../../services/testCase/services/testCase.service');
jest.mock('../../../services/discussion/services/discussion.service');
jest.mock('../../../socket/socketManager');

import * as testRunController from '../../../services/testRun/controllers/testRun.controller';
import * as testRunService from '../../../services/testRun/services/testRun.service';
import * as testCaseService from '../../../services/testCase/services/testCase.service';
import * as discussionService from '../../../services/discussion/services/discussion.service';
import { TestCase } from '../../../models/testCase.model';
import {
  emitTestRunItemUpdated,
  emitTestRunUpdated,
  emitTestCaseUpdated,
  socketManager,
} from '../../../socket/socketManager';
import { RunItemStatus } from '../../../services/testRun/types/testRun.types';

const mockEmitTestRunItemUpdated = emitTestRunItemUpdated as jest.MockedFunction<typeof emitTestRunItemUpdated>;
const mockEmitTestRunUpdated = emitTestRunUpdated as jest.MockedFunction<typeof emitTestRunUpdated>;
const mockEmitTestCaseUpdated = emitTestCaseUpdated as jest.MockedFunction<typeof emitTestCaseUpdated>;
const mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;

describe('TestRun Controller - updateRunItem', () => {
  let mockRequest: any;
  let mockResponse: any;

  const mockTestRun = {
    _id: { toString: () => 'run-id-123' },
    title: 'Sprint 1 Regression',
    projectId: { toString: () => 'project-id-123' },
    items: [
      {
        _id: { toString: () => 'item-id-456' },
        caseId: { toString: () => 'case-id-789' },
        status: RunItemStatus.Failed,
        actualResult: '<p>Button did not respond</p>',
        attachments: [],
      },
    ],
    resultsSummary: { total: 1, passed: 0, failed: 1, blocked: 0, skipped: 0, notRun: 0, passRate: 0, totalTimeSpent: 0 },
  };

  const mockSourceCase = {
    _id: 'case-id-789',
    suiteId: { toString: () => 'suite-id-111' },
    projectId: { toString: () => 'project-id-123' },
    status: 'Draft',
    comments: '<p>Existing comment</p>',
  };

  const mockDiscussionMessage = {
    id: 'msg-id-1',
    body: 'Failed in test run: Sprint 1 Regression (ID: run-id-123)',
    testCaseId: 'case-id-789',
    projectId: 'project-id-123',
  };

  const mockUpdatedTestCase = {
    _id: 'case-id-789',
    status: 'Failed',
    suiteId: { toString: () => 'suite-id-111' },
    projectId: { toString: () => 'project-id-123' },
    comments: '<p>Existing comment</p><p><strong>________ Test run: Sprint 1 Regression ________</strong></p><p>Button did not respond</p>',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = createMockRequest({
      params: { id: 'run-id-123', itemId: 'item-id-456' },
      body: { status: RunItemStatus.Failed, actualResult: '<p>Button did not respond</p>' },
      userId: 'user-id-999',
    });
    mockResponse = createMockResponse();

    (testRunService.updateRunItem as jest.MockedFunction<typeof testRunService.updateRunItem>)
      .mockResolvedValue(mockTestRun as any);
    (testRunService.formatTestRunResponse as jest.MockedFunction<typeof testRunService.formatTestRunResponse>)
      .mockReturnValue({ id: 'run-id-123', resultsSummary: mockTestRun.resultsSummary } as any);

    (TestCase.findById as jest.MockedFunction<any>).mockReturnValue({
      select: (jest.fn() as any).mockReturnValue({
        lean: (jest.fn() as any).mockResolvedValue(mockSourceCase),
      }),
    });

    (testCaseService.updateTestCase as jest.MockedFunction<typeof testCaseService.updateTestCase>)
      .mockResolvedValue(mockUpdatedTestCase as any);
    (testCaseService.formatTestCaseResponse as jest.MockedFunction<typeof testCaseService.formatTestCaseResponse>)
      .mockReturnValue({ id: 'case-id-789', status: 'Failed' } as any);

    (discussionService.createSystemMessage as jest.MockedFunction<typeof discussionService.createSystemMessage>)
      .mockResolvedValue(mockDiscussionMessage as any);

    mockEmitTestRunItemUpdated.mockImplementation(() => {});
    mockEmitTestRunUpdated.mockImplementation(() => {});
    mockEmitTestCaseUpdated.mockImplementation(() => {});
    (mockSocketManager.emitToProject as jest.MockedFunction<any>).mockImplementation(() => {});
  });

  it('should update the source test case status to Failed when run item is marked Failed', async () => {
    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(testCaseService.updateTestCase).toHaveBeenCalledWith(
      'case-id-789',
      'user-id-999',
      expect.objectContaining({ status: 'Failed' })
    );
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should append actualResult to source test case comments when failing', async () => {
    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(testCaseService.updateTestCase).toHaveBeenCalledWith(
      'case-id-789',
      'user-id-999',
      expect.objectContaining({
        status: 'Failed',
        comments: expect.stringContaining('________ Test run: Sprint 1 Regression ________'),
      })
    );
    expect(testCaseService.updateTestCase).toHaveBeenCalledWith(
      'case-id-789',
      'user-id-999',
      expect.objectContaining({
        comments: expect.stringContaining('<p>Existing comment</p>'),
      })
    );
  });

  it('should post a system discussion message about the failure', async () => {
    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(discussionService.createSystemMessage).toHaveBeenCalledWith(
      'case-id-789',
      'project-id-123',
      'user-id-999',
      expect.stringContaining('Sprint 1 Regression')
    );
  });

  it('should emit discussion:created socket event', async () => {
    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(mockSocketManager.emitToProject).toHaveBeenCalledWith(
      'project-id-123',
      'discussion:created',
      expect.objectContaining({ testCaseId: 'case-id-789' })
    );
  });

  it('should emit testcase:updated socket event after updating test case', async () => {
    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(mockEmitTestCaseUpdated).toHaveBeenCalledWith(
      'project-id-123',
      'suite-id-111',
      expect.objectContaining({ id: 'case-id-789' })
    );
  });

  it('should NOT update the source test case when status is Passed', async () => {
    mockRequest.body = { status: RunItemStatus.Passed };
    (testRunService.updateRunItem as jest.MockedFunction<typeof testRunService.updateRunItem>)
      .mockResolvedValue({
        ...mockTestRun,
        items: [{ ...mockTestRun.items[0], status: RunItemStatus.Passed }],
      } as any);

    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(testCaseService.updateTestCase).not.toHaveBeenCalled();
    expect(discussionService.createSystemMessage).not.toHaveBeenCalled();
  });

  it('should NOT append comments when actualResult is empty', async () => {
    mockRequest.body = { status: RunItemStatus.Failed, actualResult: '' };
    (testRunService.updateRunItem as jest.MockedFunction<typeof testRunService.updateRunItem>)
      .mockResolvedValue({
        ...mockTestRun,
        items: [{ ...mockTestRun.items[0], actualResult: '', attachments: [] }],
      } as any);

    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(testCaseService.updateTestCase).toHaveBeenCalledWith(
      'case-id-789',
      'user-id-999',
      expect.not.objectContaining({ comments: expect.anything() })
    );
  });

  it('should still return success even if source test case propagation fails', async () => {
    (TestCase.findById as jest.MockedFunction<any>).mockReturnValue({
      select: (jest.fn() as any).mockReturnValue({
        lean: (jest.fn() as any).mockRejectedValue(new Error('DB error')),
      }),
    });

    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should return 401 if user is not authenticated', async () => {
    mockRequest.userId = undefined;

    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(testCaseService.updateTestCase).not.toHaveBeenCalled();
  });

  it('should return 404 if test run or item not found', async () => {
    (testRunService.updateRunItem as jest.MockedFunction<typeof testRunService.updateRunItem>)
      .mockResolvedValue(null);

    await testRunController.updateRunItem(mockRequest, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(testCaseService.updateTestCase).not.toHaveBeenCalled();
  });
});
