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

export enum FailureType {
  Functional = "Functional",
  UIUX = "UI/UX",
  Integration = "Integration",
  DataAPI = "Data/API",
  EnvironmentSetup = "Environment/Setup",
  FlakyIntermittent = "Flaky/Intermittent",
  Performance = "Performance",
  Security = "Security",
  Other = "Other",
}

export enum ReturnReason {
  MissingSteps = "Missing steps",
  MissingExpectedActual = "Missing expected vs actual",
  MissingEnvironmentBuild = "Missing environment/build",
  MissingAttachment = "Missing attachment",
  NotReproducible = "Not reproducible",
  Other = "Other",
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
  failureType?: FailureType;
  team?: string;
  environment?: string;
  buildVersion?: string;
  failureAt?: Date;
  firstReproducedAt?: Date;
  returnedCount?: number;
  lastReturnedAt?: Date;
  lastReturnReason?: ReturnReason;
  attachments: IAttachment[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITicketDocument extends ITicket, Document {}

// Snapshot divergence: compares the immutable run snapshot against the live test case.
export interface DivergenceField {
  field: string;
  snapshotValue?: string;
  liveValue?: string;
}

export interface TicketDivergence {
  hasDiverged: boolean;
  sourceCaseDeleted: boolean;
  caseId?: string;
  changedFields: DivergenceField[];
}

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
  failureType?: FailureType;
  team?: string;
  environment?: string;
  buildVersion?: string;
  failureAt?: string;
  firstReproducedAt?: string;
  returnedCount?: number;
  lastReturnedAt?: string;
  lastReturnReason?: ReturnReason;
  divergence?: TicketDivergence;
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
  failureType?: FailureType;
  team?: string;
  environment?: string;
  buildVersion?: string;
  failureAt?: string;
  firstReproducedAt?: string;
  returnedCount?: number;
  lastReturnedAt?: string;
  lastReturnReason?: ReturnReason;
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
  failureType?: FailureType;
  team?: string;
  tags?: string[];
  attachments?: IAttachment[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  severity?: TicketSeverity;
  failureType?: FailureType;
  team?: string;
  assignedToId?: string | null;
  relatedRunId?: string;
  relatedRunItemId?: string;
  tags?: string[];
  attachments?: IAttachment[];
}

export interface ReturnForInfoRequest {
  reason: ReturnReason;
}
