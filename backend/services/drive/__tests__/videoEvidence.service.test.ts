import { Types } from "mongoose";
import {
  DriveServiceError,
  VIDEO_ERRORS,
} from "../types/drive.types.js";

// Mock all dependencies before importing services
jest.mock("../../../models/user.model.js");
jest.mock("../../../models/project.model.js");
jest.mock("../../../models/ticket.model.js");
jest.mock("../../../models/testRun.model.js");
jest.mock("../../../models/videoEvidence.model.js");
jest.mock("../../testCase/services/project.service.js");
jest.mock("../services/driveApi.service.js");
jest.mock("../services/driveOAuth.service.js");
jest.mock("../services/driveConnection.service.js");

import { User } from "../../../models/user.model.js";
import { Project } from "../../../models/project.model.js";
import { Ticket } from "../../../models/ticket.model.js";
import { TestRun } from "../../../models/testRun.model.js";
import { VideoEvidence } from "../../../models/videoEvidence.model.js";
import * as projectService from "../../testCase/services/project.service.js";
import * as driveApi from "../services/driveApi.service.js";
import { getDriveAccessToken } from "../services/driveOAuth.service.js";
import {
  decryptRefreshToken,
  getEncryptedDriveToken,
} from "../services/driveConnection.service.js";
import * as videoEvidenceService from "../services/videoEvidence.service.js";

const mockUser = User as any;
const mockProject = Project as any;
const mockTicket = Ticket as any;
const mockTestRun = TestRun as any;
const mockVideoEvidence = VideoEvidence as any;

