import { Types } from "mongoose";
import { TestRunStatus, RunItemStatus } from "../types/testRun.types.js";

// Mock all models before importing services
jest.mock("../../../models/testRun.model.js");
jest.mock("../../../models/testCase.model.js");
jest.mock("../../../models/testSuite.model.js");
jest.mock("../../testCase/services/project.service.js");

import { TestRun } from "../../../models/testRun.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import { TestSuite } from "../../../models/testSuite.model.js";
import * as projectService from "../../testCase/services/project.service.js";
import * as testRunService from "../services/testRun.service.js";

const mockTestRun = TestRun as any;
const mockTestCase = TestCase as any;

describe("Test Run Service", () => {
  let testUserId: string;
  let testUser2Id: string;
  let testProjectId: string;
  let testSuiteId: string;
  let testRunId: string;
  let hasProjectAccessSpy: any;

  beforeAll(() => {
    testUserId = new Types.ObjectId().toString();
    testUser2Id = new Types.ObjectId().toString();
    testProjectId = new Types.ObjectId().toString();
    testSuiteId = new Types.ObjectId().toString();
    testRunId = new Types.ObjectId().toString();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    hasProjectAccessSpy = jest.spyOn(projectService, 'hasProjectAccess').mockResolvedValue(true);
  });

  afterEach(() => {
    hasProjectAccessSpy.mockRestore();
  });

  describe("createTestRun", () => {
    it("should create a test run with valid data", async () => {
      const testCaseId = new Types.ObjectId();
      const saveMock = jest.fn().mockResolvedValue(true);
      const mockTestCases = [
        {
          _id: testCaseId,
          title: "Login Test",
          priority: "High",
          suiteId: { _id: new Types.ObjectId(testSuiteId), name: "Authentication" },
          area: "Authentication",
          expectedResult: "User is logged in",
          testDescription: "Test login functionality",
          stepsContent: "1. Enter credentials\n2. Click login",
          projectId: new Types.ObjectId(testProjectId),
          assignedTester: new Types.ObjectId(testUserId),
        },
      ];

      mockTestCase.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTestCases),
        }),
        }),
      });

      (TestRun as any).mockImplementation((payload: any) => ({
        _id: new Types.ObjectId(testRunId),
        ...payload,
        save: saveMock,
      }));

      const testRun = await testRunService.createTestRun(testProjectId, testUserId, {
        title: "Sprint 1 Test Run",
        description: "Test run for sprint 1",
        suiteId: testSuiteId,
        environment: "staging",
        tags: ["regression"],
        testCaseIds: [testCaseId.toString()],
      });

      expect(testRun).toBeDefined();
      expect(testRun?.title).toBe("Sprint 1 Test Run");
      expect(testRun?.status).toBe(TestRunStatus.Draft);
      expect(testRun?.items).toHaveLength(1);
      expect(testRun?.items[0].caseSnapshot.suiteId).toBe(testSuiteId);
      expect(testRun?.items[0].caseSnapshot.suiteName).toBe("Authentication");
      expect(saveMock).toHaveBeenCalled();
    });

    it("should return null if user has no project access", async () => {
      hasProjectAccessSpy.mockResolvedValueOnce(false);

      const testRun = await testRunService.createTestRun(testProjectId, testUser2Id, {
        title: "Test Run",
        testCaseIds: [new Types.ObjectId().toString()],
      });

      expect(testRun).toBeNull();
    });

    it("should return null if no test cases are found", async () => {
      mockTestCase.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
        }),
      });

      const testRun = await testRunService.createTestRun(testProjectId, testUserId, {
        title: "Test Run",
        testCaseIds: [new Types.ObjectId().toString()],
      });

      expect(testRun).toBeNull();
    });
  });

  describe("getTestRunsByProject", () => {
    it("should return test runs for a project", async () => {
      const mockTestRuns = [
        {
          _id: new Types.ObjectId(),
          title: "Test Run 1",
          projectId: new Types.ObjectId(testProjectId),
          status: TestRunStatus.Draft,
        },
        {
          _id: new Types.ObjectId(),
          title: "Test Run 2",
          projectId: new Types.ObjectId(testProjectId),
          status: TestRunStatus.InProgress,
        },
      ];

      mockTestRun.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockTestRuns),
            }),
          }),
        }),
      });

      const testRuns = await testRunService.getTestRunsByProject(testProjectId, testUserId);

      expect(testRuns).toHaveLength(2);
    });

    it("should return empty array if user has no project access", async () => {
      hasProjectAccessSpy.mockResolvedValueOnce(false);

      const testRuns = await testRunService.getTestRunsByProject(testProjectId, testUser2Id);

      expect(testRuns).toEqual([]);
    });
  });

  describe("getTestRunById", () => {
    it("should return a test run by ID", async () => {
      const mockTestRunData = {
        _id: new Types.ObjectId(testRunId),
        title: "Test Run 1",
        projectId: new Types.ObjectId(testProjectId),
        status: TestRunStatus.Draft,
        items: [],
        createdBy: { _id: new Types.ObjectId(testUserId), name: "Test User" },
      };

      mockTestRun.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockTestRunData),
              }),
            }),
          }),
        }),
      });

      const testRun = await testRunService.getTestRunById(testRunId, testUserId);

      expect(testRun).toBeDefined();
      expect(testRun?.title).toBe("Test Run 1");
    });

    it("should return null if test run not found", async () => {
      mockTestRun.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
              }),
            }),
          }),
        }),
      });

      const testRun = await testRunService.getTestRunById(testRunId, testUserId);

      expect(testRun).toBeNull();
    });

    it("should return null if user has no project access", async () => {
      const mockTestRunData = {
        _id: new Types.ObjectId(testRunId),
        title: "Test Run 1",
        projectId: new Types.ObjectId(testProjectId),
      };

      mockTestRun.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockTestRunData),
              }),
            }),
          }),
        }),
      });

      hasProjectAccessSpy.mockResolvedValueOnce(false);

      const testRun = await testRunService.getTestRunById(testRunId, testUser2Id);

      expect(testRun).toBeNull();
    });
  });

  describe("deleteTestRun", () => {
    it("should delete a test run", async () => {
      mockTestRun.findById = jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(testRunId),
        projectId: new Types.ObjectId(testProjectId),
      });

      mockTestRun.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const deleted = await testRunService.deleteTestRun(testRunId, testUserId);

      expect(deleted).toEqual({ projectId: testProjectId });
      expect(mockTestRun.deleteOne).toHaveBeenCalled();
    });

    it("should return null if test run not found", async () => {
      mockTestRun.findById = jest.fn().mockResolvedValue(null);

      const deleted = await testRunService.deleteTestRun(testRunId, testUserId);

      expect(deleted).toBeNull();
    });

    it("should return null if user has no project access", async () => {
      mockTestRun.findById = jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(testRunId),
        projectId: new Types.ObjectId(testProjectId),
      });

      hasProjectAccessSpy.mockResolvedValueOnce(false);

      const deleted = await testRunService.deleteTestRun(testRunId, testUser2Id);

      expect(deleted).toBeNull();
    });
  });

  describe("formatTestRunResponse", () => {
    it("should format test run for API response", () => {
      const mockTestRunData = {
        _id: new Types.ObjectId(testRunId),
        title: "Test Run",
        description: "Description",
        projectId: new Types.ObjectId(testProjectId),
        suiteId: { _id: new Types.ObjectId(testSuiteId), name: "Test Suite" },
        groupId: new Types.ObjectId(),
        status: TestRunStatus.InProgress,
        environment: "staging",
        tags: ["regression"],
        items: [
          {
            _id: new Types.ObjectId(),
            caseId: new Types.ObjectId(),
            caseSnapshot: { title: "Test Case 1", suiteId: testSuiteId, suiteName: "Test Suite" },
            order: 0,
            status: RunItemStatus.Passed,
          },
        ],
        createdBy: { _id: new Types.ObjectId(testUserId), name: "Test User" },
        startedAt: new Date(),
        completedAt: null,
        resultsSummary: {
          total: 1,
          passed: 1,
          failed: 0,
          blocked: 0,
          skipped: 0,
          notRun: 0,
          passRate: 100,
          totalTimeSpent: 60,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = testRunService.formatTestRunResponse(mockTestRunData);

      expect(response.id).toBe(testRunId);
      expect(response.title).toBe("Test Run");
      expect(response.suiteName).toBe("Test Suite");
      expect(response.status).toBe(TestRunStatus.InProgress);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].caseSnapshot.suiteName).toBe("Test Suite");
      expect(response.createdBy.name).toBe("Test User");
    });

    it("should handle missing optional fields", () => {
      const mockTestRunData = {
        _id: new Types.ObjectId(testRunId),
        title: "Test Run",
        projectId: new Types.ObjectId(testProjectId),
        status: TestRunStatus.Draft,
        items: [],
        createdBy: null,
        resultsSummary: {
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          skipped: 0,
          notRun: 0,
          passRate: 0,
          totalTimeSpent: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = testRunService.formatTestRunResponse(mockTestRunData);

      expect(response.id).toBe(testRunId);
      expect(response.suiteName).toBeUndefined();
      expect(response.createdBy.name).toBe("Unassigned");
    });
  });

  describe("formatTestRunListResponse", () => {
    it("should format test run for list response", () => {
      const mockTestRunData = {
        _id: new Types.ObjectId(testRunId),
        title: "Test Run",
        projectId: new Types.ObjectId(testProjectId),
        status: TestRunStatus.Draft,
        items: [{ _id: new Types.ObjectId() }, { _id: new Types.ObjectId() }],
        createdBy: { _id: new Types.ObjectId(testUserId), name: "Test User" },
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = testRunService.formatTestRunListResponse(mockTestRunData);

      expect(response.id).toBe(testRunId);
      expect(response.itemCount).toBe(2);
      expect(response.createdBy.name).toBe("Test User");
    });
  });
});
