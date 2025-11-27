import axios from "axios";
import { API_URL } from "./api";

/**
 * Response from presigned URL endpoint
 */
interface PresignedUrlResponse {
    success: boolean;
    data?: {
        presignedUrl: string;
        publicUrl: string;
        key: string;
        expiresIn: number;
    };
    message?: string;
}

/**
 * Upload an image file to S3-compatible storage using presigned URL
 * @param file - The image file to upload
 * @returns The public URL of the uploaded image
 */
export const uploadImage = async (file: File): Promise<string> => {
    try {
        // Step 1: Request presigned URL from backend
        const presignedResponse = await axios.post<PresignedUrlResponse>(
            `${API_URL}/upload/presigned-url`,
            {
                filename: file.name,
                contentType: file.type,
                fileSize: file.size,
            },
            {
                withCredentials: true, // Include auth cookie
            }
        );

        if (!presignedResponse.data.success || !presignedResponse.data.data) {
            throw new Error(
                presignedResponse.data.message || "Failed to get upload URL"
            );
        }

        const { presignedUrl, publicUrl } = presignedResponse.data.data;

        // Step 2: Upload file directly to S3 using presigned URL
        await axios.put(presignedUrl, file, {
            headers: {
                "Content-Type": file.type,
            },
            // Don't send credentials to S3
            withCredentials: false,
        });

        // Step 3: Return the public URL for the uploaded image
        return publicUrl;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message =
                error.response?.data?.message || error.message || "Upload failed";
            throw new Error(message);
        }
        throw error;
    }
};

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export const validateImageFile = (file: File): string | null => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

    if (!ALLOWED_TYPES.includes(file.type)) {
        return "Please upload an image file (JPEG, PNG, GIF, or WebP)";
    }

    if (file.size > MAX_FILE_SIZE) {
        return "File size must be less than 10MB";
    }

    return null;
};
