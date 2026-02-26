/**
 * Authentication service
 * Handles session management and authentication redirects
 */

import api from "@/api/axios";
import {API_ENDPOINTS} from "@/api/endpoints";
import {AuthUser} from "@/api/types/auth";

export const authService = {
    /**
     * Check current user session
     * GET /auth/me
     *
     * @throws {ApiError} If session is invalid or expired
     */
    async checkSession(): Promise<AuthUser> {
        const res = await api.get<AuthUser>(API_ENDPOINTS.AUTH.ME);
        return res.data;
    },

    /**
     * Redirect to login page (Keycloak)
     * This will reload the page after redirect
     */
    redirectToLogin(): void {
        const baseURL = import.meta.env.VITE_API_URL;
        const normalizedBase = baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
        const loginUrl = new URL(API_ENDPOINTS.AUTH.LOGIN.replace(/^\//, ""), normalizedBase).toString();
        globalThis.location.assign(loginUrl);
    },

    /**
     * Redirect to logout page
     * This will reload the page after redirect
     */
    redirectToLogout(): void {
        const baseURL = import.meta.env.VITE_API_URL;
        const normalizedBase = baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
        const logoutUrl = new URL(API_ENDPOINTS.AUTH.LOGOUT.replace(/^\//, ""), normalizedBase).toString();
        globalThis.location.assign(logoutUrl);
    },
};
