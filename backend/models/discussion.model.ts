import mongoose, { Schema } from "mongoose";
import {
  IDiscussionMessageDocument,
  MessageBodyFormat,
  MessageFixState,
  MessageType,
} from "../services/discussion/types/discussion.types.js";

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    fileSize: { type: Number, required: true },
    contentType: { type: String, required: true },
  },
  { _id: false }
);

const discussionMessageSchema = new Schema<IDiscussionMessageDocument>(
  {
    testCaseId: {
      type: Schema.Types.ObjectId,
      ref: "TestCase",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.Comment,
    },
    body: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    bodyFormat: {
      type: String,
      enum: Object.values(MessageBodyFormat),
      default: MessageBodyFormat.Plain,
    },
    fixState: {
      type: String,
      enum: Object.values(MessageFixState),
      required: false,
    },
    relatedRunId: {
      type: String,
      required: false,
      maxlength: 64,
    },
    relatedRunItemId: {
      type: String,
      required: false,
      maxlength: 64,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
discussionMessageSchema.index({ testCaseId: 1, createdAt: 1 });
discussionMessageSchema.index({ projectId: 1 });

export const DiscussionMessage = mongoose.model<IDiscussionMessageDocument>(
  "DiscussionMessage",
  discussionMessageSchema
);
