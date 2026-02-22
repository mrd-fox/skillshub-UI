/**
 * Course service
 * Handles course CRUD operations (authenticated)
 */

import api from "@/api/axios";
import {API_ENDPOINTS} from "@/api/endpoints";
import {Course, CourseListItem, CreateCoursePayload, UpdateCoursePayload} from "@/api/types/course";
import {CourseSummaryResponse, StudentCourseResponse} from "@/api/types/student";
import {PublicCourseListItem} from "@/api/types/public";

/**
 * Maps CourseSummaryResponse to PublicCourseListItem for catalog grid compatibility
 */
function mapSummaryToListItem(summary: CourseSummaryResponse): PublicCourseListItem {
    return {
        id: summary.id,
        title: summary.title,
        author: summary.author ?? null,
        price: summary.price ?? null,
    };
}

export const courseService = {
    /**
     * Get all courses for current tutor
     * GET /course
     *
     * @returns List of courses owned by current tutor
     * @throws {ApiError} If user is not authenticated or not a tutor
     */
    async getMyCourses(): Promise<CourseListItem[]> {
        const res = await api.get<CourseListItem[]>(API_ENDPOINTS.COURSES.LIST);
        return Array.isArray(res.data) ? res.data : [];
    },

    /**
     * Get a specific course by ID
     * GET /course/:courseId
     *
     * @param courseId Course ID
     * @returns Full course with sections and chapters
     * @throws {ApiError} If course not found or user unauthorized
     */
    async getCourseById(courseId: string): Promise<Course> {
        const res = await api.get<Course>(API_ENDPOINTS.COURSES.BY_ID(courseId));
        return res.data;
    },

    /**
     * Create a new course
     * POST /course
     *
     * @param payload Course creation data
     * @returns Created course
     * @throws {ApiError} If validation fails or user unauthorized
     */
    async createCourse(payload: CreateCoursePayload): Promise<Course> {
        const res = await api.post<Course>(API_ENDPOINTS.COURSES.CREATE, payload);
        return res.data;
    },

    /**
     * Update an existing course
     * PUT /course/:courseId
     *
     * @param courseId Course ID
     * @param payload Partial course update data
     * @returns Updated course
     * @throws {ApiError} If course not found, validation fails, or user unauthorized
     */
    async updateCourse(courseId: string, payload: UpdateCoursePayload): Promise<Course> {
        const res = await api.put<Course>(
            API_ENDPOINTS.COURSES.UPDATE(courseId),
            payload
        );
        return res.data;
    },

    /**
     * Delete a course
     * DELETE /course/:courseId
     *
     * @param courseId Course ID
     * @throws {ApiError} If course not found or user unauthorized
     */
    async deleteCourse(courseId: string): Promise<void> {
        await api.delete(API_ENDPOINTS.COURSES.DELETE(courseId));
    },

    /**
     * Publish a course for validation
     * POST /course/:courseId/publish
     *
     * @param courseId Course ID
     * @returns Updated course with new status
     * @throws {ApiError} If course not found, validation fails, or user unauthorized
     */
    async publishCourse(courseId: string): Promise<Course> {
        const res = await api.post<Course>(
            API_ENDPOINTS.COURSES.PUBLISH(courseId),
            {}
        );
        return res.data;
    },

    /**
     * Search courses by IDs (for student enrolled courses)
     * POST /courses/search
     *
     * Backend returns CourseSummaryResponse[] (lightweight DTO without sections/chapters).
     * This endpoint is used for student dashboard grid only.
     * Maps results to PublicCourseListItem for catalog grid compatibility.
     *
     * @param ids Array of course IDs to search for
     * @returns List of course summaries matching the provided IDs
     * @throws {ApiError} If request fails or user unauthorized
     */
    async searchCoursesByIds(ids: string[]): Promise<PublicCourseListItem[]> {
        if (ids.length === 0) {
            return [];
        }

        const res = await api.post<CourseSummaryResponse[]>(
            API_ENDPOINTS.COURSE_SEARCH.BY_IDS,
            {ids}
        );

        const data = Array.isArray(res.data) ? res.data : [];
        return data.map(mapSummaryToListItem);
    },

    /**
     * Get enrolled course content (student)
     * GET /student/courses/:courseId
     *
     * Backend enforces:
     * - User must be enrolled in the course
     * - Course must be PUBLISHED
     * - Returns full course structure with sections, chapters, and videos
     *
     * @param courseId Course ID
     * @returns Full course with sections, chapters, and video metadata
     * @throws {ApiError} If not enrolled, course not found, or not published
     */
    async getStudentCourseById(courseId: string): Promise<StudentCourseResponse> {
        const res = await api.get<StudentCourseResponse>(API_ENDPOINTS.STUDENT.COURSE_BY_ID(courseId));
        return res.data;
    },
};