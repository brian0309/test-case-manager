import { Types } from "mongoose";
import { Ticket } from "../../../models/ticket.model.js";
import { TestRun } from "../../../models/testRun.model.js";
import { TestCase } from "../../../models/testCase.model.js";
import {
  TicketResponse,
  TicketListResponse,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketStatus,
  ReturnForInfoRequest,
  TicketDivergence,
  DivergenceField,
} from "../types/ticket.types.js";
import { User } from "../../../models/user.model.js";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?background=random&color=fff&name=";

/** Fields compared between the immutable run snapshot and the live test case. */
const DIVERGENCE_FIELDS = [
  "title",
  "priority",
  "area",
  "expectedResult",
  "testDescription",
  "stepsContent",
] as const;

/** Normalize rich-text HTML for shallow comparison (tags/whitespace/case ignored). */
const normalizeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const normalizePlain = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
};

const formatUser = (user: any): { id: string; name: string; avatar: string } => {
  return {
    id: user?._id?.toString() ?? "",
    name: user?.name ?? "Unknown",
    avatar:
      user?.profilePicture ??
      `${DEFAULT_AVATAR}${encodeURIComponent(user?.name ?? "U")}`,
  };
};

const formatTicket = (ticket: any): TicketResponse => {
  const createdBy = ticket.createdBy;
  const assignedTo = ticket.assignedTo;
  return {
    id: ticket._id.toString(),
    title: ticket.title,
    description: ticket.description,
    projectId: ticket.projectId.toString(),
    status: ticket.status,
    priority: ticket.priority,
    severity: ticket.severity,
    assignedTo: assignedTo ? formatUser(assignedTo) : undefined,
    createdBy: formatUser(createdBy),
    relatedRunId: ticket.relatedRunId,
    relatedRunItemId: ticket.relatedRunItemId,
    failureType: ticket.failureType,
    team: ticket.team,
    environment: ticket.environment,
    buildVersion: ticket.buildVersion,
    failureAt: ticket.failureAt?.toISOString?.() || ticket.failureAt,
    firstReproducedAt: ticket.firstReproducedAt?.toISOString?.() || ticket.firstReproducedAt,
    returnedCount: ticket.returnedCount ?? 0,
    lastReturnedAt: ticket.lastReturnedAt?.toISOString?.() || ticket.lastReturnedAt,
    lastReturnReason: ticket.lastReturnReason,
    divergence: ticket.divergence,
    attachments: ticket.attachments ?? [],
    tags: ticket.tags ?? [],
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
};

const formatTicketList = (ticket: any): TicketListResponse => {
  const createdBy = ticket.createdBy;
  const assignedTo = ticket.assignedTo;
  return {
    id: ticket._id.toString(),
    title: ticket.title,
    description: ticket.description,
    projectId: ticket.projectId.toString(),
    status: ticket.status,
    priority: ticket.priority,
    severity: ticket.severity,
    assignedTo: assignedTo ? formatUser(assignedTo) : undefined,
    createdBy: formatUser(createdBy),
    relatedRunId: ticket.relatedRunId,
    relatedRunItemId: ticket.relatedRunItemId,
    failureType: ticket.failureType,
    team: ticket.team,
    environment: ticket.environment,
    buildVersion: ticket.buildVersion,
    failureAt: ticket.failureAt?.toISOString?.() || ticket.failureAt,
    firstReproducedAt: ticket.firstReproducedAt?.toISOString?.() || ticket.firstReproducedAt,
    returnedCount: ticket.returnedCount ?? 0,
    lastReturnedAt: ticket.lastReturnedAt?.toISOString?.() || ticket.lastReturnedAt,
    lastReturnReason: ticket.lastReturnReason,
    tags: ticket.tags ?? [],
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
};

/**
 * Compare the immutable run-item snapshot against the live test case.
 * Returns an empty (unchanged) divergence when the ticket has no run link,
 * or a marked-as-deleted state when the source case no longer exists.
 */
export const computeDivergence = async (ticket: {
  relatedRunId?: string;
  relatedRunItemId?: string;
}): Promise<TicketDivergence> => {
  const unchanged: TicketDivergence = {
    hasDiverged: false,
    sourceCaseDeleted: false,
    caseId: undefined,
    changedFields: [],
  };

  if (!ticket.relatedRunId || !ticket.relatedRunItemId) {
    return unchanged;
  }

  let run;
  try {
    run = await TestRun.findById(
      new Types.ObjectId(ticket.relatedRunId)
    ).lean();
  } catch {
    return unchanged;
  }
  if (!run) return unchanged;

  const item = run.items.find(
    (i) => (i._id as Types.ObjectId)?.toString() === ticket.relatedRunItemId
  );
  if (!item) return unchanged;

  const snapshot = item.caseSnapshot ?? {};
  const caseId = item.caseId?.toString();

  let testCase;
  try {
    testCase = await TestCase.findById(item.caseId).lean();
  } catch {
    testCase = null;
  }

  if (!testCase) {
    return {
      hasDiverged: true,
      sourceCaseDeleted: true,
      caseId,
      changedFields: [],
    };
  }

  const changedFields: DivergenceField[] = [];
  for (const field of DIVERGENCE_FIELDS) {
    const snapshotValue = (snapshot as unknown as Record<string, unknown>)[field];
    const liveValue = (testCase as unknown as Record<string, unknown>)[field];
    const snapshotNorm = normalizePlain(String(snapshotValue ?? ""));
    if (field === "stepsContent" || field === "expectedResult") {
      if (normalizeHtml(snapshotValue) === normalizeHtml(liveValue)) continue;
    } else if (snapshotNorm === normalizePlain(liveValue)) {
      continue;
    }

    changedFields.push({
      field,
      snapshotValue: String(snapshotValue ?? ""),
      liveValue: String(liveValue ?? ""),
    });
  }

  // Compare custom fields (dynamic keys per project)
  const snapshotCustomFields =
    (snapshot as unknown as Record<string, unknown>).customFields ?? {};
  const liveCustomFields =
    (testCase as unknown as Record<string, unknown>).customFields ?? {};
  const allCustomFieldKeys = new Set([
    ...Object.keys(snapshotCustomFields),
    ...Object.keys(liveCustomFields),
  ]);
  for (const key of allCustomFieldKeys) {
    const snapshotValue = String(
      (snapshotCustomFields as Record<string, unknown>)[key] ?? ""
    );
    const liveValue = String(
      (liveCustomFields as Record<string, unknown>)[key] ?? ""
    );
    if (normalizePlain(snapshotValue) === normalizePlain(liveValue)) continue;
    changedFields.push({
      field: `customFields.${key}`,
      snapshotValue,
      liveValue,
    });
  }

  return {
    hasDiverged: changedFields.length > 0,
    sourceCaseDeleted: false,
    caseId,
    changedFields,
  };
};

/** Best-effort failure-type suggestion from run tags + ticket free text. */
export const suggestFailureType = (value: string): string => {
  const text = (value || "").toLowerCase();
  const rules: Array<{ tag: string; patterns: string[] }> = [
    { tag: "Functional", patterns: ["crash", "crashes", "error", "broken", "incorrect", "bug", "fails", "failed", "wrong"] },
    { tag: "UI/UX", patterns: ["ui", "ux", "layout", "render", "display", "css", "style", "frontend"] },
    { tag: "Integration", patterns: ["integration", "3rd party", "third party", "oauth", "webhook"] },
    { tag: "Data/API", patterns: ["api", "endpoint", "400", "401", "403", "404", "500", "response"] },
    { tag: "Environment/Setup", patterns: ["environment", "build", "config", "deploy", "setup", "staging", "prod"] },
    { tag: "Flaky/Intermittent", patterns: ["flaky", "intermittent", "rarely", "sometimes", "sporadic", "random"] },
    { tag: "Performance", patterns: ["performance", "slow", "timeout", "lag", "memory"] },
    { tag: "Security", patterns: ["security", "auth", "permission", "xss", "csrf", "encryption"] },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((p) => text.includes(p))) {
      return rule.tag;
    }
  }
  return "Other";
};

/**
 * Get all tickets for a project
 */
export const getTickets = async (
  projectId: string
): Promise<TicketListResponse[]> => {
  const tickets = await Ticket.find({
    projectId: new Types.ObjectId(projectId),
  })
    .populate("createdBy", "name profilePicture")
    .populate("assignedTo", "name profilePicture")
    .sort({ createdAt: -1 })
    .lean();

  return tickets.map(formatTicketList);
};

/**
 * Get tickets for a project with pagination
 */
export const getTicketsPaginated = async (
  projectId: string,
  options: { limit: number; offset: number }
): Promise<{ items: TicketListResponse[]; total: number }> => {
  const query = { projectId: new Types.ObjectId(projectId) };

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate("createdBy", "name profilePicture")
      .populate("assignedTo", "name profilePicture")
      .sort({ createdAt: -1 })
      .skip(options.offset)
      .limit(options.limit)
      .lean(),
    Ticket.countDocuments(query),
  ]);

  return {
    items: tickets.map(formatTicketList),
    total,
  };
};

