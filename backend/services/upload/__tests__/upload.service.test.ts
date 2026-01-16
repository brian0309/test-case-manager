import {
    validateFile,
    generateFileKey,
} from "../services/upload.service.js";
import { FILE_CONSTRAINTS, UPLOAD_ERRORS } from "../types/upload.types.js";

// Mock uuid to return predictable values
jest.mock("uuid", () => ({
    v4: () => "test-uuid-1234",
}));

describe("Upload Service", () => {
    describe("validateFile", () => {
        it("should accept valid JPEG file within size limit", () => {
            const result = validateFile("image/jpeg", 1024 * 1024); // 1MB
            expect(result).toEqual({ valid: true });
        });

        it("should accept valid PNG file within size limit", () => {
            const result = validateFile("image/png", 5 * 1024 * 1024); // 5MB
            expect(result).toEqual({ valid: true });
        });

        it("should accept valid GIF file within size limit", () => {
            const result = validateFile("image/gif", 2 * 1024 * 1024); // 2MB
            expect(result).toEqual({ valid: true });
        });

        it("should accept valid WebP file within size limit", () => {
            const result = validateFile("image/webp", 1024); // 1KB
            expect(result).toEqual({ valid: true });
        });

        it("should accept file at exactly max size limit", () => {
            const result = validateFile("image/jpeg", FILE_CONSTRAINTS.MAX_FILE_SIZE);
            expect(result).toEqual({ valid: true });
        });

        it("should reject file exceeding size limit", () => {
            const result = validateFile("image/jpeg", FILE_CONSTRAINTS.MAX_FILE_SIZE + 1);
            expect(result).toEqual({
                valid: false,
                error: UPLOAD_ERRORS.FILE_TOO_LARGE,
            });
        });

        it("should reject file with large size exceeding limit", () => {
            const result = validateFile("image/png", 50 * 1024 * 1024); // 50MB
            expect(result).toEqual({
                valid: false,
                error: UPLOAD_ERRORS.FILE_TOO_LARGE,
            });
        });

        it("should reject unsupported file type PDF", () => {
            const result = validateFile("application/pdf", 1024 * 1024);
            expect(result).toEqual({
                valid: false,
                error: UPLOAD_ERRORS.INVALID_FILE_TYPE,
            });
        });

        it("should reject unsupported file type text/plain", () => {
            const result = validateFile("text/plain", 1024);
            expect(result).toEqual({
                valid: false,
                error: UPLOAD_ERRORS.INVALID_FILE_TYPE,
            });
        });

        it("should reject unsupported file type video/mp4", () => {
            const result = validateFile("video/mp4", 5 * 1024 * 1024);
            expect(result).toEqual({
                valid: false,
                error: UPLOAD_ERRORS.INVALID_FILE_TYPE,
            });
        });

        it("should reject unsupported file type application/zip", () => {
            const result = validateFile("application/zip", 1024 * 1024);
            expect(result).toEqual({
                valid: false,
                error: UPLOAD_ERRORS.INVALID_FILE_TYPE,
            });
        });

        it("should reject file size check before type check (large unsupported file)", () => {
            const result = validateFile("application/pdf", 50 * 1024 * 1024);
            // Size is checked first, so we expect file too large error
            expect(result).toEqual({
                valid: false,
                error: UPLOAD_ERRORS.FILE_TOO_LARGE,
            });
        });
    });

    describe("generateFileKey", () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it("should generate key with correct format for simple filename", () => {
            const key = generateFileKey("test-image.jpg");
            expect(key).toMatch(/^uploads\/\d+-test-uuid-1234-test-image\.jpg$/);
            // Verify that the timestamp is in the expected format
            const timestampMatch = key.match(/uploads\/(\d+)-/);
            expect(timestampMatch).not.toBeNull();
        });

        it("should preserve file extension", () => {
            const jpgKey = generateFileKey("photo.jpg");
            expect(jpgKey).toMatch(/\.jpg$/);

            const pngKey = generateFileKey("image.png");
            expect(pngKey).toMatch(/\.png$/);
        });

        it("should sanitize special characters in filename", () => {
            const key = generateFileKey("my file (1) @special!.jpg");
            expect(key).toContain("my_file__1___special_");
            expect(key).not.toContain(" ");
            expect(key).not.toContain("(");
            expect(key).not.toContain("@");
            expect(key).not.toContain("!");
        });

        it("should truncate very long filenames", () => {
            const longFilename = "a".repeat(200) + ".jpg";
            const key = generateFileKey(longFilename);
            // The sanitized filename should be max 100 chars
            const parts = key.split("-");
            const sanitizedPart = parts[parts.length - 1];
            expect(sanitizedPart.length).toBeLessThanOrEqual(100);
        });

        it("should handle filename without extension", () => {
            const key = generateFileKey("noextension");
            expect(key).toMatch(/^uploads\/\d+-test-uuid-1234-noextension$/);
        });

        it("should handle filename with multiple dots", () => {
            const key = generateFileKey("my.file.name.jpg");
            expect(key).toContain("my.file.name.jpg");
        });

        it("should start with uploads/ prefix", () => {
            const key = generateFileKey("image.png");
            expect(key.startsWith("uploads/")).toBe(true);
        });

        it("should include timestamp for uniqueness", () => {
            const key = generateFileKey("image.png");
            const timestamp = Date.now().toString();
            expect(key).toContain(timestamp);
        });
    });
});
