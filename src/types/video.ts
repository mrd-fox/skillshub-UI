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
 * - Course GET returns chapters[].video as VideoResponse (or null)
 */
export type VideoResponse = {
    id: string;

    /**
     * Canonical provider reference.
     * Must stay stable and provider-agnostic enough for future extensions.
     * Example: "vimeo://1159773016"
     */
    sourceUri: string;

    /**
     * Vimeo embed hash used when video is unlisted/restricted and embed is domain-limited.
     * Required as iframe query param: "?h=..."
     * Example: "0c7b965c73"
     *
     * Source of truth: backend.
     * UI env map (VITE_VIMEO_EMBED_HASH_MAP) must only be a fallback for legacy/MVP.
     */
    embedHash?: string | null;

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

    /**
     * Canonical provider reference.
     * Example: "vimeo://1159773016"
     */
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

export type VimeoPlayerParams = Record<string, string | number | boolean | null | undefined>;

export type VimeoPlayerUrlOptions = {
    /**
     * Vimeo private hash used when video is unlisted/restricted and embed is domain-limited.
     * Example: "706b7740ab" (used as "?h=706b7740ab")
     *
     * Source of truth is backend VideoResponse.embedHash.
     * UI env map must only be a fallback when backend data is missing.
     */
    privateHash?: string | null;

    /**
     * Optional extra player query params.
     * Common flags:
     * - title=0
     * - byline=0
     * - portrait=0
     * - badge=0
     * - autopause=0
     */
    params?: VimeoPlayerParams;
};

/**
 * Builds a Vimeo player iframe URL.
 * IMPORTANT: do NOT use "https://vimeo.com/{id}" for embeds.
 */
export function buildVimeoPlayerUrl(vimeoId: string, options?: VimeoPlayerUrlOptions): string {
    const base = `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`;

    const qs = new URLSearchParams();

    if (options?.privateHash) {
        qs.set("h", String(options.privateHash));
    }

    if (options?.params) {
        for (const [key, rawValue] of Object.entries(options.params)) {
            if (rawValue === null || rawValue === undefined) {
                continue;
            }
            qs.set(key, String(rawValue));
        }
    }

    const queryString = qs.toString();
    if (!queryString) {
        return base;
    }

    return `${base}?${queryString}`;
}

/**
 * Convenience helper: builds Vimeo player iframe URL from "vimeo://{id}".
 */
export function buildVimeoPlayerUrlFromSourceUri(
    sourceUri: string | null | undefined,
    options?: VimeoPlayerUrlOptions
): string | null {
    const vimeoId = extractVimeoId(sourceUri);
    if (!vimeoId) {
        return null;
    }

    return buildVimeoPlayerUrl(vimeoId, options);
}

/**
 * Optional helper: extracts Vimeo private hash "h" from a player URL if you have it.
 * Example input:
 * "https://player.vimeo.com/video/1159773016?h=706b7740ab&badge=0"
 */
export function extractVimeoPrivateHashFromPlayerUrl(playerUrl: string | null | undefined): string | null {
    if (!playerUrl) {
        return null;
    }

    const trimmed = playerUrl.trim();
    if (!trimmed) {
        return null;
    }

    try {
        const url = new URL(trimmed);
        const host = url.host.toLowerCase();
        if (!host.includes("player.vimeo.com")) {
            return null;
        }

        const h = url.searchParams.get("h");
        if (!h) {
            return null;
        }

        return h.trim() || null;
    } catch {
        return null;
    }
}

/**
 * Recommended default parameters for MVP embed.
 * You can override these in buildVimeoPlayerUrl(...).
 */
export const DEFAULT_VIMEO_PLAYER_PARAMS: VimeoPlayerParams = {
    badge: 0,
    autopause: 0,
    title: 0,
    byline: 0,
    portrait: 0,
};