describe("Video Evidence Service", () => {
  let testUserId: string;
  let testProjectId: string;
  let testTicketId: string;
  let testRunId: string;
  let testEvidenceId: string;
  let hasProjectAccessSpy: any;
  let isProjectOwnerSpy: any;

  beforeAll(() => {
    testUserId = new Types.ObjectId().toString();
    testProjectId = new Types.ObjectId().toString();
    testTicketId = new Types.ObjectId().toString();
    testRunId = new Types.ObjectId().toString();
    testEvidenceId = new Types.ObjectId().toString();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    hasProjectAccessSpy = jest.spyOn(projectService, "hasProjectAccess").mockResolvedValue(true);
    isProjectOwnerSpy = jest.spyOn(projectService, "isProjectOwner").mockResolvedValue(false);

    mockProject.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          name: "Test Project",
          settings: { videoEvidence: { enabled: true, publicLinks: false } },
        }),
      }),
    });

    mockUser.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ name: "Tester Name", googleDrive: { folders: {} } }),
      }),
    });
    mockUser.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

    mockTicket.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: testTicketId }),
    });

    (getEncryptedDriveToken as jest.Mock).mockResolvedValue("encrypted-token");
    (getDriveAccessToken as jest.Mock).mockResolvedValue("fake-access-token");
  });

  afterEach(() => {
    hasProjectAccessSpy.mockRestore();
    isProjectOwnerSpy.mockRestore();
  });

  describe("createUploadSession", () => {
    it("should create a resumable upload session for connected members", async () => {
      mockTicket.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: testTicketId }),
      });
      (driveApi as any).ensureRootFolder = jest.fn().mockResolvedValue("root-folder-id");
      (driveApi as any).ensureProjectFolder = jest.fn().mockResolvedValue("project-folder-id");
      (driveApi as any).createResumableUploadSession = jest
        .fn()
        .mockResolvedValue("https://www.googleapis.com/upload/session-uri");

      const session = await videoEvidenceService.createUploadSession(
        testProjectId,
        testUserId,
        {
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        }
      );

      expect(session.sessionUri).toBe("https://www.googleapis.com/upload/session-uri");
      expect(session.accessToken).toBe("fake-access-token");
      expect(session.expiresIn).toBe(3600);
      expect(driveApi.createResumableUploadSession).toHaveBeenCalledWith(
        "fake-access-token",
        expect.objectContaining({
          name: "failure.mp4",
          mimeType: "video/mp4",
          parents: ["project-folder-id"],
        })
      );
    });

    it("should reject uploads when video evidence is disabled", async () => {
      mockProject.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            name: "Test Project",
            settings: { videoEvidence: { enabled: false, publicLinks: false } },
          }),
        }),
      });

      await expect(
        videoEvidenceService.createUploadSession(testProjectId, testUserId, {
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        })
      ).rejects.toMatchObject<any>({
        status: 403,
        message: VIDEO_ERRORS.NOT_ENABLED,
      });
    });

    it("should reject unsupported file types", async () => {
      await expect(
        videoEvidenceService.createUploadSession(testProjectId, testUserId, {
          fileName: "failure.txt",
          mimeType: "text/plain",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        })
      ).rejects.toMatchObject<any>({
        status: 400,
        message: VIDEO_ERRORS.INVALID_FILE_TYPE,
      });
    });

    it("should reject when the user has no Drive connection", async () => {
      (getEncryptedDriveToken as jest.Mock).mockResolvedValue(null);

      await expect(
        videoEvidenceService.createUploadSession(testProjectId, testUserId, {
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        })
      ).rejects.toMatchObject<any>({
        status: 403,
        message: VIDEO_ERRORS.NOT_CONNECTED,
      });
    });

    it("should reject when the ticket does not belong to the project", async () => {
      mockTicket.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        videoEvidenceService.createUploadSession(testProjectId, testUserId, {
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        })
      ).rejects.toMatchObject<any>({
        status: 404,
        message: VIDEO_ERRORS.INVALID_SCOPE_TARGET,
      });
    });

    it("should reject when no scope is provided", async () => {
      await expect(
        videoEvidenceService.createUploadSession(testProjectId, testUserId, {
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
        })
      ).rejects.toMatchObject<any>({
        status: 400,
        message: VIDEO_ERRORS.MISSING_SCOPE,
      });
    });
  });

  describe("registerVideoEvidence", () => {
    let driveMetadata: Record<string, unknown>;

    beforeEach(() => {
      driveMetadata = {
        id: "drive-file-123",
        name: "failure.mp4",
        mimeType: "video/mp4",
        size: "1048576",
        webViewLink: "https://drive.google.com/file/d/drive-file-123/view",
        appProperties: { app: "test-case-manager" },
        owners: [{ me: true }],
      };
      mockTicket.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: testTicketId }),
      });
      (driveApi as any).getDriveFileMetadata = jest.fn().mockResolvedValue(driveMetadata);
    });

    it("should verify the Drive file and register evidence", async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      mockVideoEvidence.mockImplementation((payload: any) => ({
        _id: new Types.ObjectId(testEvidenceId),
        ...payload,
        uploadedBy: payload.uploadedBy,
        projectId: payload.projectId,
        save: saveMock,
      }));
      mockUser.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "Tester Name" }) });

      const evidence = await videoEvidenceService.registerVideoEvidence(
        testProjectId,
        testUserId,
        {
          driveFileId: "drive-file-123",
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        }
      );

      expect(evidence.id).toBe(testEvidenceId.toString());
      expect(evidence.fileName).toBe("failure.mp4");
      expect(saveMock).toHaveBeenCalled();
      expect(driveApi.getDriveFileMetadata).toHaveBeenCalledWith("fake-access-token", "drive-file-123");
    });

    it("should reject a Drive file not created by this app (no app property)", async () => {
      (driveApi as any).getDriveFileMetadata = jest.fn().mockResolvedValue({
        ...driveMetadata,
        appProperties: undefined,
      });

      await expect(
        videoEvidenceService.registerVideoEvidence(testProjectId, testUserId, {
          driveFileId: "drive-file-123",
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        })
      ).rejects.toMatchObject<any>({
        status: 403,
        message: VIDEO_ERRORS.FORBIDDEN,
      });
    });

    it("should reject a Drive file not owned by the uploader", async () => {
      (driveApi as any).getDriveFileMetadata = jest.fn().mockResolvedValue({
        ...driveMetadata,
        appProperties: { app: "test-case-manager" },
        owners: [{ me: false }],
      });

      await expect(
        videoEvidenceService.registerVideoEvidence(testProjectId, testUserId, {
          driveFileId: "drive-file-123",
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        })
      ).rejects.toMatchObject<any>({
        status: 403,
        message: VIDEO_ERRORS.FORBIDDEN,
      });
    });

    it("should create an anyone-with-link permission when public links are enabled", async () => {
      mockProject.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            name: "Test Project",
            settings: { videoEvidence: { enabled: true, publicLinks: true } },
          }),
        }),
      });
      (driveApi as any).createDrivePermission = jest.fn().mockResolvedValue(true);
      (driveApi as any).getDriveFileMetadata = jest
        .fn()
        .mockResolvedValueOnce(driveMetadata)
        .mockResolvedValueOnce({ ...driveMetadata, webViewLink: "https://drive.google.com/file/d/abc/view" });
      const saveMock = jest.fn().mockResolvedValue(true);
      mockVideoEvidence.mockImplementation((payload: any) => ({
        _id: new Types.ObjectId(testEvidenceId),
        ...payload,
        save: saveMock,
      }));

      const evidence = await videoEvidenceService.registerVideoEvidence(
        testProjectId,
        testUserId,
        {
          driveFileId: "drive-file-123",
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        }
      );

      expect(driveApi.createDrivePermission).toHaveBeenCalledWith(
        "fake-access-token",
        "drive-file-123",
        {
          role: "reader",
          type: "anyone",
          allowFileDiscovery: false,
        }
      );
      expect(evidence.webViewLink).toBe("https://drive.google.com/file/d/abc/view");
    });

    it("should reject duplicate registrations", async () => {
      const duplicateError = new Error("Duplicate key");
      (duplicateError as { code?: number }).code = 11000;
      mockVideoEvidence.mockImplementation((payload: any) => ({
        _id: new Types.ObjectId(testEvidenceId),
        ...payload,
        save: jest.fn().mockRejectedValue(duplicateError),
      }));

      await expect(
        videoEvidenceService.registerVideoEvidence(testProjectId, testUserId, {
          driveFileId: "drive-file-123",
          fileName: "failure.mp4",
          mimeType: "video/mp4",
          fileSize: 1024 * 1024,
          ticketId: testTicketId,
        })
      ).rejects.toMatchObject<any>({
        status: 409,
      });
    });
  });

  describe("resolveUploadedFileId", () => {
    beforeEach(() => {
      (driveApi as any).ensureRootFolder = jest.fn().mockResolvedValue("root-folder-id");
      (driveApi as any).ensureProjectFolder = jest.fn().mockResolvedValue("project-folder-id");
    });

    it("should resolve the newest matching Drive file", async () => {
      (driveApi as any).listRecentProjectFiles = jest.fn().mockResolvedValue([
        {
          id: "drive-file-new",
          name: "evidence.mp4",
          mimeType: "video/mp4",
          size: "1048576",
          webViewLink: "https://drive.google.com/file/d/drive-file-new/view",
          appProperties: { app: "test-case-manager" },
          owners: [{ me: true }],
          createdTime: "2025-01-20T10:00:00.000Z",
        },
        {
          id: "drive-file-old",
          name: "evidence.mp4",
          mimeType: "video/mp4",
          size: "1048576",
          webViewLink: "https://drive.google.com/file/d/drive-file-old/view",
          appProperties: { app: "test-case-manager" },
          owners: [{ me: true }],
          createdTime: "2025-01-15T10:00:00.000Z",
        },
      ]);

      const result = await videoEvidenceService.resolveUploadedFileId(
        testProjectId,
        testUserId,
        { fileName: "evidence.mp4", mimeType: "video/mp4", fileSize: 1048576 }
      );

      expect(result.driveFileId).toBe("drive-file-new");
      expect(result.webViewLink).toBe("https://drive.google.com/file/d/drive-file-new/view");
      expect(driveApi.listRecentProjectFiles).toHaveBeenCalledWith(
        "fake-access-token",
        "project-folder-id",
        "evidence.mp4",
        "video/mp4"
      );
    });

    it("should return 404 when no matching file is found", async () => {
      (driveApi as any).listRecentProjectFiles = jest.fn().mockResolvedValue([]);

      await expect(
        videoEvidenceService.resolveUploadedFileId(testProjectId, testUserId, {
          fileName: "evidence.mp4",
          mimeType: "video/mp4",
          fileSize: 1048576,
        })
      ).rejects.toMatchObject<any>({
        status: 404,
        message: VIDEO_ERRORS.UPLOAD_NOT_FOUND,
      });
    });

    it("should ignore files without the app property", async () => {
      (driveApi as any).listRecentProjectFiles = jest.fn().mockResolvedValue([
        {
          id: "drive-file-foreign",
          name: "evidence.mp4",
          mimeType: "video/mp4",
          size: "1048576",
          appProperties: {},
          owners: [{ me: true }],
        },
      ]);

      await expect(
        videoEvidenceService.resolveUploadedFileId(testProjectId, testUserId, {
          fileName: "evidence.mp4",
          mimeType: "video/mp4",
          fileSize: 1048576,
        })
      ).rejects.toMatchObject<any>({
        status: 404,
        message: VIDEO_ERRORS.UPLOAD_NOT_FOUND,
      });
    });

    it("should ignore files not owned by the user", async () => {
      (driveApi as any).listRecentProjectFiles = jest.fn().mockResolvedValue([
        {
          id: "drive-file-shared",
          name: "evidence.mp4",
          mimeType: "video/mp4",
          size: "1048576",
          appProperties: { app: "test-case-manager" },
          owners: [{ me: false }],
        },
      ]);

      await expect(
        videoEvidenceService.resolveUploadedFileId(testProjectId, testUserId, {
          fileName: "evidence.mp4",
          mimeType: "video/mp4",
          fileSize: 1048576,
        })
      ).rejects.toMatchObject<any>({
        status: 404,
        message: VIDEO_ERRORS.UPLOAD_NOT_FOUND,
      });
    });

    it("should ignore files with a different size", async () => {
      (driveApi as any).listRecentProjectFiles = jest.fn().mockResolvedValue([
        {
          id: "drive-file-wrong-size",
          name: "evidence.mp4",
          mimeType: "video/mp4",
          size: "2048",
          appProperties: { app: "test-case-manager" },
          owners: [{ me: true }],
        },
      ]);

      await expect(
        videoEvidenceService.resolveUploadedFileId(testProjectId, testUserId, {
          fileName: "evidence.mp4",
          mimeType: "video/mp4",
          fileSize: 1048576,
        })
      ).rejects.toMatchObject<any>({
        status: 404,
        message: VIDEO_ERRORS.UPLOAD_NOT_FOUND,
      });
    });

    it("should reject when video evidence is disabled", async () => {
      mockProject.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            name: "Test Project",
            settings: { videoEvidence: { enabled: false, publicLinks: false } },
          }),
        }),
      });

      await expect(
        videoEvidenceService.resolveUploadedFileId(testProjectId, testUserId, {
          fileName: "evidence.mp4",
          mimeType: "video/mp4",
          fileSize: 1048576,
        })
      ).rejects.toMatchObject<any>({
        status: 403,
        message: VIDEO_ERRORS.NOT_ENABLED,
      });
    });

    it("should reject when the user has no Drive connection", async () => {
      (getEncryptedDriveToken as jest.Mock).mockResolvedValue(null);

      await expect(
        videoEvidenceService.resolveUploadedFileId(testProjectId, testUserId, {
          fileName: "evidence.mp4",
          mimeType: "video/mp4",
          fileSize: 1048576,
        })
      ).rejects.toMatchObject<any>({
        status: 403,
        message: VIDEO_ERRORS.NOT_CONNECTED,
      });
    });
  });

  describe("deleteVideoEvidence", () => {
    it("should forbid members who are neither uploader nor owner", async () => {
      mockVideoEvidence.findById = jest.fn().mockResolvedValue({
        _id: testEvidenceId,
        projectId: new Types.ObjectId(testProjectId),
        uploadedBy: new Types.ObjectId(testUserId).toString(),
      });
      isProjectOwnerSpy.mockResolvedValue(false);

      await expect(
        videoEvidenceService.deleteVideoEvidence(testProjectId, "some-other-user", testEvidenceId)
      ).rejects.toMatchObject<any>({
        status: 403,
      });
    });

    it("should delete the Drive file only for the uploader", async () => {
      mockVideoEvidence.findById = jest.fn().mockResolvedValue({
        _id: testEvidenceId,
        projectId: new Types.ObjectId(testProjectId),
        uploadedBy: testUserId,
        driveFileId: "drive-file-123",
      });
      mockVideoEvidence.deleteOne = jest.fn().mockResolvedValue(true);
      (driveApi as any).deleteDriveFile = jest.fn().mockResolvedValue(true);
      isProjectOwnerSpy.mockResolvedValue(false);

      await videoEvidenceService.deleteVideoEvidence(testProjectId, testUserId, testEvidenceId);

      expect(driveApi.deleteDriveFile).toHaveBeenCalledWith("fake-access-token", "drive-file-123");
      expect(mockVideoEvidence.deleteOne).toHaveBeenCalledWith({ _id: testEvidenceId });
    });

    it("should not delete the Drive file when the project owner removes evidence", async () => {
      mockVideoEvidence.findById = jest.fn().mockResolvedValue({
        _id: testEvidenceId,
        projectId: new Types.ObjectId(testProjectId),
        uploadedBy: new Types.ObjectId().toString(),
        driveFileId: "drive-file-123",
      });
      mockVideoEvidence.deleteOne = jest.fn().mockResolvedValue(true);
      (driveApi as any).deleteDriveFile = jest.fn().mockResolvedValue(true);
      isProjectOwnerSpy.mockResolvedValue(true);

      await videoEvidenceService.deleteVideoEvidence(testProjectId, testUserId, testEvidenceId);

      expect(driveApi.deleteDriveFile).not.toHaveBeenCalled();
      expect(mockVideoEvidence.deleteOne).toHaveBeenCalledWith({ _id: testEvidenceId });
    });

    it("should return 404 for evidence that does not exist", async () => {
      mockVideoEvidence.findById = jest.fn().mockResolvedValue(null);

      await expect(
        videoEvidenceService.deleteVideoEvidence(testProjectId, testUserId, testEvidenceId)
      ).rejects.toMatchObject<any>({
        status: 404,
      });
    });
  });

  describe("getEvidenceStream", () => {
    it("should stream the uploader's media for an authorized member", async () => {
      mockVideoEvidence.findById = jest.fn().mockResolvedValue({
        _id: testEvidenceId,
        projectId: new Types.ObjectId(testProjectId),
        uploadedBy: testUserId,
        driveFileId: "drive-file-123",
        mimeType: "video/mp4",
      });
      const upstream = { pipe: jest.fn(), status: 200, headers: {} } as unknown as Response;
      (driveApi as any).getDriveFileMedia = jest.fn().mockResolvedValue(upstream);

      const result = await videoEvidenceService.getEvidenceStream(
        testProjectId,
        testUserId,
        testEvidenceId,
        "bytes=0-1023"
      );

      expect(result.mimeType).toBe("video/mp4");
      expect(result.upstream).toBe(upstream);
      expect(driveApi.getDriveFileMedia).toHaveBeenCalledWith(
        "fake-access-token",
        "drive-file-123",
        "bytes=0-1023"
      );
    });

    it("should return 409 when the uploader disconnected their Drive", async () => {
      mockVideoEvidence.findById = jest.fn().mockResolvedValue({
        _id: testEvidenceId,
        projectId: new Types.ObjectId(testProjectId),
        uploadedBy: testUserId,
        driveFileId: "drive-file-123",
      });
      (getEncryptedDriveToken as jest.Mock).mockResolvedValue(null);

      await expect(
        videoEvidenceService.getEvidenceStream(testProjectId, testUserId, testEvidenceId)
      ).rejects.toMatchObject<any>({
        status: 409,
        message: VIDEO_ERRORS.UPLOADER_DISCONNECTED,
      });
    });

    it("should return 404 when the Drive file no longer exists", async () => {
      mockVideoEvidence.findById = jest.fn().mockResolvedValue({
        _id: testEvidenceId,
        projectId: new Types.ObjectId(testProjectId),
        uploadedBy: testUserId,
        driveFileId: "drive-file-123",
      });
      (driveApi as any).getDriveFileMedia = jest.fn().mockResolvedValue(null);

      await expect(
        videoEvidenceService.getEvidenceStream(testProjectId, testUserId, testEvidenceId)
      ).rejects.toMatchObject<any>({
        status: 404,
        message: VIDEO_ERRORS.DRIVE_FILE_MISSING,
      });
    });
  });

  describe("listVideoEvidence", () => {
    it("should list evidence for a ticket scope", async () => {
      mockVideoEvidence.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(testEvidenceId),
            projectId: new Types.ObjectId(testProjectId),
            ticketId: new Types.ObjectId(testTicketId),
            uploadedBy: testUserId,
            provider: "google_drive",
            driveFileId: "drive-file-123",
            fileName: "failure.mp4",
            mimeType: "video/mp4",
            fileSize: 1024,
            createdAt: new Date("2024-01-15T10:00:00.000Z"),
          },
        ]),
      });
      mockUser.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "Tester Name" }) });

      const results = await videoEvidenceService.listVideoEvidence(
        testProjectId,
        testUserId,
        { ticketId: testTicketId }
      );

      expect(results).toHaveLength(1);
      expect(results[0].fileName).toBe("failure.mp4");
      expect(results[0].uploadedBy.name).toBe("Tester Name");
      expect(mockVideoEvidence.find).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: new Types.ObjectId(testProjectId),
          ticketId: testTicketId,
        })
      );
    });
  });
});