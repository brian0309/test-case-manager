import mongoose, { Schema } from "mongoose";
import { IProjectDocument } from "../services/testCase/types/testCase.types.js";

const projectSchema = new Schema<IProjectDocument>(
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
    color: {
      type: String,
      default: "bg-blue-500",
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Indexes for performance optimization
projectSchema.index({ ownerId: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ ownerId: 1, createdAt: -1 });

export const Project = mongoose.model<IProjectDocument>("Project", projectSchema);
