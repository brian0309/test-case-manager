import { Types } from "mongoose";
import { Project } from "../../../models/project.model.js";
import { TestSuite } from "../../../models/testSuite.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import { User } from "../../../models/user.model.js";
import {
  IProjectDocument,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
} from "../types/testCase.types.js";

/**
 * Create a new project
 */
export const createProject = async (
  ownerId: string,
  data: CreateProjectRequest
): Promise<IProjectDocument> => {
  const project = new Project({
    name: data.name,
    description: data.description || "",
    color: data.color || "bg-blue-500",
    ownerId: new Types.ObjectId(ownerId),
    members: [new Types.ObjectId(ownerId)], // Owner is also a member
  });

  await project.save();
  return project;
};

/**
 * Get all projects for a user (owned or member of)
 */
export const getProjectsByUser = async (
  userId: string
): Promise<IProjectDocument[]> => {
  const projects = await Project.find({
    $or: [
      { ownerId: new Types.ObjectId(userId) },
      { members: new Types.ObjectId(userId) },
    ],
  })
    .sort({ updatedAt: -1 })
    .populate("members", "name email")
    .lean();

  return projects as unknown as IProjectDocument[];
};

/**
 * Get a single project by ID (with access check)
 */
export const getProjectById = async (
  projectId: string,
  userId: string
): Promise<IProjectDocument | null> => {
  const project = await Project.findOne({
    _id: new Types.ObjectId(projectId),
    $or: [
      { ownerId: new Types.ObjectId(userId) },
      { members: new Types.ObjectId(userId) },
    ],
  })
    .populate("members", "name email")
    .lean();

  return project as IProjectDocument | null;
};

/**
 * Update a project (owner only)
 */
export const updateProject = async (
  projectId: string,
  userId: string,
  data: UpdateProjectRequest
): Promise<IProjectDocument | null> => {
  const project = await Project.findOneAndUpdate(
    {
      _id: new Types.ObjectId(projectId),
      ownerId: new Types.ObjectId(userId), // Only owner can update
    },
    {
      $set: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color && { color: data.color }),
      },
    },
    { new: true }
  )
    .populate("members", "name email")
    .lean();

  return project as IProjectDocument | null;
};

/**
 * Delete a project (owner only) - cascades to suites and test cases
 */
export const deleteProject = async (
  projectId: string,
  userId: string
): Promise<boolean> => {
  const projectObjectId = new Types.ObjectId(projectId);

  // Verify ownership
  const project = await Project.findOne({
    _id: projectObjectId,
    ownerId: new Types.ObjectId(userId),
  });

  if (!project) {
    return false;
  }

  // Cascade delete: test cases first, then suites, then project
  await TestCase.deleteMany({ projectId: projectObjectId });
  await TestSuite.deleteMany({ projectId: projectObjectId });
  await Project.deleteOne({ _id: projectObjectId });

  return true;
};

/**
 * Add a member to a project by email (owner only)
 */
export const addProjectMember = async (
  projectId: string,
  ownerId: string,
  memberEmail: string
): Promise<IProjectDocument | null> => {
  // Find the user by email
  const user = await User.findOne({ email: memberEmail.toLowerCase() });
  if (!user) {
    throw new Error("User not found with that email");
  }

  const project = await Project.findOneAndUpdate(
    {
      _id: new Types.ObjectId(projectId),
      ownerId: new Types.ObjectId(ownerId),
      members: { $ne: user._id }, // Not already a member
    },
    {
      $addToSet: { members: user._id },
    },
    { new: true }
  )
    .populate("members", "name email")
    .lean();

  return project as IProjectDocument | null;
};

/**
 * Remove a member from a project (owner only, can't remove owner)
 */
export const removeProjectMember = async (
  projectId: string,
  ownerId: string,
  memberId: string
): Promise<IProjectDocument | null> => {
  // Can't remove the owner
  if (ownerId === memberId) {
    throw new Error("Cannot remove the project owner from members");
  }

  const project = await Project.findOneAndUpdate(
    {
      _id: new Types.ObjectId(projectId),
      ownerId: new Types.ObjectId(ownerId),
    },
    {
      $pull: { members: new Types.ObjectId(memberId) },
    },
    { new: true }
  )
    .populate("members", "name email")
    .lean();

  return project as IProjectDocument | null;
};

/**
 * Check if user has access to a project
 */
export const hasProjectAccess = async (
  projectId: string,
  userId: string
): Promise<boolean> => {
  const count = await Project.countDocuments({
    _id: new Types.ObjectId(projectId),
    $or: [
      { ownerId: new Types.ObjectId(userId) },
      { members: new Types.ObjectId(userId) },
    ],
  });

  return count > 0;
};

/**
 * Check if user is project owner
 */
export const isProjectOwner = async (
  projectId: string,
  userId: string
): Promise<boolean> => {
  const count = await Project.countDocuments({
    _id: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(userId),
  });

  return count > 0;
};

/**
 * Get project stats (suites count, cases count, members count)
 */
export const getProjectStats = async (
  projectId: string
): Promise<{ suites: number; cases: number; members: number }> => {
  const projectObjectId = new Types.ObjectId(projectId);

  const [suitesCount, casesCount, project] = await Promise.all([
    TestSuite.countDocuments({ projectId: projectObjectId }),
    TestCase.countDocuments({ projectId: projectObjectId }),
    Project.findById(projectObjectId).select("members"),
  ]);

  return {
    suites: suitesCount,
    cases: casesCount,
    members: project?.members?.length || 0,
  };
};

/**
 * Format project for API response
 */
export const formatProjectResponse = async (
  project: any
): Promise<ProjectResponse> => {
  const stats = await getProjectStats(project._id.toString());

  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description,
    color: project.color,
    ownerId: project.ownerId.toString(),
    members: (project.members || []).map((m: any) => ({
      id: m._id?.toString() || m.toString(),
      name: m.name || "",
      email: m.email || "",
    })),
    stats,
    createdAt: project.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: project.updatedAt?.toISOString() || new Date().toISOString(),
  };
};
