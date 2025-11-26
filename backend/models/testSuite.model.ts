import mongoose, { Schema } from "mongoose";
import { ITestSuiteDocument } from "../services/testCase/types/testCase.types.js";

const testSuiteSchema = new Schema<ITestSuiteDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance optimization
testSuiteSchema.index({ projectId: 1 });
testSuiteSchema.index({ projectId: 1, createdAt: -1 });
testSuiteSchema.index({ createdBy: 1 });

export const TestSuite = mongoose.model<ITestSuiteDocument>("TestSuite", testSuiteSchema);
