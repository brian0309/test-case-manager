import mongoose, { Schema } from "mongoose";
import {
  ITestCaseDocument,
  IHistoryEntry,
  Priority,
  Status,
} from "../services/testCase/types/testCase.types.js";

const historyEntrySchema = new Schema<IHistoryEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    snapshot: {
      title: String,
      priority: {
        type: String,
        enum: Object.values(Priority),
      },
      status: {
        type: String,
        enum: Object.values(Status),
      },
      area: String,
      expectedResult: String,
      testDescription: String,
      stepsContent: String,
      comments: String,
      customFields: {
        type: Map,
        of: String,
      },
    },
    changedFields: [String],
  },
  { _id: true }
);

const testCaseSchema = new Schema<ITestCaseDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    priority: {
      type: String,
      enum: Object.values(Priority),
      default: Priority.Medium,
    },
    status: {
      type: String,
      enum: Object.values(Status),
      default: Status.Draft,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    suiteId: {
      type: Schema.Types.ObjectId,
      ref: "TestSuite",
      required: true,
    },
    assignedTester: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    area: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    expectedResult: {
      type: String,
      trim: true,
    },
    testDescription: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    stepsContent: {
      type: String, // HTML content from rich text editor
    },
    comments: {
      type: String, // HTML content from rich text editor
    },
    customFields: {
      type: Map,
      of: String,
      default: {},
    },
    history: [historyEntrySchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for performance optimization
testCaseSchema.index({ projectId: 1, suiteId: 1 });
testCaseSchema.index({ suiteId: 1 });
testCaseSchema.index({ projectId: 1 });
testCaseSchema.index({ assignedTester: 1 });
testCaseSchema.index({ status: 1 });
testCaseSchema.index({ projectId: 1, lastModified: -1 });
// Index for ordering within suite
testCaseSchema.index({ suiteId: 1, order: 1 });

// Pre-save middleware to update lastModified
testCaseSchema.pre("save", async function () {
  this.lastModified = new Date();
});

export const TestCase = mongoose.model<ITestCaseDocument>("TestCase", testCaseSchema);
