/**
 * User service
 * Handles user profile and role management
 */

import api from "@/api/axios";
import {API_ENDPOINTS} from "@/api/endpoints";
import {InternalUser, InternalUserEnvelope} from "@/api/types/user";

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
            firstName: user.firstName,
            lastName: user.lastName,
            active: user.active,
        };
    },

    /**
     * Promote current user to TUTOR role
     * POST /users/promote-to-tutor
     *
     * @returns Updated user with TUTOR role
     * @throws {ApiError} If promotion fails
     */
    async promoteToTutor(): Promise<InternalUser> {
        const res = await api.post<InternalUserEnvelope>(
            API_ENDPOINTS.USERS.PROMOTE_TO_TUTOR,
            null
        );

        const envelope = res.data;
        const user = envelope.user ?? envelope;

        // Normalize roles (can be string[] or RoleResponse[])
        const rawRoles = user.roles ?? [];
        const roles = rawRoles.map((r: any) =>
            typeof r === "string" ? r : r.name
        );

        return {
            id: user.id,
            keycloakId: user.externalId,
            email: user.email,
            roles,
            firstName: user.firstName,
            lastName: user.lastName,
            active: user.active,
        };
    },
};
