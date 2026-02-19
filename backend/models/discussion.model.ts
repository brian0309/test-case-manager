import mongoose, { Schema } from "mongoose";

export interface IDiscussionMessage {
  content: string;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatar?: string;
  imageUrl?: string;
  messageType: "text" | "image";
  createdAt: Date;
  updatedAt: Date;
}

export interface IDiscussionDocument extends mongoose.Document {
  testCaseId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  messages: IDiscussionMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const discussionMessageSchema = new Schema<IDiscussionMessage>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorAvatar: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
    messageType: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
  },
  { timestamps: true, _id: true }
);

const discussionSchema = new Schema<IDiscussionDocument>(
  {
    testCaseId: {
      type: Schema.Types.ObjectId,
      ref: "TestCase",
      required: true,
      unique: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    messages: [discussionMessageSchema],
  },
  { timestamps: true }
);

// Indexes for performance
discussionSchema.index({ testCaseId: 1 });
discussionSchema.index({ projectId: 1 });

export const Discussion = mongoose.model<IDiscussionDocument>(
  "Discussion",
  discussionSchema
);
