import { Types } from "mongoose";
import { Ticket } from "../../../models/ticket.model.js";
import {
  ITicket,
  TicketResponse,
  TicketListResponse,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketStatus,
} from "../types/ticket.types.js";
import { User } from "../../../models/user.model.js";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?background=random&color=fff&name=";

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
    tags: ticket.tags ?? [],
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
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

  return ticket ? formatTicket(ticket) : null;
};

/**
 * Create a new ticket
 */
export const createTicket = async (
  projectId: string,
  userId: string,
  data: CreateTicketRequest
): Promise<TicketResponse> => {
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

// Keep User import referenced to avoid tree-shaking
void User;
