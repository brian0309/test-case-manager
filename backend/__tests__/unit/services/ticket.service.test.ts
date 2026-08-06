import { describe, it, expect, jest } from '@jest/globals';
import { Types } from 'mongoose';

jest.mock('../../../models/ticket.model');
jest.mock('../../../models/testRun.model');
jest.mock('../../../models/testCase.model');

import * as ticketService from '../../../services/ticket/services/ticket.service';
import { Ticket } from '../../../models/ticket.model';
import { TestRun } from '../../../models/testRun.model';
import { TestCase } from '../../../models/testCase.model';
import { FailureType, ReturnReason, TicketStatus } from '../../../services/ticket/types/ticket.types';

const mockFindById = Ticket.findById as jest.Mock;
const mockFindByIdAndUpdate = Ticket.findByIdAndUpdate as jest.Mock;
const mockTestRunFindById = TestRun.findById as jest.Mock;
const mockTestCaseFindById = TestCase.findById as jest.Mock;

const buildChain = (value: any): any => ({
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn(() => Promise.resolve(value)),
});

const makeFullTicket = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  title: 'Checkout fails',
  description: 'desc',
  projectId: new Types.ObjectId(),
  status: TicketStatus.Open,
  priority: 'High',
  severity: 'Major',
  createdBy: { _id: new Types.ObjectId(), name: 'Tester', profilePicture: null },
  assignedTo: undefined,
  attachments: [],
  tags: [],
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

describe('ticketService - suggestFailureType', () => {
  it('returns Functional for crash keywords', () => {
    expect(ticketService.suggestFailureType('app crashes on login')).toBe(FailureType.Functional);
  });

  it('returns UI/UX for layout keywords', () => {
    expect(ticketService.suggestFailureType('rendering looks off on mobile')).toBe(FailureType.UIUX);
  });

  it('returns Data/API for status codes', () => {
    expect(ticketService.suggestFailureType('api endpoint returned 401 response')).toBe(FailureType.DataAPI);
  });

  it('returns Environment/Setup for build keywords', () => {
    expect(ticketService.suggestFailureType('staging deploy config is missing')).toBe(FailureType.EnvironmentSetup);
  });

  it('returns Other when nothing matches', () => {
    expect(ticketService.suggestFailureType('unrelated prose here')).toBe(FailureType.Other);
    expect(ticketService.suggestFailureType('')).toBe(FailureType.Other);
  });
});

describe('ticketService - computeDivergence', () => {
  const runId = new Types.ObjectId().toString();
  const itemId = new Types.ObjectId().toString();
  const caseId = new Types.ObjectId().toString();

  const snapshot = {
    title: 'Old title',
    priority: 'High',
    area: 'Checkout',
    expectedResult: '<p>Order saved</p>',
    testDescription: 'Verify checkout',
    stepsContent: '<p>Step 1</p><p>Step 2</p>',
  };

  it('returns unchanged when the ticket has no run link', async () => {
    const result = await ticketService.computeDivergence({});
    expect(result).toEqual({
      hasDiverged: false,
      sourceCaseDeleted: false,
      caseId: undefined,
      changedFields: [],
    });
  });

  it('returns unchanged when the run does not exist', async () => {
    mockTestRunFindById.mockReturnValue(buildChain(null));
    const result = await ticketService.computeDivergence({ relatedRunId: runId, relatedRunItemId: itemId });
    expect(result.hasDiverged).toBe(false);
    expect(result.changedFields).toEqual([]);
  });

  it('returns unchanged when the run item is missing', async () => {
    mockTestRunFindById.mockReturnValue(buildChain({ items: [] }));
    const result = await ticketService.computeDivergence({ relatedRunId: runId, relatedRunItemId: itemId });
    expect(result.hasDiverged).toBe(false);
  });

  it('flags a deleted source test case', async () => {
    mockTestRunFindById.mockReturnValue(
      buildChain({ items: [{ _id: new Types.ObjectId(itemId), caseId: new Types.ObjectId(caseId), caseSnapshot: snapshot }] })
    );
    mockTestCaseFindById.mockReturnValue(buildChain(null));

    const result = await ticketService.computeDivergence({ relatedRunId: runId, relatedRunItemId: itemId });
    expect(result.hasDiverged).toBe(true);
    expect(result.sourceCaseDeleted).toBe(true);
    expect(result.caseId).toBe(caseId);
  });

  it('reports the changed fields between snapshot and live case', async () => {
    mockTestRunFindById.mockReturnValue(
      buildChain({ items: [{ _id: new Types.ObjectId(itemId), caseId: new Types.ObjectId(caseId), caseSnapshot: snapshot }] })
    );
    mockTestCaseFindById.mockReturnValue(
      buildChain({ ...snapshot, title: 'New title', area: 'Payments' })
    );

    const result = await ticketService.computeDivergence({ relatedRunId: runId, relatedRunItemId: itemId });
    expect(result.hasDiverged).toBe(true);
    expect(result.sourceCaseDeleted).toBe(false);
    expect(result.changedFields.map((f) => f.field)).toEqual(['title', 'area']);
    const titleField = result.changedFields.find((f) => f.field === 'title');
    expect(titleField?.snapshotValue).toBe('Old title');
    expect(titleField?.liveValue).toBe('New title');
  });

  it('ignores formatting-only differences in html fields', async () => {
    const richSnapshot = { ...snapshot, stepsContent: '<p>Step 1</p>  <p>Step 2</p>' };
    mockTestRunFindById.mockReturnValue(
      buildChain({ items: [{ _id: new Types.ObjectId(itemId), caseId: new Types.ObjectId(caseId), caseSnapshot: richSnapshot }] })
    );
    mockTestCaseFindById.mockReturnValue(
      buildChain({ ...snapshot, stepsContent: '<p>Step 1</p>\n<p>Step 2</p>', expectedResult: 'Order saved' })
    );

    const result = await ticketService.computeDivergence({ relatedRunId: runId, relatedRunItemId: itemId });
    expect(result.hasDiverged).toBe(false);
    expect(result.changedFields).toEqual([]);
  });
});

