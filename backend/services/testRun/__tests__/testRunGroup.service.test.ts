import { Types } from "mongoose";

// Mock all models before importing services
jest.mock("../../../models/testRunGroup.model.js");
jest.mock("../../testCase/services/project.service.js");

import { TestRunGroup } from "../../../models/testRunGroup.model.js";
import * as projectService from "../../testCase/services/project.service.js";
import * as testRunGroupService from "../services/testRunGroup.service.js";

const mockTestRunGroup = TestRunGroup as any;

describe("Test Run Group Service", () => {
  let testUserId: string;
  let testUser2Id: string;
  let testProjectId: string;
  let testGroupId: string;
  let hasProjectAccessSpy: any;

  beforeAll(() => {
    testUserId = new Types.ObjectId().toString();
    testUser2Id = new Types.ObjectId().toString();
    testProjectId = new Types.ObjectId().toString();
    testGroupId = new Types.ObjectId().toString();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    hasProjectAccessSpy = jest.spyOn(projectService, 'hasProjectAccess').mockResolvedValue(true);
  });

  afterEach(() => {
    hasProjectAccessSpy.mockRestore();
  });

  describe("createTestRunGroup", () => {
    it("should create a test run group with valid data", async () => {
      const mockGroupDoc = {
        _id: new Types.ObjectId(testGroupId),
        name: "Sprint 1 Tests",
        description: "Tests for Sprint 1",
        projectId: new Types.ObjectId(testProjectId),
        color: "bg-green-500",
        createdBy: new Types.ObjectId(testUserId),
        save: jest.fn().mockResolvedValue(true),
      };

      (TestRunGroup as any).mockImplementation(() => mockGroupDoc);

      const group = await testRunGroupService.createTestRunGroup(testProjectId, testUserId, {
        name: "Sprint 1 Tests",
        description: "Tests for Sprint 1",
        color: "bg-green-500",
      });

      expect(group).toBeDefined();
      expect(group?.name).toBe("Sprint 1 Tests");
      expect(group?.color).toBe("bg-green-500");
      expect(mockGroupDoc.save).toHaveBeenCalled();
    });

    it("should use default color when not provided", async () => {
      const mockGroupDoc = {
        _id: new Types.ObjectId(testGroupId),
        name: "Test Group",
        projectId: new Types.ObjectId(testProjectId),
        color: "bg-blue-500",
        createdBy: new Types.ObjectId(testUserId),
        save: jest.fn().mockResolvedValue(true),
      };

      (TestRunGroup as any).mockImplementation(() => mockGroupDoc);

      const group = await testRunGroupService.createTestRunGroup(testProjectId, testUserId, {
        name: "Test Group",
      });

      expect(group).toBeDefined();
      expect(group?.color).toBe("bg-blue-500");
    });

    it("should return null if user has no project access", async () => {
      hasProjectAccessSpy.mockResolvedValueOnce(false);

      const group = await testRunGroupService.createTestRunGroup(testProjectId, testUser2Id, {
        name: "Test Group",
      });

      expect(group).toBeNull();
    });
  });

  describe("getTestRunGroupsByProject", () => {
    it("should return test run groups for a project", async () => {
      const mockGroups = [
        {
          _id: new Types.ObjectId(),
          name: "Group 1",
          projectId: new Types.ObjectId(testProjectId),
        },
        {
          _id: new Types.ObjectId(),
          name: "Group 2",
          projectId: new Types.ObjectId(testProjectId),
        },
      ];

      mockTestRunGroup.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockGroups),
          }),
        }),
      });

      const groups = await testRunGroupService.getTestRunGroupsByProject(testProjectId, testUserId);

      expect(groups).toHaveLength(2);
    });

    it("should return empty array if user has no project access", async () => {
      hasProjectAccessSpy.mockResolvedValueOnce(false);

      const groups = await testRunGroupService.getTestRunGroupsByProject(testProjectId, testUser2Id);

      expect(groups).toEqual([]);
    });
  });

  describe("getTestRunGroupById", () => {
    it("should return a test run group by ID", async () => {
      const mockGroupData = {
        _id: new Types.ObjectId(testGroupId),
        name: "Test Group",
        projectId: new Types.ObjectId(testProjectId),
        color: "bg-blue-500",
        createdBy: { _id: new Types.ObjectId(testUserId), name: "Test User" },
      };

      mockTestRunGroup.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockGroupData),
        }),
      });

      const group = await testRunGroupService.getTestRunGroupById(testGroupId, testUserId);

      expect(group).toBeDefined();
      expect(group?.name).toBe("Test Group");
    });

    it("should return null if group not found", async () => {
      mockTestRunGroup.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const group = await testRunGroupService.getTestRunGroupById(testGroupId, testUserId);

      expect(group).toBeNull();
    });

    it("should return null if user has no project access", async () => {
      const mockGroupData = {
        _id: new Types.ObjectId(testGroupId),
        name: "Test Group",
        projectId: new Types.ObjectId(testProjectId),
      };

      mockTestRunGroup.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockGroupData),
        }),
      });

      hasProjectAccessSpy.mockResolvedValueOnce(false);

      const group = await testRunGroupService.getTestRunGroupById(testGroupId, testUser2Id);

      expect(group).toBeNull();
    });
  });

  describe("updateTestRunGroup", () => {
    it("should update a test run group", async () => {
      const mockGroupDoc = {
        _id: new Types.ObjectId(testGroupId),
        name: "Original Name",
        projectId: new Types.ObjectId(testProjectId),
        color: "bg-blue-500",
        save: jest.fn().mockResolvedValue(true),
      };

      mockTestRunGroup.findById = jest.fn()
        .mockResolvedValueOnce(mockGroupDoc)
        .mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
              ...mockGroupDoc,
              name: "Updated Name",
              color: "bg-red-500",
            }),
          }),
        });

      const updated = await testRunGroupService.updateTestRunGroup(testGroupId, testUserId, {
        name: "Updated Name",
        color: "bg-red-500",
      });

      expect(updated).toBeDefined();
      expect(mockGroupDoc.save).toHaveBeenCalled();
    });

    it("should return null if group not found", async () => {
      mockTestRunGroup.findById = jest.fn().mockResolvedValue(null);

      const updated = await testRunGroupService.updateTestRunGroup(testGroupId, testUserId, {
        name: "Updated Name",
      });

      expect(updated).toBeNull();
    });

    it("should return null if user has no project access", async () => {
      const mockGroupDoc = {
        _id: new Types.ObjectId(testGroupId),
        name: "Test Group",
        projectId: new Types.ObjectId(testProjectId),
      };

      mockTestRunGroup.findById = jest.fn().mockResolvedValue(mockGroupDoc);
      hasProjectAccessSpy.mockResolvedValueOnce(false);

      const updated = await testRunGroupService.updateTestRunGroup(testGroupId, testUser2Id, {
        name: "Updated Name",
      });

      expect(updated).toBeNull();
    });
  });

  describe("deleteTestRunGroup", () => {
    it("should delete a test run group", async () => {
      mockTestRunGroup.findById = jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(testGroupId),
        projectId: new Types.ObjectId(testProjectId),
      });

      mockTestRunGroup.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const deleted = await testRunGroupService.deleteTestRunGroup(testGroupId, testUserId);

      expect(deleted).toBe(true);
      expect(mockTestRunGroup.deleteOne).toHaveBeenCalled();
    });

    it("should return false if group not found", async () => {
      mockTestRunGroup.findById = jest.fn().mockResolvedValue(null);

      const deleted = await testRunGroupService.deleteTestRunGroup(testGroupId, testUserId);

      expect(deleted).toBe(false);
    });

    it("should return false if user has no project access", async () => {
      mockTestRunGroup.findById = jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(testGroupId),
        projectId: new Types.ObjectId(testProjectId),
      });

      hasProjectAccessSpy.mockResolvedValueOnce(false);

      const deleted = await testRunGroupService.deleteTestRunGroup(testGroupId, testUser2Id);

      expect(deleted).toBe(false);
    });
  });

  describe("formatTestRunGroupResponse", () => {
    it("should format test run group for API response", () => {
      const mockGroupData = {
        _id: new Types.ObjectId(testGroupId),
        name: "Test Group",
        description: "Group description",
        projectId: new Types.ObjectId(testProjectId),
        color: "bg-green-500",
        createdBy: { _id: new Types.ObjectId(testUserId), name: "Test User" },
        createdAt: new Date("2024-01-15T10:00:00Z"),
        updatedAt: new Date("2024-01-15T12:00:00Z"),
      };

      const response = testRunGroupService.formatTestRunGroupResponse(mockGroupData);

      expect(response.id).toBe(testGroupId);
      expect(response.name).toBe("Test Group");
      expect(response.description).toBe("Group description");
      expect(response.color).toBe("bg-green-500");
      expect(response.createdBy.name).toBe("Test User");
    });

    it("should handle missing createdBy", () => {
      const mockGroupData = {
        _id: new Types.ObjectId(testGroupId),
        name: "Test Group",
        projectId: new Types.ObjectId(testProjectId),
        color: "bg-blue-500",
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = testRunGroupService.formatTestRunGroupResponse(mockGroupData);

      expect(response.createdBy.name).toBe("Unassigned");
      expect(response.createdBy.id).toBe("");
    });
  });
});
