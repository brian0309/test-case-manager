import { Types } from "mongoose";
import { TestRunGroup } from "../../../models/testRunGroup.model.js";
import * as projectService from "../../testCase/services/project.service.js";
import {
    ITestRunGroupDocument,
    CreateTestRunGroupRequest,
    UpdateTestRunGroupRequest,
    TestRunGroupResponse,
    TesterResponse,
} from "../types/testRun.types.js";

/**
 * Format tester for API response
 */
const formatTesterResponse = (user: any): TesterResponse => {
    if (!user) {
        return {
            id: "",
            name: "Unassigned",
            avatar: "https://ui-avatars.com/api/?name=U&background=gray&color=fff",
        };
    }

    const name = user.name || user.email || "Unknown";
    return {
        id: user._id?.toString() || user.toString(),
        name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
    };
};

/**
 * Create a new test run group
 */
export const createTestRunGroup = async (
    projectId: string,
    userId: string,
    data: CreateTestRunGroupRequest
): Promise<ITestRunGroupDocument | null> => {
    // Check project access
    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
        return null;
    }

    const group = new TestRunGroup({
        name: data.name,
        description: data.description,
        projectId: new Types.ObjectId(projectId),
        color: data.color || "bg-blue-500",
        createdBy: new Types.ObjectId(userId),
    });

    await group.save();
    return group;
};

/**
 * Get all test run groups for a project
 */
export const getTestRunGroupsByProject = async (
    projectId: string,
    userId: string
): Promise<ITestRunGroupDocument[]> => {
    const hasAccess = await projectService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
        return [];
    }

    const groups = await TestRunGroup.find({
        projectId: new Types.ObjectId(projectId),
    })
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .lean();

    return groups as unknown as ITestRunGroupDocument[];
};

/**
 * Get a single test run group by ID
 */
export const getTestRunGroupById = async (
    groupId: string,
    userId: string
): Promise<ITestRunGroupDocument | null> => {
    const group = await TestRunGroup.findById(groupId)
        .populate("createdBy", "name email")
        .lean();

    if (!group) {
        return null;
    }

    const hasAccess = await projectService.hasProjectAccess(
        group.projectId.toString(),
        userId
    );
    if (!hasAccess) {
        return null;
    }

    return group as unknown as ITestRunGroupDocument;
};

/**
 * Update a test run group
 */
export const updateTestRunGroup = async (
    groupId: string,
    userId: string,
    data: UpdateTestRunGroupRequest
): Promise<ITestRunGroupDocument | null> => {
    const group = await TestRunGroup.findById(groupId);
    if (!group) {
        return null;
    }

    const hasAccess = await projectService.hasProjectAccess(
        group.projectId.toString(),
        userId
    );
    if (!hasAccess) {
        return null;
    }

    if (data.name) group.name = data.name;
    if (data.description !== undefined) group.description = data.description;
    if (data.color !== undefined) group.color = data.color;

    await group.save();

    return getTestRunGroupById(groupId, userId);
};

/**
 * Delete a test run group
 */
export const deleteTestRunGroup = async (
    groupId: string,
    userId: string
): Promise<boolean> => {
    const group = await TestRunGroup.findById(groupId);
    if (!group) {
        return false;
    }

    const hasAccess = await projectService.hasProjectAccess(
        group.projectId.toString(),
        userId
    );
    if (!hasAccess) {
        return false;
    }

    await TestRunGroup.deleteOne({ _id: new Types.ObjectId(groupId) });
    return true;
};

/**
 * Format test run group for API response
 */
export const formatTestRunGroupResponse = (group: any): TestRunGroupResponse => {
    return {
        id: group._id.toString(),
        name: group.name,
        description: group.description,
        projectId: group.projectId.toString(),
        color: group.color,
        createdBy: formatTesterResponse(group.createdBy),
        createdAt: group.createdAt?.toISOString?.() || group.createdAt,
        updatedAt: group.updatedAt?.toISOString?.() || group.updatedAt,
    };
};
