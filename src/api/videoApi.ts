import api from "@/api/axios.ts";
import {InitVideoResponse, VideoResponse} from "@/types/video.ts";



type InitVideoParams = {
    courseId: string;
    sectionId: string;
    chapterId: string;
    sizeBytes: number;
};

type ConfirmVideoParams = {
    courseId: string;
    sectionId: string;
    chapterId: string;
    sourceUri: string;
};

type PublishVideoParams = {
    videoId: string;
};

function buildVideoBasePath(courseId: string, sectionId: string, chapterId: string): string {
    return `/course/${courseId}/sections/${sectionId}/chapters/${chapterId}/video`;
}

/**
 * INIT
 * POST /api/course/{courseId}/sections/{sectionId}/chapters/{chapterId}/video/init
 * Body: { sizeBytes }
 * Response: InitVideoResponse (video + uploadUrl + uploadExpiresAt)
 *
 * IMPORTANT:
 * Your backend controller marks requestBody as required=false but then calls request.mapToCommand(...)
 * which will throw if request is null. So we ALWAYS send the body.
 */
export async function initVideo(params: InitVideoParams): Promise<InitVideoResponse> {
    const { courseId, sectionId, chapterId, sizeBytes } = params;

    if (!courseId || !sectionId || !chapterId) {
        throw new Error("initVideo: missing path parameters.");
    }

    if (typeof sizeBytes !== "number" || Number.isNaN(sizeBytes) || sizeBytes <= 0) {
        throw new Error("initVideo: sizeBytes must be a positive number.");
    }

    const basePath = buildVideoBasePath(courseId, sectionId, chapterId);
    const res = await api.post<InitVideoResponse>(`${basePath}/init`, { sizeBytes });

    return res.data;
}

/**
 * CONFIRM
 * POST /api/course/{courseId}/sections/{sectionId}/chapters/{chapterId}/video/confirm
 * Body: { sourceUri }
 * Response: VideoResponse (status=PROCESSING + metadata if any)
 */
export async function confirmVideo(params: ConfirmVideoParams): Promise<VideoResponse> {
    const { courseId, sectionId, chapterId, sourceUri } = params;

    if (!courseId || !sectionId || !chapterId) {
        throw new Error("confirmVideo: missing path parameters.");
    }

    if (!sourceUri || sourceUri.trim().length === 0) {
        throw new Error("confirmVideo: sourceUri is required.");
    }

    const basePath = buildVideoBasePath(courseId, sectionId, chapterId);
    const res = await api.post<VideoResponse>(`${basePath}/confirm`, { sourceUri });

    return res.data;
}

/**
 * PUBLISH (Tutor request)
 * This must transition READY -> IN_REVIEW.
 *
 * IMPORTANT:
 * Backend endpoint name/path can vary depending on your implementation.
 * For now we implement the most stable contract: POST /api/videos/{videoId}/publish
 * because moderation is video-centric, not chapter-centric.
 *
 * If your backend uses a different path (e.g. /course/.../video/publish),
 * you will adjust ONLY this function.
 */
export async function publishVideo(params: PublishVideoParams): Promise<VideoResponse> {
    const { videoId } = params;

    if (!videoId || videoId.trim().length === 0) {
        throw new Error("publishVideo: videoId is required.");
    }

    const res = await api.post<VideoResponse>(`/videos/${videoId}/publish`);
    return res.data;
}