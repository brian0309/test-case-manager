import { Types } from "mongoose";
import { DiscussionMessage } from "../../../models/discussion.model.js";
import {
  CreateMessageOptions,
  IAttachment,
  MessageBodyFormat,
  MessageFixState,
  MessageType,
  MessageResponse,
} from "../types/discussion.types.js";
import { User } from "../../../models/user.model.js";
import { TestCase } from "../../../models/testCase.model.js";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?background=random&color=fff&name=";

const formatMessage = (msg: any): MessageResponse => {
  const user = msg.userId;
  return {
    id: msg._id.toString(),
    testCaseId: msg.testCaseId.toString(),
    projectId: msg.projectId.toString(),
    user: {
      id: user?._id?.toString() ?? msg.userId.toString(),
      name: user?.name ?? "Unknown",
      avatar:
        user?.profilePicture ??
        `${DEFAULT_AVATAR}${encodeURIComponent(user?.name ?? "U")}`,
    },
    type: msg.type,
    body: msg.body,
    bodyFormat: msg.bodyFormat ?? MessageBodyFormat.Plain,
    fixState: msg.fixState,
    relatedRunId: msg.relatedRunId,
    relatedRunItemId: msg.relatedRunItemId,
    attachments: msg.attachments ?? [],
    createdAt: msg.createdAt.toISOString(),
    updatedAt: msg.updatedAt.toISOString(),
  };
};

export const getMessages = async (
  testCaseId: string
): Promise<MessageResponse[]> => {
  const messages = await DiscussionMessage.find({
    testCaseId: new Types.ObjectId(testCaseId),
  })
    .populate("userId", "name profilePicture")
    .sort({ createdAt: 1 })
    .lean();

  return messages.map(formatMessage);
};

export const createMessage = async (
  testCaseId: string,
  projectId: string,
  userId: string,
  body: string,
  attachments: IAttachment[] = [],
  options: CreateMessageOptions = {}
): Promise<MessageResponse> => {
  const message = await DiscussionMessage.create({
    testCaseId: new Types.ObjectId(testCaseId),
    projectId: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
    type: options.type ?? MessageType.Comment,
    body,
    bodyFormat: options.bodyFormat ?? MessageBodyFormat.Plain,
    fixState: options.fixState,
    relatedRunId: options.relatedRunId,
    relatedRunItemId: options.relatedRunItemId,
    attachments,
  });

  const populated = await DiscussionMessage.findById(message._id)
    .populate("userId", "name profilePicture")
    .lean();

  return formatMessage(populated);
};

export const createSystemMessage = async (
  testCaseId: string,
  projectId: string,
  userId: string,
  body: string,
  attachments: IAttachment[] = [],
  options: Omit<CreateMessageOptions, "type"> = {}
): Promise<MessageResponse> => {
  return createMessage(
    testCaseId,
    projectId,
    userId,
    body,
    attachments,
    {
      ...options,
      type: MessageType.System,
    }
  );
};

export const getMessageById = async (
  testCaseId: string,
  projectId: string,
  messageId: string
): Promise<MessageResponse | null> => {
  const message = await DiscussionMessage.findOne({
    _id: new Types.ObjectId(messageId),
    testCaseId: new Types.ObjectId(testCaseId),
    projectId: new Types.ObjectId(projectId),
  })
    .populate("userId", "name profilePicture")
    .lean();

  return message ? formatMessage(message) : null;
};

export const updateMessageFixState = async (
  testCaseId: string,
  projectId: string,
  messageId: string,
  fixState: MessageFixState
): Promise<MessageResponse | null> => {
  const updated = await DiscussionMessage.findOneAndUpdate(
    {
      _id: new Types.ObjectId(messageId),
      testCaseId: new Types.ObjectId(testCaseId),
      projectId: new Types.ObjectId(projectId),
    },
    { $set: { fixState } },
    { new: true }
  )
    .populate("userId", "name profilePicture")
    .lean();

  return updated ? formatMessage(updated) : null;
};

export const deleteMessage = async (
  testCaseId: string,
  projectId: string,
  messageId: string
): Promise<boolean> => {
  const result = await DiscussionMessage.deleteOne({
    _id: new Types.ObjectId(messageId),
    testCaseId: new Types.ObjectId(testCaseId),
    projectId: new Types.ObjectId(projectId),
  });

  return result.deletedCount === 1;
};

// Keep User import referenced to avoid tree-shaking
void User;

/**
 * Look up the projectId for a given test case
 */
export const getProjectIdForTestCase = async (
  testCaseId: string
): Promise<string | null> => {
  const tc = await TestCase.findById(testCaseId).select("projectId").lean();
  return tc ? tc.projectId.toString() : null;
};
