import { S3Client } from "@aws-sdk/client-s3";

/**
 * S3-compatible client configuration
 * Works with Cloudflare R2, AWS S3, MinIO, and other S3-compatible services
 */
export const createS3Client = (): S3Client => {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || "auto";
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
        const missing = [];
        if (!endpoint) missing.push("S3_ENDPOINT");
        if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID");
        if (!secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");

        console.error("❌ S3 Configuration Error - Missing variables:", missing);
        console.error("   S3_ENDPOINT:", endpoint || "(not set)");
        console.error("   S3_ACCESS_KEY_ID:", accessKeyId ? "(set)" : "(not set)");
        console.error("   S3_SECRET_ACCESS_KEY:", secretAccessKey ? "(set)" : "(not set)");

        throw new Error(
            `Missing required S3 configuration: ${missing.join(", ")}. Please set these environment variables in your .env file.`
        );
    }

    console.log("✅ S3 client configured successfully");
    console.log("   Endpoint:", endpoint);
    console.log("   Region:", region);
    console.log("   Bucket:", process.env.S3_BUCKET_NAME || "(not set)");

    return new S3Client({
        region,
        endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
};

// Lazy singleton - only created when first accessed
let s3ClientInstance: S3Client | null = null;

/**
 * Get the S3 client instance (lazy initialization)
 * This ensures environment variables are loaded before creating the client
 */
export const getS3Client = (): S3Client => {
    if (!s3ClientInstance) {
        s3ClientInstance = createS3Client();
    }
    return s3ClientInstance;
};
