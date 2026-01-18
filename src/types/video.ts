// src/types/video.ts

export type VideoStatusEnum =
    | "PENDING"
    | "UPLOADED"
    | "PROCESSING"
    | "IN_REVIEW"
    | "READY"
    | "PUBLISHED"
    | "REJECTED"
    | "FAILED"
    | "EXPIRED";

/**
 * Backend contract (course-service):
 * - Confirm returns VideoResponse
 */
export type VideoResponse = {
    id: string;
    sourceUri: string;
    duration?: number | null;
    format?: string | null;
    size?: number | null;
    width?: number | null;
    height?: number | null;
    thumbnailUrl?: string | null;
    errorMessage?: string | null;
    status: VideoStatusEnum;

    // Reserved moderation fields (optional).
    reviewMessage?: string | null;
    publishRequestedAt?: string | null;
    reviewedAt?: string | null;
};

/**
 * Backend contract (InitVideoResponse):
 * Response includes persisted video info + upload orchestration.
 */
export type InitVideoResponse = {
    // Video (persisted state)
    videoId: string;
    sourceUri: string;
    thumbnailUrl?: string | null;
    errorMessage?: string | null;
    status: VideoStatusEnum;

    // Upload orchestration (not persisted)
    uploadProvider: string;
    uploadUrl: string;
    uploadExpiresAt?: string | null;
};

/**
 * Extracts Vimeo numeric id from canonical sourceUri: "vimeo://{id}".
 * Returns null if the uri is not in expected format.
 */
export function extractVimeoId(sourceUri: string | null | undefined): string | null {
    if (!sourceUri) {
        return null;
    }

    const trimmed = sourceUri.trim();
    if (!trimmed.startsWith("vimeo://")) {
        return null;
    }

    const id = trimmed.slice("vimeo://".length).trim();
    if (!id) {
        return null;
    }

    return id;
}