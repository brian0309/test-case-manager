import { Document, Types } from "mongoose";

export enum MessageType {
  Comment = "comment",
  System = "system",
}

export enum MessageBodyFormat {
  Plain = "plain",
  Html = "html",
}

export enum MessageFixState {
  Fixed = "fixed",
  NotFixed = "not-fixed",
}

export interface IAttachment {
  url: string;
  filename: string;
  fileSize: number;
  contentType: string;
}

export interface IDiscussionMessage {
  testCaseId?: Types.ObjectId;
  ticketId?: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  type: MessageType;
  body: string;
  bodyFormat: MessageBodyFormat;
  fixState?: MessageFixState;
  relatedRunId?: string;
  relatedRunItemId?: string;
  attachments: IAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDiscussionMessageDocument
  extends IDiscussionMessage,
    Document {}

export interface CreateMessageRequest {
  body: string;
  attachments?: IAttachment[];
}

export interface CreateMessageOptions {
  type?: MessageType;
  bodyFormat?: MessageBodyFormat;
  fixState?: MessageFixState;
  relatedRunId?: string;
  relatedRunItemId?: string;
}

export interface MessageResponse {
  id: string;
  testCaseId?: string;
  ticketId?: string;
  projectId: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  type: MessageType;
  body: string;
  bodyFormat: MessageBodyFormat;
  fixState?: MessageFixState;
  relatedRunId?: string;
  relatedRunItemId?: string;
  attachments: IAttachment[];
  createdAt: string;
  updatedAt: string;
}
