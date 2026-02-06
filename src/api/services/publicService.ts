/**
 * Public service
 * Handles public unauthenticated endpoints
 */

import api from "@/api/axios";
import {API_ENDPOINTS} from "@/api/endpoints";
import {PublicCourseDetailResponse, PublicCourseListItem} from "@/api/types/public";

export const publicService = {
    /**
     * Get public course catalog
     * GET /public/courses
     *
     * This endpoint does NOT require authentication.
     * Available to all visitors.
     *
     * @param signal Optional AbortSignal for request cancellation
     * @returns List of public courses
     */
    async getPublicCatalog(signal?: AbortSignal): Promise<PublicCourseListItem[]> {
        const res = await api.get<PublicCourseListItem[]>(API_ENDPOINTS.PUBLIC.COURSES, {
            signal,
        });

        return Array.isArray(res.data) ? res.data : [];
    },

    /**
     * Get public course detail by ID
     * GET /public/courses/:courseId
     *
     * This endpoint does NOT require authentication.
     * Shows preview of course content (sections and chapters).
     *
     * @param courseId Course ID
     * @param signal Optional AbortSignal for request cancellation
     * @returns Public course detail
     */
    async getPublicCourseDetail(
        courseId: string,
        signal?: AbortSignal
    ): Promise<PublicCourseDetailResponse> {
        const res = await api.get<PublicCourseDetailResponse>(
            API_ENDPOINTS.PUBLIC.COURSE_BY_ID(courseId),
            {signal}
        );

        return res.data;
    },
};
