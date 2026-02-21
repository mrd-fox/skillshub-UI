/**
 * User service
 * Handles user profile and role management
 */

import api from "@/api/axios";
import {API_ENDPOINTS} from "@/api/endpoints";
import {InternalUser, InternalUserEnvelope, InternalUserResponse} from "@/api/types/user";

export const userService = {
    /**
     * Get current user internal profile
     * GET /users/me
     *
     * @returns Normalized internal user with roles as string[]
     * @throws {ApiError} If user not found or unauthorized
     */
    async getMyProfile(): Promise<InternalUser> {
        const res = await api.get<InternalUserEnvelope>(API_ENDPOINTS.USERS.ME);
        const envelope = res.data;
        const user = envelope.user;

        return {
            id: user.id,
            keycloakId: user.externalId,
            email: user.email,
            roles: (user.roles ?? []).map((r) => r.name),
            enrolledCourseIds: user.enrolledCourseIds ?? [],
            firstName: user.firstName,
            lastName: user.lastName,
            active: user.active,
        };
    },

    /**
     * Promote current user to TUTOR role
     * POST /users/promote-to-tutor
     *
     * Gateway returns 200 OK with InternalUserResponse directly (not wrapped in envelope).
     *
     * @returns Updated user with TUTOR role
     * @throws {ApiError} If promotion fails
     */
    async promoteToTutor(): Promise<InternalUser> {
        const res = await api.post<InternalUserResponse>(
            API_ENDPOINTS.USERS.PROMOTE_TO_TUTOR,
            null
        );

        // Gateway returns InternalUserResponse directly (no envelope)
        const user = res.data;

        return {
            id: user.id,
            keycloakId: user.externalId,
            email: user.email,
            roles: (user.roles ?? []).map((r) => r.name),
            enrolledCourseIds: user.enrolledCourseIds ?? [],
            firstName: user.firstName,
            lastName: user.lastName,
            active: user.active,
        };
    },

    /**
     * Enroll current user in a course (idempotent)
     * PUT /users/me/enrollments/:courseId
     *
     * @param courseId - The course ID to enroll in
     * @throws {ApiError} If enrollment fails
     */
    async enrollInCourse(courseId: string): Promise<void> {
        await api.put(API_ENDPOINTS.USERS.ENROLL(courseId));
    },
};
