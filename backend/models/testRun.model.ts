import mongoose, { Schema } from "mongoose";
import {
  ITestRunDocument,
  IRunItem,
  TestRunStatus,
  RunItemStatus,
} from "../services/testRun/types/testRun.types.js";

const caseSnapshotSchema = new Schema(
  {
    title: { type: String, required: true },
    priority: { type: String },
    suiteId: { type: String },
    suiteName: { type: String },
    area: { type: String },
    expectedResult: { type: String },
    testDescription: { type: String },
    stepsContent: { type: String },
    status: { type: String },
    comments: { type: String },
    customFields: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { _id: false }
);

const runItemSchema = new Schema<IRunItem>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "TestCase",
      required: true,
    },
    caseSnapshot: {
      type: caseSnapshotSchema,
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(RunItemStatus),
      default: RunItemStatus.NotRun,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    actualResult: {
      type: String,
    },
    attachments: [
      {
        type: String, // URLs to attachments
      },
    ],
    timeSpent: {
      type: Number, // in seconds
      default: 0,
    },
    executedAt: {
      type: Date,
    },
    executedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: true }
);

const testRunSchema = new Schema<ITestRunDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    suiteId: {
      type: Schema.Types.ObjectId,
      ref: "TestSuite",
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "TestRunGroup",
    },
    status: {
      type: String,
      enum: Object.values(TestRunStatus),
      default: TestRunStatus.Draft,
    },
    environment: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    team: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    buildVersion: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    items: [runItemSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    resultsSummary: {
      total: { type: Number, default: 0 },
      passed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      blocked: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      notRun: { type: Number, default: 0 },
      passRate: { type: Number, default: 0 },
      totalTimeSpent: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Indexes for performance optimization
testRunSchema.index({ projectId: 1 });
testRunSchema.index({ suiteId: 1 });
testRunSchema.index({ groupId: 1 });
testRunSchema.index({ projectId: 1, createdAt: -1 });
testRunSchema.index({ status: 1 });
testRunSchema.index({ createdBy: 1 });
testRunSchema.index({ projectId: 1, tags: 1 });

export const TestRun = mongoose.model<ITestRunDocument>("TestRun", testRunSchema);