/**
 * Get a single ticket by ID
 */
export const getTicket = async (id: string): Promise<TicketResponse | null> => {
  const ticket = await Ticket.findById(new Types.ObjectId(id))
    .populate("createdBy", "name profilePicture")
    .populate("assignedTo", "name profilePicture")
    .lean();

  if (!ticket) return null;

  const formatted = formatTicket(ticket);
  formatted.divergence = await computeDivergence(ticket);

  return formatted;
};

/**
 * Create a new ticket
 */
export const createTicket = async (
  projectId: string,
  userId: string,
  data: CreateTicketRequest
): Promise<TicketResponse> => {
  // Enrich from the linked run: copy immutable context (team, environment,
  // build, failure time) so the ticket is self-contained even if the run
  // or live test case changes later.
  let team = data.team;
  let environment: string | undefined;
  let buildVersion: string | undefined;
  let failureAt: Date | undefined;

  if (data.relatedRunId) {
    try {
      const run = await TestRun.findById(
        new Types.ObjectId(data.relatedRunId)
      ).lean();

      if (run) {
        if (run.team && !team) team = run.team;
        environment = run.environment;
        buildVersion = run.buildVersion;

        if (data.relatedRunItemId) {
          const item = run.items.find(
            (i) =>
              (i._id as Types.ObjectId)?.toString() === data.relatedRunItemId
          );
          if (item?.executedAt) {
            failureAt = new Date(item.executedAt);
          }
        }
      }
    } catch {
      // Non-fatal: continue with a ticket without run context
    }
  }

  const ticket = await Ticket.create({
    title: data.title,
    description: data.description,
    projectId: new Types.ObjectId(projectId),
    status: TicketStatus.Open,
    priority: data.priority,
    severity: data.severity,
    assignedTo: data.assignedToId
      ? new Types.ObjectId(data.assignedToId)
      : undefined,
    createdBy: new Types.ObjectId(userId),
    relatedRunId: data.relatedRunId,
    relatedRunItemId: data.relatedRunItemId,
    failureType: data.failureType,
    team,
    environment,
    buildVersion,
    failureAt,
    tags: data.tags ?? [],
    attachments: data.attachments ?? [],
  });

  const populated = await Ticket.findById(ticket._id)
    .populate("createdBy", "name profilePicture")
    .populate("assignedTo", "name profilePicture")
    .lean();

  return formatTicket(populated!);
};

