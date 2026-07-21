import { Document, Types } from "mongoose";

// =========================================================================
// ENUMS
// =========================================================================

export enum TicketStatus {
  Open = "Open",
  InProgress = "In Progress",
  Resolved = "Resolved",
  Closed = "Closed",
  Reopened = "Reopened",
}

export enum TicketPriority {
  Low = "Low",
  Medium = "Medium",
  High = "High",
  Critical = "Critical",
}

export enum TicketSeverity {
  Trivial = "Trivial",
  Minor = "Minor",
  Major = "Major",
  Critical = "Critical",
  Blocker = "Blocker",
}

// =========================================================================
// CORE INTERFACES
// =========================================================================

export interface IAttachment {
  url: string;
  filename: string;
  fileSize: number;
  contentType: string;
}

export interface ITicket {
  title: string;
  description?: string;
  projectId: Types.ObjectId;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  assignedTo?: Types.ObjectId;
  createdBy: Types.ObjectId;
  relatedRunId?: string;
  relatedRunItemId?: string;
  attachments: IAttachment[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITicketDocument extends ITicket, Document {}

// =========================================================================
// RESPONSE TYPES
// =========================================================================

export interface TesterResponse {
  id: string;
  name: string;
  avatar: string;
}

export interface TicketResponse {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  assignedTo?: TesterResponse;
  createdBy: TesterResponse;
  relatedRunId?: string;
  relatedRunItemId?: string;
  attachments: IAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketListResponse {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  assignedTo?: TesterResponse;
  createdBy: TesterResponse;
  relatedRunId?: string;
  relatedRunItemId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// REQUEST TYPES
// =========================================================================

export interface CreateTicketRequest {
  title: string;
  description?: string;
  priority: TicketPriority;
  severity: TicketSeverity;
  assignedToId?: string;
  relatedRunId?: string;
  relatedRunItemId?: string;
  tags?: string[];
  attachments?: IAttachment[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  severity?: TicketSeverity;
  assignedToId?: string | null;
  relatedRunId?: string;
  relatedRunItemId?: string;
  tags?: string[];
  attachments?: IAttachment[];
}
