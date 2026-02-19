import { ObjectId } from "mongoose";

export interface DiscussionMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  imageUrl?: string;
  messageType: "text" | "image";
  createdAt: Date;
  updatedAt: Date;
}

export interface Discussion {
  id: string;
  testCaseId: string;
  projectId: string;
  messages: DiscussionMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMessageRequest {
  content: string;
  imageUrl?: string;
  messageType?: "text" | "image";
}

export interface DiscussionResponse {
  id: string;
  testCaseId: string;
  projectId: string;
  messages: DiscussionMessage[];
  createdAt: Date;
  updatedAt: Date;
}
