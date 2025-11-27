import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { getS3Client } from "../config/s3.config.js";
import {
    PresignedUrlRequest,
    PresignedUrlResponse,
    FILE_CONSTRAINTS,
    UPLOAD_ERRORS,
} from "../types/upload.types.js";

/**
 * Validates file metadata before generating presigned URL
 */
export const validateFile = (
    contentType: string,
    fileSize: number
): { valid: boolean; error?: string } => {
    // Check file size
    if (fileSize > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
        return { valid: false, error: UPLOAD_ERRORS.FILE_TOO_LARGE };
    }

    // Check file type
    if (!FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(contentType as any)) {
        return { valid: false, error: UPLOAD_ERRORS.INVALID_FILE_TYPE };
    }

    return { valid: true };
};

/**
 * Generates a unique key for the uploaded file
 */
export const generateFileKey = (filename: string): string => {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const extension = filename.split(".").pop() || "";
    const sanitizedFilename = filename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 100);

    return `uploads/${timestamp}-${uuid}-${sanitizedFilename}`;
};

/**
 * Generates a presigned URL for uploading a file to S3-compatible storage
 */
export const generatePresignedUrl = async (
    request: PresignedUrlRequest
): Promise<PresignedUrlResponse> => {
    const { filename, contentType, fileSize } = request;

    // Validate file
    const validation = validateFile(contentType, fileSize);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const bucketName = process.env.S3_BUCKET_NAME;
    const publicUrl = process.env.S3_PUBLIC_URL;

    if (!bucketName) {
        throw new Error("S3_BUCKET_NAME environment variable is not set");
    }

    // Generate unique key for the file
    const key = generateFileKey(filename);

    // Create PutObject command
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
    });

    // Generate presigned URL using lazy S3 client
    const presignedUrl = await getSignedUrl(getS3Client(), command, {
        expiresIn: FILE_CONSTRAINTS.PRESIGNED_URL_EXPIRY,
    });

    // Construct public URL
    const finalPublicUrl = publicUrl
        ? `${publicUrl}/${key}`
        : `${process.env.S3_ENDPOINT}/${bucketName}/${key}`;

    console.log("📝 Generated Public URL:", finalPublicUrl);

    return {
        presignedUrl,
        publicUrl: finalPublicUrl,
        key,
        expiresIn: FILE_CONSTRAINTS.PRESIGNED_URL_EXPIRY,
    };
};