/**
 * Update a ticket
 */
export const updateTicket = async (
  id: string,
  data: UpdateTicketRequest
): Promise<TicketResponse | null> => {
  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.severity !== undefined) updateData.severity = data.severity;
  if (data.failureType !== undefined) updateData.failureType = data.failureType;
  if (data.team !== undefined) updateData.team = data.team;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.attachments !== undefined) updateData.attachments = data.attachments;
  if (data.relatedRunId !== undefined) updateData.relatedRunId = data.relatedRunId;
  if (data.relatedRunItemId !== undefined) updateData.relatedRunItemId = data.relatedRunItemId;
  if (data.assignedToId !== undefined) {
    updateData.assignedTo = data.assignedToId
      ? new Types.ObjectId(data.assignedToId)
      : null;
  }

  const updated = await Ticket.findByIdAndUpdate(
    new Types.ObjectId(id),
    { $set: updateData },
    { new: true }
  )
    .populate("createdBy", "name profilePicture")
    .populate("assignedTo", "name profilePicture")
    .lean();

  return updated ? formatTicket(updated) : null;
};

/**
 * Delete a ticket
 */
export const deleteTicket = async (id: string): Promise<boolean> => {
  const result = await Ticket.deleteOne({
    _id: new Types.ObjectId(id),
  });

  return result.deletedCount === 1;
};

/**
 * Get tickets linked to a specific test run
 */
export const getTicketsByRun = async (
  runId: string
): Promise<TicketListResponse[]> => {
  const tickets = await Ticket.find({
    relatedRunId: runId,
  })
    .populate("createdBy", "name profilePicture")
    .populate("assignedTo", "name profilePicture")
    .sort({ createdAt: -1 })
    .lean();

  return tickets.map(formatTicketList);
};

/**
 * Get tickets linked to a specific test run with pagination
 */
export const getTicketsByRunPaginated = async (
  runId: string,
  options: { limit: number; offset: number }
): Promise<{ items: TicketListResponse[]; total: number }> => {
  const query = { relatedRunId: runId };

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate("createdBy", "name profilePicture")
      .populate("assignedTo", "name profilePicture")
      .sort({ createdAt: -1 })
      .skip(options.offset)
      .limit(options.limit)
      .lean(),
    Ticket.countDocuments(query),
  ]);

  return {
    items: tickets.map(formatTicketList),
    total,
  };
};

/**
 * Mark a ticket as reproduced. Idempotent: keeps the first timestamp.
 */
export const markTicketReproduced = async (
  id: string
): Promise<TicketResponse | null> => {
  const ticket = await Ticket.findById(new Types.ObjectId(id)).lean();
  if (!ticket) return null;

  if (!ticket.firstReproducedAt) {
    await Ticket.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: { firstReproducedAt: new Date() } },
      { new: true }
    );
  }

  const updated = await Ticket.findById(new Types.ObjectId(id))
    .populate("createdBy", "name profilePicture")
    .populate("assignedTo", "name profilePicture")
    .lean();

  return updated ? formatTicket(updated) : null;
};

/**
 * Record a "returned for missing context" event.
 * Reopens the ticket and increments the return counter.
 */
export const returnTicketForInfo = async (
  id: string,
  data: ReturnForInfoRequest
): Promise<TicketResponse | null> => {
  const updated = await Ticket.findByIdAndUpdate(
    new Types.ObjectId(id),
    {
      $set: {
        status: TicketStatus.Reopened,
        lastReturnedAt: new Date(),
        lastReturnReason: data.reason,
      },
      $inc: { returnedCount: 1 },
    },
    { new: true }
  )
    .populate("createdBy", "name profilePicture")
    .populate("assignedTo", "name profilePicture")
    .lean();

  return updated ? formatTicket(updated) : null;
};

// Keep User import referenced to avoid tree-shaking
void User;
