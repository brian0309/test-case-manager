import { Request, Response } from "express";
import { Discussion } from "../../../models/discussion.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import { User } from "../../../models/user.model.js";
import { CreateMessageRequest, DiscussionResponse } from "../types/discussion.types.js";
import { socketManager } from "../../../socket/socketManager.js";

/**
 * GET /api/testcase/:testCaseId/discussions
 * Get all discussions for a test case
 */
export const getDiscussions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { testCaseId } = req.params;

    // Verify test case exists and user has access
    const testCase = await TestCase.findById(testCaseId);
    if (!testCase) {
      res.status(404).json({ success: false, message: "Test case not found" });
      return;
    }

    // Get or create discussion for this test case
    let discussion = await Discussion.findOne({ testCaseId });
    
    if (!discussion) {
      discussion = await Discussion.create({
        testCaseId,
        projectId: testCase.projectId,
        messages: [],
      });
    }

    const response: DiscussionResponse = {
      id: discussion._id.toString(),
      testCaseId: discussion.testCaseId.toString(),
      projectId: discussion.projectId.toString(),
      messages: discussion.messages.map((msg: any) => ({
        id: msg._id.toString(),
        content: msg.content,
        authorId: msg.authorId.toString(),
        authorName: msg.authorName,
        authorAvatar: msg.authorAvatar,
        imageUrl: msg.imageUrl,
        messageType: msg.messageType,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      })),
      createdAt: discussion.createdAt,
      updatedAt: discussion.updatedAt,
    };

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error in getDiscussions:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/testcase/:testCaseId/discussions
 * Create a new message in a test case discussion
 */
export const createMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { testCaseId } = req.params;
    const data: CreateMessageRequest = req.body;

    if (!data.content || data.content.trim().length === 0) {
      res.status(400).json({ success: false, message: "Message content is required" });
      return;
    }

    // Verify test case exists and user has access
    const testCase = await TestCase.findById(testCaseId);
    if (!testCase) {
      res.status(404).json({ success: false, message: "Test case not found" });
      return;
    }

    // Get user info
    const user = await User.findById(userId).select("name avatar");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Get or create discussion
    let discussion = await Discussion.findOne({ testCaseId });
    
    if (!discussion) {
      discussion = await Discussion.create({
        testCaseId,
        projectId: testCase.projectId,
        messages: [],
      });
    }

    // Add new message
    const newMessage = {
      content: data.content.trim(),
      authorId: userId,
      authorName: user.name,
      authorAvatar: user.avatar,
      imageUrl: data.imageUrl,
      messageType: data.messageType || (data.imageUrl ? "image" : "text"),
    };

    discussion.messages.push(newMessage as any);
    await discussion.save();

    const savedMessage = discussion.messages[discussion.messages.length - 1];
    
    const messageResponse = {
      id: (savedMessage as any)._id.toString(),
      content: savedMessage.content,
      authorId: savedMessage.authorId.toString(),
      authorName: savedMessage.authorName,
      authorAvatar: savedMessage.authorAvatar,
      imageUrl: savedMessage.imageUrl,
      messageType: savedMessage.messageType,
      createdAt: savedMessage.createdAt,
      updatedAt: savedMessage.updatedAt,
    };

    // Emit socket event for real-time updates
    const projectId = testCase.projectId.toString();
    socketManager.io?.to(`testcase:${testCaseId}`).emit("discussion:message-created", {
      testCaseId,
      projectId,
      message: messageResponse,
    });

    res.status(201).json({ success: true, data: messageResponse });
  } catch (error) {
    console.error("Error in createMessage:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/testcase/:testCaseId/discussions/:messageId
 * Delete a message from a test case discussion
 */
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { testCaseId, messageId } = req.params;

    // Verify test case exists
    const testCase = await TestCase.findById(testCaseId);
    if (!testCase) {
      res.status(404).json({ success: false, message: "Test case not found" });
      return;
    }

    const discussion = await Discussion.findOne({ testCaseId });
    if (!discussion) {
      res.status(404).json({ success: false, message: "Discussion not found" });
      return;
    }

    const message = discussion.messages.find((msg: any) => msg._id.toString() === messageId);
    if (!message) {
      res.status(404).json({ success: false, message: "Message not found" });
      return;
    }

    // Only allow author to delete their own message
    if (message.authorId.toString() !== userId) {
      res.status(403).json({ success: false, message: "You can only delete your own messages" });
      return;
    }

    // Remove message
    discussion.messages = discussion.messages.filter(
      (msg: any) => msg._id.toString() !== messageId
    ) as any;
    await discussion.save();

    // Emit socket event for real-time updates
    const projectId = testCase.projectId.toString();
    socketManager.io?.to(`testcase:${testCaseId}`).emit("discussion:message-deleted", {
      testCaseId,
      projectId,
      messageId,
    });

    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
