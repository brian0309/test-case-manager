import { Types } from "mongoose";
import { Priority, Status, IProjectDocument, ITestSuiteDocument, ITestCaseDocument } from "../types/testCase.types.js";

// Mock all models before importing services
jest.mock("../../../models/project.model.js");
jest.mock("../../../models/testSuite.model.js");
jest.mock("../../../models/testCase.model.js");
jest.mock("../../../models/user.model.js");

import { Project } from "../../../models/project.model.js";
import { TestSuite } from "../../../models/testSuite.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import { User } from "../../../models/user.model.js";
import * as projectService from "../services/project.service.js";
import * as testSuiteService from "../services/testSuite.service.js";
import * as testCaseService from "../services/testCase.service.js";

const mockProject = Project as jest.Mocked<typeof Project>;
const mockTestSuite = TestSuite as jest.Mocked<typeof TestSuite>;
const mockTestCase = TestCase as jest.Mocked<typeof TestCase>;
const mockUser = User as jest.Mocked<typeof User>;

describe("Test Case Management Services", () => {
  let testUserId: string;
  let testUser2Id: string;
  let testProjectId: string;
  let testSuiteId: string;
  let hasProjectAccessSpy: jest.SpyInstance;

  beforeAll(() => {
    testUserId = new Types.ObjectId().toString();
    testUser2Id = new Types.ObjectId().toString();
    testProjectId = new Types.ObjectId().toString();
    testSuiteId = new Types.ObjectId().toString();

    // Mock projectService.hasProjectAccess to always return true for tests
    hasProjectAccessSpy = jest.spyOn(projectService, 'hasProjectAccess').mockResolvedValue(true);
  });

  beforeEach(() => {
    // Don't clear model constructors, only clear method mocks
    jest.restoreAllMocks();
    // Re-setup the spy after clearing
    hasProjectAccessSpy = jest.spyOn(projectService, 'hasProjectAccess').mockResolvedValue(true);
  });

  afterAll(() => {
    hasProjectAccessSpy.mockRestore();
  });

  describe("Project Service", () => {
    it("should create a project", async () => {
      const mockProjectDoc = {
        _id: new Types.ObjectId(testProjectId),
        name: "Test Project",
        description: "A test project",
        color: "bg-blue-500",
        ownerId: new Types.ObjectId(testUserId),
        members: [new Types.ObjectId(testUserId)],
        save: jest.fn().mockResolvedValue(true),
      };

      (Project as any).mockImplementation(() => mockProjectDoc);

      const project = await projectService.createProject(testUserId, {
        name: "Test Project",
        description: "A test project",
        color: "bg-blue-500",
      });

      expect(project).toBeDefined();
      expect(project.name).toBe("Test Project");
      expect(project.ownerId.toString()).toBe(testUserId);
      expect(project.members).toHaveLength(1);
    });

    it("should get projects by user", async () => {
      const mockProjects = [
        {
          _id: new Types.ObjectId(),
          name: "Project 1",
          ownerId: new Types.ObjectId(testUserId),
          members: [new Types.ObjectId(testUserId)],
        },
        {
          _id: new Types.ObjectId(),
          name: "Project 2",
          ownerId: new Types.ObjectId(testUserId),
          members: [new Types.ObjectId(testUserId)],
        },
      ];

      mockProject.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockProjects),
          }),
        }),
      });

      const projects = await projectService.getProjectsByUser(testUserId);
      expect(projects).toHaveLength(2);
    });

    it("should update a project (owner only)", async () => {
      const mockProjectDoc = {
        _id: new Types.ObjectId(testProjectId),
        name: "Updated Name",
        ownerId: new Types.ObjectId(testUserId),
        members: [new Types.ObjectId(testUserId)],
      };

      mockProject.findOneAndUpdate = jest.fn()
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockProjectDoc),
          }),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        });

      const updated = await projectService.updateProject(testProjectId, testUserId, {
        name: "Updated Name",
      });

      expect(updated?.name).toBe("Updated Name");

      // Non-owner cannot update
      const nonOwnerUpdate = await projectService.updateProject(
        testProjectId,
        testUser2Id,
        { name: "Hacked" }
      );
      expect(nonOwnerUpdate).toBeNull();
    });

    it("should delete a project with cascade", async () => {
      mockProject.findOne = jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(testProjectId),
        ownerId: new Types.ObjectId(testUserId),
      });

      mockTestCase.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
      mockTestSuite.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
      mockProject.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const deleted = await projectService.deleteProject(testProjectId, testUserId);
      expect(deleted).toBe(true);

      // Verify cascade was called
      expect(mockTestCase.deleteMany).toHaveBeenCalled();
      expect(mockTestSuite.deleteMany).toHaveBeenCalled();
      expect(mockProject.deleteOne).toHaveBeenCalled();
    });

    it("should add and remove project members", async () => {
      const mockUser2 = {
        _id: new Types.ObjectId(testUser2Id),
        email: "testuser2@example.com",
      };

      mockUser.findOne = jest.fn().mockResolvedValue(mockUser2);

      const mockProjectWithMember = {
        _id: new Types.ObjectId(testProjectId),
        name: "Team Project",
        ownerId: new Types.ObjectId(testUserId),
        members: [new Types.ObjectId(testUserId), new Types.ObjectId(testUser2Id)],
      };

      const mockProjectWithoutMember = {
        _id: new Types.ObjectId(testProjectId),
        name: "Team Project",
        ownerId: new Types.ObjectId(testUserId),
        members: [new Types.ObjectId(testUserId)],
      };

      // Add member
      mockProject.findOneAndUpdate = jest.fn()
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockProjectWithMember),
          }),
        });

      const updated = await projectService.addProjectMember(
        testProjectId,
        testUserId,
        "testuser2@example.com"
      );
      expect(updated?.members).toHaveLength(2);

      // Remove member
      mockProject.findOneAndUpdate = jest.fn()
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockProjectWithoutMember),
          }),
        });

      const removed = await projectService.removeProjectMember(
        testProjectId,
        testUserId,
        testUser2Id
      );
      expect(removed?.members).toHaveLength(1);
    });
  });

  describe("TestSuite Service", () => {
    it("should create a test suite", async () => {
      const mockSuiteDoc = {
        _id: new Types.ObjectId(testSuiteId),
        name: "Authentication Suite",
        description: "Tests for auth flows",
        projectId: new Types.ObjectId(testProjectId),
        save: jest.fn().mockResolvedValue(true),
      };

      (TestSuite as any).mockImplementation(() => mockSuiteDoc);

      const suite = await testSuiteService.createTestSuite(testProjectId, testUserId, {
        name: "Authentication Suite",
        description: "Tests for auth flows",
      });

      expect(suite).toBeDefined();
      expect(suite?.name).toBe("Authentication Suite");
    });

    it("should get suites by project", async () => {
      const mockSuites = [
        {
          _id: new Types.ObjectId(),
          name: "Suite 1",
          projectId: new Types.ObjectId(testProjectId),
        },
        {
          _id: new Types.ObjectId(),
          name: "Suite 2",
          projectId: new Types.ObjectId(testProjectId),
        },
      ];

      mockTestSuite.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockSuites),
        }),
      });

      const suites = await testSuiteService.getTestSuitesByProject(
        testProjectId,
        testUserId
      );
      expect(suites).toHaveLength(2);
    });

    it("should deny access to non-members", async () => {
      // Mock hasProjectAccess to return false for user2
      hasProjectAccessSpy.mockResolvedValueOnce(false);

      // Mock TestSuite.findById to return a suite with lean()
      mockTestSuite.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(testSuiteId),
          projectId: new Types.ObjectId(testProjectId),
        }),
      });

      const accessedSuite = await testSuiteService.getTestSuiteById(
        testSuiteId,
        testUser2Id
      );
      expect(accessedSuite).toBeNull();
    });
  });

  describe("TestCase Service", () => {
    it("should create a test case", async () => {
      // Mock suite with project info
      mockTestSuite.findById = jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(testSuiteId),
        projectId: new Types.ObjectId(testProjectId),
      });

      const mockTestCaseDoc = {
        _id: new Types.ObjectId(),
        title: "Verify Login",
        priority: Priority.High,
        status: Status.Draft,
        area: "Authentication",
        suiteId: new Types.ObjectId(testSuiteId),
        projectId: new Types.ObjectId(testProjectId),
        save: jest.fn().mockResolvedValue(true),
      };

      (TestCase as any).mockImplementation(() => mockTestCaseDoc);

      const testCase = await testCaseService.createTestCase(testSuiteId, testUserId, {
        title: "Verify Login",
        priority: Priority.High,
        status: Status.Draft,
        area: "Authentication",
      });

      expect(testCase).toBeDefined();
      expect(testCase?.title).toBe("Verify Login");
      expect(testCase?.priority).toBe(Priority.High);
    });

    it("should update a test case with history", async () => {
      const testCaseId = new Types.ObjectId().toString();

      const mockExistingCase = {
        _id: new Types.ObjectId(testCaseId),
        title: "Original Title",
        priority: Priority.Low,
        suiteId: new Types.ObjectId(testSuiteId),
        projectId: new Types.ObjectId(testProjectId),
        history: [],
        customFields: {},
        toObject: jest.fn().mockReturnValue({
          title: "Original Title",
          priority: Priority.Low,
        }),
      };

      const mockUpdatedCase = {
        _id: new Types.ObjectId(testCaseId),
        title: "Updated Title",
        priority: Priority.High,
        suiteId: new Types.ObjectId(testSuiteId),
        projectId: new Types.ObjectId(testProjectId),
        history: [{
          changedBy: new Types.ObjectId(testUserId),
          changedFields: ["title", "priority"],
          changedAt: new Date(),
        }],
      };

      // Mock findById for getting existing case in the update function
      mockTestCase.findById = jest.fn().mockResolvedValue(mockExistingCase);

      // Mock findByIdAndUpdate for updating
      const populateChain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUpdatedCase),
      };
      populateChain.populate = jest.fn().mockReturnValue(populateChain);

      mockTestCase.findByIdAndUpdate = jest.fn().mockReturnValue(populateChain);

      const updated = await testCaseService.updateTestCase(
        testCaseId,
        testUserId,
        {
          title: "Updated Title",
          priority: Priority.High,
        }
      );

      expect(updated).toBeDefined();
      expect(updated?.title).toBe("Updated Title");
      expect(updated?.history).toHaveLength(1);
      expect(updated?.history[0].changedFields).toContain("title");
      expect(updated?.history[0].changedFields).toContain("priority");
    });

    it("should get test cases by suite", async () => {
      // Mock suite with project info
      mockTestSuite.findById = jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(testSuiteId),
        projectId: new Types.ObjectId(testProjectId),
      });

      const mockCases = [
        {
          _id: new Types.ObjectId(),
          title: "Test 1",
          suiteId: new Types.ObjectId(testSuiteId),
        },
        {
          _id: new Types.ObjectId(),
          title: "Test 2",
          suiteId: new Types.ObjectId(testSuiteId),
        },
      ];

      // Mock the first find for unordered cases (return empty)
      const findMock1 = {
        sort: jest.fn().mockResolvedValue([]),
      };

      // Mock the second find for actual test cases
      const populateChain2 = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockCases),
        }),
      };
      populateChain2.populate = jest.fn().mockReturnValue(populateChain2);

      const findMock2 = populateChain2;

      // Set up find to return different mocks on different calls
      mockTestCase.find = jest.fn()
        .mockReturnValueOnce(findMock1)  // First call for unordered cases
        .mockReturnValueOnce(findMock2); // Second call for actual cases

      const cases = await testCaseService.getTestCasesBySuite(testSuiteId, testUserId);
      expect(cases).toHaveLength(2);
    });

    it("should bulk update status", async () => {
      const case1Id = new Types.ObjectId().toString();
      const case2Id = new Types.ObjectId().toString();

      // Mock updateTestCase to return success for each call
      const updateSpy = jest.spyOn(testCaseService, 'updateTestCase')
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(case1Id),
          status: Status.Passed,
        } as any)
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(case2Id),
          status: Status.Passed,
        } as any);

      const updatedCount = await testCaseService.bulkUpdateStatus(
        [case1Id, case2Id],
        testUserId,
        Status.Passed
      );

      expect(updatedCount).toBe(2);
      expect(updateSpy).toHaveBeenCalledTimes(2);

      updateSpy.mockRestore();
    });
  });
});
