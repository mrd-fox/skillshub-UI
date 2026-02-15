/**
 * Centralized API endpoints for the entire application.
 * All endpoints are defined here to avoid hardcoded strings across components.
 *
 * IMPORTANT:
 * - baseURL already includes "/api" (VITE_API_URL)
 * - Endpoints here MUST NOT start with "/api"
 * - Use template functions for dynamic routes
 *
 * @example
 * // Instead of hardcoding:
 * api.get("/course/123")
 *
 * // Use:
 * import { API_ENDPOINTS } from "@/api/endpoints";
 * api.get(API_ENDPOINTS.COURSES.BY_ID("123"))
 */

export const API_ENDPOINTS = {
    // ============================================
    // Authentication & Session
    // ============================================
    AUTH: {
        /**
         * Check current user session
         * GET /auth/me
         */
        ME: "/auth/me",

        /**
         * Login redirect endpoint (Keycloak)
         * GET /auth/login
         */
        LOGIN: "/auth/login",

        /**
         * Logout redirect endpoint
         * GET /auth/logout
         */
        LOGOUT: "/auth/logout",
    },

    // ============================================
    // Users & Profiles
    // ============================================
    USERS: {
        /**
         * Get current user internal profile
         * GET /users/me
         */
        ME: "/users/me",

        /**
         * Promote current user to TUTOR role
         * POST /users/promote-to-tutor
         */
        PROMOTE_TO_TUTOR: "/users/promote-to-tutor",

        /**
         * Enroll current user in a course (idempotent)
         * PUT /users/me/enrollments/:courseId
         */
        ENROLL: (courseId: string) => `/users/me/enrollments/${courseId}`,
    },

    // ============================================
    // Courses (Tutor/Admin)
    // ============================================
    COURSES: {
        /**
         * List all courses for current tutor
         * GET /course
         */
        LIST: "/course",

        /**
         * Create a new course
         * POST /course
         */
        CREATE: "/course",

        /**
         * Get course by ID
         * GET /course/:courseId
         */
        BY_ID: (courseId: string) => `/course/${courseId}`,

        /**
         * Update course by ID
         * PUT /course/:courseId
         */
        UPDATE: (courseId: string) => `/course/${courseId}`,

        /**
         * Delete course by ID
         * DELETE /course/:courseId
         */
        DELETE: (courseId: string) => `/course/${courseId}`,

        /**
         * Publish course for validation
         * POST /course/:courseId/publish
         */
        PUBLISH: (courseId: string) => `/course/${courseId}/publish`,
    },

    // ============================================
    // Sections
    // ============================================
    SECTIONS: {
        /**
         * Get all sections for a course
         * GET /course/:courseId/sections
         */
        BY_COURSE: (courseId: string) => `/course/${courseId}/sections`,

        /**
         * Get section by ID
         * GET /course/:courseId/sections/:sectionId
         */
        BY_ID: (courseId: string, sectionId: string) =>
            `/course/${courseId}/sections/${sectionId}`,
    },

    // ============================================
    // Chapters
    // ============================================
    CHAPTERS: {
        /**
         * Get all chapters for a section
         * GET /course/:courseId/sections/:sectionId/chapters
         */
        BY_SECTION: (courseId: string, sectionId: string) =>
            `/course/${courseId}/sections/${sectionId}/chapters`,

        /**
         * Get chapter by ID
         * GET /course/:courseId/sections/:sectionId/chapters/:chapterId
         */
        BY_ID: (courseId: string, sectionId: string, chapterId: string) =>
            `/course/${courseId}/sections/${sectionId}/chapters/${chapterId}`,
    },

    // ============================================
    // Videos
    // ============================================
    VIDEOS: {
        /**
         * Initialize video upload
         * POST /course/:courseId/sections/:sectionId/chapters/:chapterId/video/init
         */
        INIT: (courseId: string, sectionId: string, chapterId: string) =>
            `/course/${courseId}/sections/${sectionId}/chapters/${chapterId}/video/init`,

        /**
         * Confirm video upload
         * POST /course/:courseId/sections/:sectionId/chapters/:chapterId/video/confirm
         */
        CONFIRM: (courseId: string, sectionId: string, chapterId: string) =>
            `/course/${courseId}/sections/${sectionId}/chapters/${chapterId}/video/confirm`,

        /**
         * Publish video
         * POST /videos/:videoId/publish
         */
        PUBLISH: (videoId: string) => `/videos/${videoId}/publish`,

        /**
         * Get video status
         * GET /course/:courseId/sections/:sectionId/chapters/:chapterId/video
         */
        STATUS: (courseId: string, sectionId: string, chapterId: string) =>
            `/course/${courseId}/sections/${sectionId}/chapters/${chapterId}/video`,
    },

    // ============================================
    // Public endpoints (unauthenticated)
    // ============================================
    PUBLIC: {
        /**
         * Get public course catalog
         * GET /public/courses
         */
        COURSES: "/public/courses",

        /**
         * Get public course detail by ID
         * GET /public/courses/:courseId
         */
        COURSE_BY_ID: (courseId: string) => `/public/courses/${courseId}`,
    },
} as const;

/**
 * Helper to check if a URL is a public endpoint
 * Used by axios interceptor to prevent auth redirects on public pages
 */
export function isPublicEndpoint(url: string): boolean {
    return url.includes("/public");
}

/**
 * Helper to check if a URL is an auth endpoint
 * Used by axios interceptor to prevent redirect loops
 */
export function isAuthEndpoint(url: string): boolean {
    return url.includes("/auth/login") || url.includes("/auth/logout");
}
