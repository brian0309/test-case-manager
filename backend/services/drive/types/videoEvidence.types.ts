import { Document, Types } from "mongoose";

export interface IVideoEvidence {
  projectId: Types.ObjectId;
  ticketId?: Types.ObjectId;
  testRunId?: Types.ObjectId;
  testRunItemId?: string;
  uploadedBy: Types.ObjectId;
  provider: "google_drive";
  driveFileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  webViewLink?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVideoEvidenceDocument extends IVideoEvidence, Document {}