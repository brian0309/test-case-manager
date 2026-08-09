import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../../helpers/testHelpers';

// Mock models
jest.mock('../../../models/project.model');
jest.mock('../../../models/ticket.model');
jest.mock('../../../models/testRun.model');
jest.mock('../../../models/testSuite.model');
jest.mock('../../../models/testCase.model');

import { getProjectDashboardStats } from '../../../services/statistics/controllers/statistics.controller';
import { Project } from '../../../models/project.model';
import { Ticket } from '../../../models/ticket.model';
import { TestRun } from '../../../models/testRun.model';
import { TestSuite } from '../../../models/testSuite.model';
import { TestCase } from '../../../models/testCase.model';
import { TicketStatus } from '../../../services/ticket/types/ticket.types';
import { TestRunStatus } from '../../../services/testRun/types/testRun.types';

const mockProject = Project as jest.MockedFunction<any>;
const mockTicket = Ticket as jest.MockedFunction<any>;
const mockTestRun = TestRun as jest.MockedFunction<any>;
const mockTestSuite = TestSuite as jest.MockedFunction<any>;
const mockTestCase = TestCase as jest.MockedFunction<any>;

const VALID_PROJECT_ID = '507f1f77bcf86cd799439011';

describe('getProjectDashboardStats', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = createMockRequest({
      params: { projectId: VALID_PROJECT_ID },
      userId: '507f1f77bcf86cd799439011',
    });
    mockResponse = createMockResponse();
  });

  it('should return 401 when unauthenticated', async () => {
    mockRequest.userId = undefined;

    await getProjectDashboardStats(mockRequest, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockProject.findOne).not.toHaveBeenCalled();
  });

  it('should return 400 for an invalid project id', async () => {
    mockRequest.params.projectId = 'not-a-valid-id';

    await getProjectDashboardStats(mockRequest, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockProject.findOne).not.toHaveBeenCalled();
  });

  it('should return 404 when the project is not owned by / shared with the user', async () => {
    (mockProject.findOne as jest.MockedFunction<any>).mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue(null),
    });

    await getProjectDashboardStats(mockRequest, mockResponse as any);

    expect(mockProject.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: VALID_PROJECT_ID,
        $or: expect.any(Array),
      })
    );
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockTicket.aggregate).not.toHaveBeenCalled();
  });

  it('should return counts with every ticket and run status present (zero-filled)', async () => {
    (mockProject.findOne as jest.MockedFunction<any>).mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({
        _id: VALID_PROJECT_ID,
        name: 'Payments App',
      }),
    });
    mockTicket.aggregate.mockResolvedValue([
      { status: TicketStatus.Open, count: 3 },
      { status: TicketStatus.Resolved, count: 2 },
    ]);
    mockTestRun.aggregate.mockResolvedValue([
      { status: TestRunStatus.Completed, count: 4 },
      { status: TestRunStatus.InProgress, count: 1 },
    ]);
    mockTestSuite.countDocuments.mockResolvedValue(5);
    mockTestCase.countDocuments.mockResolvedValue(10);

    await getProjectDashboardStats(mockRequest, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    const payload = (mockResponse.json as jest.MockedFunction<any>).mock.calls[0][0];

    expect(payload.projectId).toBe(VALID_PROJECT_ID);
    expect(payload.projectName).toBe('Payments App');
    expect(payload.suitesCount).toBe(5);
    expect(payload.casesCount).toBe(10);
    expect(payload.ticketsByStatus).toEqual([
      { status: TicketStatus.Open, count: 3 },
      { status: TicketStatus.InProgress, count: 0 },
      { status: TicketStatus.Resolved, count: 2 },
      { status: TicketStatus.Closed, count: 0 },
      { status: TicketStatus.Reopened, count: 0 },
    ]);
    expect(payload.runsByStatus).toEqual([
      { status: TestRunStatus.Draft, count: 0 },
      { status: TestRunStatus.InProgress, count: 1 },
      { status: TestRunStatus.Completed, count: 4 },
      { status: TestRunStatus.Abandoned, count: 0 },
    ]);
  });

  it('should zero-fill when a project has no tickets or runs', async () => {
    (mockProject.findOne as jest.MockedFunction<any>).mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({
        _id: VALID_PROJECT_ID,
        name: 'Empty Project',
      }),
    });
    mockTicket.aggregate.mockResolvedValue([]);
    mockTestRun.aggregate.mockResolvedValue([]);
    mockTestSuite.countDocuments.mockResolvedValue(0);
    mockTestCase.countDocuments.mockResolvedValue(0);

    await getProjectDashboardStats(mockRequest, mockResponse as any);

    const payload = (mockResponse.json as jest.MockedFunction<any>).mock.calls[0][0];

    expect(payload.suitesCount).toBe(0);
    expect(payload.casesCount).toBe(0);
    expect(payload.ticketsByStatus.every((item: { count: number }) => item.count === 0)).toBe(true);
    expect(payload.runsByStatus.every((item: { count: number }) => item.count === 0)).toBe(true);
  });
});
