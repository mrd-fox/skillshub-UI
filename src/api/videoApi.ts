import api from "@/api/axios.ts";
import {API_ENDPOINTS} from "@/api/endpoints";
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
};

type PublishVideoParams = {
    videoId: string;
};

/**
 * INIT
 * POST /course/{courseId}/sections/{sectionId}/chapters/{chapterId}/video/init
 * Body: { sizeBytes }
 * Response: InitVideoResponse
 */
export async function initVideo(params: InitVideoParams): Promise<InitVideoResponse> {
    const {courseId, sectionId, chapterId, sizeBytes} = params;

    if (!courseId || !sectionId || !chapterId) {
        throw new Error("initVideo: missing path parameters.");
    }

    if (typeof sizeBytes !== "number" || Number.isNaN(sizeBytes) || sizeBytes <= 0) {
        throw new Error("initVideo: sizeBytes must be a positive number.");
    }

    const endpoint = API_ENDPOINTS.VIDEOS.INIT(courseId, sectionId, chapterId);
    const res = await api.post<InitVideoResponse>(endpoint, {sizeBytes});

    return res.data;
}

/**
 * CONFIRM
 * POST /course/{courseId}/sections/{sectionId}/chapters/{chapterId}/video/confirm
 * Body: {}
 * Response: VideoResponse (status=PROCESSING)
 *
 * Backend is source of truth for sourceUri. UI only triggers the transition.
 */
export async function confirmVideo(params: ConfirmVideoParams): Promise<VideoResponse> {
    const {courseId, sectionId, chapterId} = params;

    if (!courseId || !sectionId || !chapterId) {
        throw new Error("confirmVideo: missing path parameters.");
    }

    const endpoint = API_ENDPOINTS.VIDEOS.CONFIRM(courseId, sectionId, chapterId);

    // Send an empty JSON body to keep a stable contract (Axios + CORS + controller signature).
    const res = await api.post<VideoResponse>(endpoint, {});

    return res.data;
}

/**
 * PUBLISH (Tutor request)
 * This must transition READY -> IN_REVIEW (or equivalent moderation state).
 */
export async function publishVideo(params: PublishVideoParams): Promise<VideoResponse> {
    const {videoId} = params;

    if (!videoId || videoId.trim().length === 0) {
        throw new Error("publishVideo: videoId is required.");
    }

    const endpoint = API_ENDPOINTS.VIDEOS.PUBLISH(videoId);
    const res = await api.post<VideoResponse>(endpoint);
    return res.data;
}