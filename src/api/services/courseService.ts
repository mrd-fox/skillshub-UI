/**
 * Course service
 * Handles course CRUD operations (authenticated)
 */

import api from "@/api/axios";
import {API_ENDPOINTS} from "@/api/endpoints";
import {Course, CourseListItem, CreateCoursePayload, UpdateCoursePayload} from "@/api/types/course";

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
};
