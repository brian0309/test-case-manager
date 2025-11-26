import { Types } from "mongoose";
import { Project } from "../../../models/project.model.js";
import { TestSuite } from "../../../models/testSuite.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import { User } from "../../../models/user.model.js";
import * as projectService from "../services/project.service.js";
import * as testSuiteService from "../services/testSuite.service.js";
import * as testCaseService from "../services/testCase.service.js";
import { Priority, Status, IProjectDocument, ITestSuiteDocument, ITestCaseDocument } from "../types/testCase.types.js";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../../../__tests__/setup/testDb.js";

describe("Test Case Management Services", () => {
  let testUserId: string;
  let testUser2Id: string;
  let testProjectId: string;
  let testSuiteId: string;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Create test users
    const user1 = await User.create({
      email: "testuser1@example.com",
      password: "hashedpassword",
      name: "Test User 1",
      isVerified: true,
    });
    testUserId = ((user1 as any)._id).toString();

    const user2 = await User.create({
      email: "testuser2@example.com",
      password: "hashedpassword",
      name: "Test User 2",
      isVerified: true,
    });
    testUser2Id = ((user2 as any)._id).toString();
  });

  describe("Project Service", () => {
    it("should create a project", async () => {
      const project = await projectService.createProject(testUserId, {
        name: "Test Project",
        description: "A test project",
        color: "bg-blue-500",
      });

      expect(project).toBeDefined();
      expect(project.name).toBe("Test Project");
      expect(project.ownerId.toString()).toBe(testUserId);
      expect(project.members).toHaveLength(1);
      testProjectId = ((project as any)._id as Types.ObjectId).toString();
    });

    it("should get projects by user", async () => {
      await projectService.createProject(testUserId, { name: "Project 1" });
      await projectService.createProject(testUserId, { name: "Project 2" });
      await projectService.createProject(testUser2Id, { name: "Other Project" });

      const projects = await projectService.getProjectsByUser(testUserId);
      expect(projects).toHaveLength(2);
    });

    it("should update a project (owner only)", async () => {
      const project = await projectService.createProject(testUserId, {
        name: "Original Name",
      });
      testProjectId = ((project as any)._id as Types.ObjectId).toString();

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
      const project = await projectService.createProject(testUserId, {
        name: "To Delete",
      });
      testProjectId = ((project as any)._id as Types.ObjectId).toString();

      // Create suite and test case
      const suite = await testSuiteService.createTestSuite(testProjectId, testUserId, {
        name: "Suite",
      });
      testSuiteId = ((suite as any)._id as Types.ObjectId).toString();

      await testCaseService.createTestCase(testSuiteId, testUserId, {
        title: "Test Case",
      });

      // Delete project
      const deleted = await projectService.deleteProject(testProjectId, testUserId);
      expect(deleted).toBe(true);

      // Verify cascade
      const suites = await TestSuite.find({ projectId: testProjectId });
      const cases = await TestCase.find({ projectId: testProjectId });
      expect(suites).toHaveLength(0);
      expect(cases).toHaveLength(0);
    });

    it("should add and remove project members", async () => {
      const project = await projectService.createProject(testUserId, {
        name: "Team Project",
      });
      testProjectId = ((project as any)._id as Types.ObjectId).toString();

      // Add member
      const updated = await projectService.addProjectMember(
        testProjectId,
        testUserId,
        "testuser2@example.com"
      );
      expect(updated?.members).toHaveLength(2);

      // Remove member
      const removed = await projectService.removeProjectMember(
        testProjectId,
        testUserId,
        testUser2Id
      );
      expect(removed?.members).toHaveLength(1);
    });
  });

  describe("TestSuite Service", () => {
    beforeEach(async () => {
      const project = await projectService.createProject(testUserId, {
        name: "Test Project",
      });
      testProjectId = ((project as any)._id as Types.ObjectId).toString();
    });

    it("should create a test suite", async () => {
      const suite = await testSuiteService.createTestSuite(testProjectId, testUserId, {
        name: "Authentication Suite",
        description: "Tests for auth flows",
      });

      expect(suite).toBeDefined();
      expect(suite?.name).toBe("Authentication Suite");
      testSuiteId = ((suite as any)._id as Types.ObjectId).toString();
    });

    it("should get suites by project", async () => {
      await testSuiteService.createTestSuite(testProjectId, testUserId, {
        name: "Suite 1",
      });
      await testSuiteService.createTestSuite(testProjectId, testUserId, {
        name: "Suite 2",
      });

      const suites = await testSuiteService.getTestSuitesByProject(
        testProjectId,
        testUserId
      );
      expect(suites).toHaveLength(2);
    });

    it("should deny access to non-members", async () => {
      const suite = await testSuiteService.createTestSuite(testProjectId, testUserId, {
        name: "Private Suite",
      });

      const accessedSuite = await testSuiteService.getTestSuiteById(
        ((suite as any)._id as Types.ObjectId).toString(),
        testUser2Id
      );
      expect(accessedSuite).toBeNull();
    });
  });

  describe("TestCase Service", () => {
    beforeEach(async () => {
      const project = await projectService.createProject(testUserId, {
        name: "Test Project",
      });
      testProjectId = ((project as any)._id as Types.ObjectId).toString();

      const suite = await testSuiteService.createTestSuite(testProjectId, testUserId, {
        name: "Test Suite",
      });
      testSuiteId = ((suite as any)._id as Types.ObjectId).toString();
    });

    it("should create a test case", async () => {
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
      const testCase = await testCaseService.createTestCase(testSuiteId, testUserId, {
        title: "Original Title",
        priority: Priority.Low,
      });

      const testCaseId = ((testCase as any)._id as Types.ObjectId).toString();
      const updated = await testCaseService.updateTestCase(
        testCaseId,
        testUserId,
        {
          title: "Updated Title",
          priority: Priority.High,
        }
      );

      expect(updated?.title).toBe("Updated Title");
      expect(updated?.history).toHaveLength(1);
      expect(updated?.history[0].changedFields).toContain("title");
      expect(updated?.history[0].changedFields).toContain("priority");
    });

    it("should get test cases by suite", async () => {
      await testCaseService.createTestCase(testSuiteId, testUserId, {
        title: "Test 1",
      });
      await testCaseService.createTestCase(testSuiteId, testUserId, {
        title: "Test 2",
      });

      const cases = await testCaseService.getTestCasesBySuite(testSuiteId, testUserId);
      expect(cases).toHaveLength(2);
    });

    it("should bulk update status", async () => {
      const case1 = await testCaseService.createTestCase(testSuiteId, testUserId, {
        title: "Test 1",
        status: Status.Draft,
      });
      const case2 = await testCaseService.createTestCase(testSuiteId, testUserId, {
        title: "Test 2",
        status: Status.Draft,
      });

      const case1Id = ((case1 as any)._id as Types.ObjectId).toString();
      const case2Id = ((case2 as any)._id as Types.ObjectId).toString();

      const updatedCount = await testCaseService.bulkUpdateStatus(
        [case1Id, case2Id],
        testUserId,
        Status.Passed
      );

      expect(updatedCount).toBe(2);

      const updatedCase1 = await testCaseService.getTestCaseById(
        case1Id,
        testUserId
      );
      expect(updatedCase1?.status).toBe(Status.Passed);
    });
  });
});
