/**
 * Request to generate a presigned URL
 */
export interface PresignedUrlRequest {
    filename: string;
    contentType: string;
    fileSize: number;
}

/**
 * Response containing presigned URL and public URL
 */
export interface PresignedUrlResponse {
    presignedUrl: string;
    publicUrl: string;
    key: string;
    expiresIn: number;
}

/**
 * File validation constraints
 */
export const FILE_CONSTRAINTS = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_MIME_TYPES: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    ],
    PRESIGNED_URL_EXPIRY: 60 * 5, // 5 minutes
} as const;

/**
 * Error messages
 */
export const UPLOAD_ERRORS = {
    FILE_TOO_LARGE: `File size exceeds maximum limit of ${FILE_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
    INVALID_FILE_TYPE: "File type not supported. Please upload an image file (JPEG, PNG, GIF, or WebP)",
    MISSING_PARAMETERS: "Missing required parameters: filename, contentType, and fileSize are required",
    S3_CONFIG_ERROR: "S3 storage is not properly configured",
} as const;
