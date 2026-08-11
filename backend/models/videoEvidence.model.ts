import mongoose, { Schema } from "mongoose";
import { IVideoEvidenceDocument } from "../services/drive/types/videoEvidence.types.js";

const videoEvidenceSchema = new Schema<IVideoEvidenceDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
    },
    testRunId: {
      type: Schema.Types.ObjectId,
      ref: "TestRun",
    },
    testRunItemId: {
      type: String,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: String,
      enum: ["google_drive"],
      default: "google_drive",
      required: true,
    },
    driveFileId: {
      type: String,
      required: true,
      unique: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    webViewLink: {
      type: String,
    },
  },
  { timestamps: true }
);

videoEvidenceSchema.index({ projectId: 1, ticketId: 1 });
videoEvidenceSchema.index({ projectId: 1, testRunId: 1, testRunItemId: 1 });
videoEvidenceSchema.index({ uploadedBy: 1 });

export const VideoEvidence = mongoose.model<IVideoEvidenceDocument>(
  "VideoEvidence",
  videoEvidenceSchema
);