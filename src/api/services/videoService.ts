/**
 * Video service
 * Handles video upload and management operations
 */

import api from "@/api/axios";
import {API_ENDPOINTS} from "@/api/endpoints";
import {InitVideoResponse, VideoResponse} from "@/types/video";

export type InitVideoParams = {
    courseId: string;
    sectionId: string;
    chapterId: string;
    sizeBytes: number;
};

export type ConfirmVideoParams = {
    courseId: string;
    sectionId: string;
    chapterId: string;
};

export type PublishVideoParams = {
    videoId: string;
};

export const videoService = {
    /**
     * Initialize video upload
     * POST /course/:courseId/sections/:sectionId/chapters/:chapterId/video/init
     *
     * @param params Init parameters with file size
     * @returns Upload URL and video metadata
     * @throws {ApiError} If validation fails or user unauthorized
     */
    async initVideo(params: InitVideoParams): Promise<InitVideoResponse> {
        const {courseId, sectionId, chapterId, sizeBytes} = params;

        if (!courseId || !sectionId || !chapterId) {
            throw new Error("initVideo: missing path parameters.");
        }

        if (typeof sizeBytes !== "number" || sizeBytes <= 0) {
            throw new Error("initVideo: sizeBytes must be a positive number.");
        }

        const res = await api.post<InitVideoResponse>(
            API_ENDPOINTS.VIDEOS.INIT(courseId, sectionId, chapterId),
            {sizeBytes}
        );

        return res.data;
    },

    /**
     * Confirm video upload
     * POST /course/:courseId/sections/:sectionId/chapters/:chapterId/video/confirm
     *
     * Backend is source of truth for sourceUri. UI only triggers the transition.
     *
     * @param params Confirm parameters
     * @returns Video response with PROCESSING status
     * @throws {ApiError} If validation fails or user unauthorized
     */
    async confirmVideo(params: ConfirmVideoParams): Promise<VideoResponse> {
        const {courseId, sectionId, chapterId} = params;

        if (!courseId || !sectionId || !chapterId) {
            throw new Error("confirmVideo: missing path parameters.");
        }

        const res = await api.post<VideoResponse>(
            API_ENDPOINTS.VIDEOS.CONFIRM(courseId, sectionId, chapterId),
            {}
        );

        return res.data;
    },

    /**
     * Publish video
     * POST /videos/:videoId/publish
     *
     * This must transition READY -> IN_REVIEW (or equivalent moderation state).
     *
     * @param params Publish parameters
     * @returns Updated video response
     * @throws {ApiError} If validation fails or user unauthorized
     */
    async publishVideo(params: PublishVideoParams): Promise<VideoResponse> {
        const {videoId} = params;

        if (!videoId || videoId.trim().length === 0) {
            throw new Error("publishVideo: videoId is required.");
        }

        const res = await api.post<VideoResponse>(
            API_ENDPOINTS.VIDEOS.PUBLISH(videoId),
            {}
        );

        return res.data;
    },
};