describe('ticketService - markTicketReproduced', () => {
  it('sets firstReproducedAt when unset', async () => {
    const ticket = makeFullTicket({ firstReproducedAt: undefined });
    const updated = makeFullTicket({ firstReproducedAt: new Date('2026-02-01T09:00:00.000Z') });

    mockFindById
      .mockReturnValueOnce(buildChain(ticket))
      .mockReturnValueOnce(buildChain(updated));
    mockFindByIdAndUpdate.mockReturnValue({});

    const result = await ticketService.markTicketReproduced(ticket._id.toString());

    expect(mockFindByIdAndUpdate).toHaveBeenCalledTimes(1);
    const [, updatePayload] = mockFindByIdAndUpdate.mock.calls[0] as [unknown, any];
    expect(updatePayload).toEqual({ $set: { firstReproducedAt: expect.any(Date) } });
    expect(result?.firstReproducedAt).toBe('2026-02-01T09:00:00.000Z');
  });

  it('keeps the original timestamp on repeated calls (idempotent)', async () => {
    const ticket = makeFullTicket({ firstReproducedAt: new Date('2026-01-15T08:00:00.000Z') });

    mockFindById.mockReturnValue(buildChain(ticket));

    const result = await ticketService.markTicketReproduced(ticket._id.toString());

    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(result?.firstReproducedAt).toBe('2026-01-15T08:00:00.000Z');
  });

  it('returns null when the ticket does not exist', async () => {
    mockFindById.mockReturnValue(buildChain(null));
    const result = await ticketService.markTicketReproduced(new Types.ObjectId().toString());
    expect(result).toBeNull();
  });
});

describe('ticketService - returnTicketForInfo', () => {
  it('reopens the ticket and increments the return counter', async () => {
    const updated = makeFullTicket({
      status: TicketStatus.Reopened,
      returnedCount: 2,
      lastReturnReason: ReturnReason.MissingSteps,
      lastReturnedAt: new Date('2026-03-01T12:00:00.000Z'),
    });
    mockFindByIdAndUpdate.mockReturnValue(buildChain(updated));

    const result = await ticketService.returnTicketForInfo(updated._id.toString(), {
      reason: ReturnReason.MissingSteps,
    });

    expect(mockFindByIdAndUpdate).toHaveBeenCalledTimes(1);
    const [, updatePayload] = mockFindByIdAndUpdate.mock.calls[0] as [unknown, any];
    expect(updatePayload.$set.status).toBe(TicketStatus.Reopened);
    expect(updatePayload.$set.lastReturnReason).toBe(ReturnReason.MissingSteps);
    expect(updatePayload.$set.lastReturnedAt).toEqual(expect.any(Date));
    expect(updatePayload.$inc).toEqual({ returnedCount: 1 });

    expect(result?.status).toBe(TicketStatus.Reopened);
    expect(result?.returnedCount).toBe(2);
    expect(result?.lastReturnReason).toBe(ReturnReason.MissingSteps);
  });

  it('returns null when the ticket does not exist', async () => {
    mockFindByIdAndUpdate.mockReturnValue(buildChain(null));
    const result = await ticketService.returnTicketForInfo(new Types.ObjectId().toString(), {
      reason: ReturnReason.Other,
    });
    expect(result).toBeNull();
  });
});
