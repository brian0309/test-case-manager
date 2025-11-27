import { Request, Response } from "express";
import * as uploadService from "../services/upload.service.js";
import { UPLOAD_ERRORS } from "../types/upload.types.js";

/**
 * POST /api/upload/presigned-url
 * Generates a presigned URL for uploading an image to S3-compatible storage
 * Protected route - requires authentication
 */
export const generatePresignedUrl = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { filename, contentType, fileSize } = req.body;

        // Validate required parameters
        if (!filename || !contentType || !fileSize) {
            res.status(400).json({
                success: false,
                message: UPLOAD_ERRORS.MISSING_PARAMETERS,
            });
            return;
        }

        // Validate file size is a positive number
        if (typeof fileSize !== "number" || fileSize <= 0) {
            res.status(400).json({
                success: false,
                message: "File size must be a positive number",
            });
            return;
        }

        // Generate presigned URL
        const result = await uploadService.generatePresignedUrl({
            filename,
            contentType,
            fileSize,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Error in generatePresignedUrl:", error);

        const errorMessage = error instanceof Error ? error.message : "Internal server error";

        // Check if it's a validation error
        const isValidationError =
            errorMessage.includes("File size") ||
            errorMessage.includes("File type") ||
            errorMessage.includes("S3_BUCKET_NAME");

        res.status(isValidationError ? 400 : 500).json({
            success: false,
            message: errorMessage,
        });
    }
};
