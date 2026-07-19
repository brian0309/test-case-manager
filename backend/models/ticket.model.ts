import mongoose, { Schema } from "mongoose";
import {
  ITicketDocument,
  TicketStatus,
  TicketPriority,
  TicketSeverity,
} from "../services/ticket/types/ticket.types.js";

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    fileSize: { type: Number, required: true },
    contentType: { type: String, required: true },
  },
  { _id: false }
);

const ticketSchema = new Schema<ITicketDocument>(
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
      maxlength: 5000,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.Open,
    },
    priority: {
      type: String,
      enum: Object.values(TicketPriority),
      default: TicketPriority.Medium,
    },
    severity: {
      type: String,
      enum: Object.values(TicketSeverity),
      default: TicketSeverity.Minor,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
ticketSchema.index({ projectId: 1, createdAt: -1 });
ticketSchema.index({ projectId: 1, status: 1 });
ticketSchema.index({ assignedTo: 1 });

export const Ticket = mongoose.model<ITicketDocument>("Ticket", ticketSchema);
