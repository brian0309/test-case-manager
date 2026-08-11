export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type AllowedVideoMimeType = (typeof ALLOWED_VIDEO_TYPES)[number];

/**
 * Validates a video file before upload.
 * @returns Error message or null when the file is acceptable.
 */
export const validateVideoFile = (
  file: File,
  maxSizeMB: number
): string | null => {
  if (!(ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type)) {
    return "Unsupported format. Please upload an MP4, WebM, or MOV video.";
  }
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File size must be less than ${maxSizeMB}MB`;
  }
  if (file.size <= 0) {
    return "The selected file is empty";
  }
  return null;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};