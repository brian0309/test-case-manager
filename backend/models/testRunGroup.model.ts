import mongoose, { Schema } from "mongoose";
import { ITestRunGroupDocument } from "../services/testRun/types/testRun.types.js";

const testRunGroupSchema = new Schema<ITestRunGroupDocument>(
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
        color: {
            type: String,
            default: "bg-blue-500",
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
testRunGroupSchema.index({ projectId: 1 });
testRunGroupSchema.index({ projectId: 1, createdAt: -1 });
testRunGroupSchema.index({ createdBy: 1 });

export const TestRunGroup = mongoose.model<ITestRunGroupDocument>("TestRunGroup", testRunGroupSchema);
