import mongoose, { Schema } from "mongoose";
import { IProjectDocument } from "../services/testCase/types/testCase.types.js";

const customFieldDefinitionSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "long_text", "dropdown", "wysiwyg"],
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: [
      {
        id: String,
        label: String,
      },
    ],
    defaultValue: String,
    showOnTableByDefault: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

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
    settings: {
      testCases: {
        hiddenDefaultFields: {
          area: { type: Boolean, default: false },
          testDescription: { type: Boolean, default: false },
          stepsContent: { type: Boolean, default: false },
          expectedResult: { type: Boolean, default: false },
          comments: { type: Boolean, default: false },
          priority: { type: Boolean, default: false },
          status: { type: Boolean, default: false },
          assignedTester: { type: Boolean, default: false },
        },
        table: {
          hiddenDefaultColumns: {
            id: { type: Boolean, default: false },
            title: { type: Boolean, default: false },
            priority: { type: Boolean, default: false },
            status: { type: Boolean, default: false },
            lastModified: { type: Boolean, default: false },
            assignedTester: { type: Boolean, default: false },
          },
          visibleCustomFieldIds: [String],
        },
        customFields: [customFieldDefinitionSchema],
      },
      videoEvidence: {
        enabled: { type: Boolean, default: false },
        publicLinks: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true }
);

// Indexes for performance optimization
projectSchema.index({ ownerId: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ ownerId: 1, createdAt: -1 });

export const Project = mongoose.model<IProjectDocument>("Project", projectSchema);
