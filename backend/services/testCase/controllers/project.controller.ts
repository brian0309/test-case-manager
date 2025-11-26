import { Request, Response } from "express";
import * as projectService from "../services/project.service.js";
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  AddMemberRequest,
} from "../types/testCase.types.js";

/**
 * POST /api/projects
 * Create a new project
 */
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const data: CreateProjectRequest = req.body;

    if (!data.name || data.name.trim().length === 0) {
      res.status(400).json({ success: false, message: "Project name is required" });
      return;
    }

    const project = await projectService.createProject(userId, data);
    const response = await projectService.formatProjectResponse(project);

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in createProject:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/projects
 * List all projects for the current user
 */
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const projects = await projectService.getProjectsByUser(userId);
    const responses = await Promise.all(
      projects.map((p) => projectService.formatProjectResponse(p))
    );

    res.status(200).json({ success: true, data: responses });
  } catch (error) {
    console.error("Error in getProjects:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/projects/:id
 * Get a single project by ID
 */
export const getProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const project = await projectService.getProjectById(id, userId);

    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    const response = await projectService.formatProjectResponse(project);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in getProject:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/projects/:id
 * Update a project (owner only)
 */
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const data: UpdateProjectRequest = req.body;

    const project = await projectService.updateProject(id, userId, data);

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found or you don't have permission to update it",
      });
      return;
    }

    const response = await projectService.formatProjectResponse(project);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in updateProject:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/projects/:id
 * Delete a project (owner only)
 */
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const deleted = await projectService.deleteProject(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Project not found or you don't have permission to delete it",
      });
      return;
    }

    res.status(200).json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error in deleteProject:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/projects/:id/members
 * Add a member to a project (owner only)
 */
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { email }: AddMemberRequest = req.body;

    if (!email || email.trim().length === 0) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const project = await projectService.addProjectMember(id, userId, email);

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found, you don't have permission, or user is already a member",
      });
      return;
    }

    const response = await projectService.formatProjectResponse(project);
    res.status(200).json({ success: true, data: response });
  } catch (error: any) {
    console.error("Error in addMember:", error);
    if (error.message === "User not found with that email") {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/projects/:id/members/:memberId
 * Remove a member from a project (owner only)
 */
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id, memberId } = req.params;

    const project = await projectService.removeProjectMember(id, userId, memberId);

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found or you don't have permission",
      });
      return;
    }

    const response = await projectService.formatProjectResponse(project);
    res.status(200).json({ success: true, data: response });
  } catch (error: any) {
    console.error("Error in removeMember:", error);
    if (error.message === "Cannot remove the project owner from members") {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
