/**
 * Student-specific types
 * These types are used for student course access endpoints
 */

import {VideoResponse} from "@/types/video";
import {CourseStatus} from "@/api/types/course";

/**
 * Course summary response (POST /courses/search)
 * Lightweight DTO used for student dashboard grid
 * Does NOT include sections/chapters/videos
 */
export type CourseSummaryResponse = {
    id: string;
    title: string;
    description: string;
    status: "PUBLISHED";
    createdAt: string;
    updatedAt: string;
};

/**
 * Student chapter response (full course access)
 * Returned by GET /student/courses/:courseId
 */
export type StudentChapterResponse = {
    id: string;
    title: string;
    position: number;
    video?: VideoResponse | null;
    createdAt?: string | null;
    updatedAt?: string | null;
};

/**
 * Student section response (full course access)
 * Returned by GET /student/courses/:courseId
 */
export type StudentSectionResponse = {
    id: string;
    title: string;
    position: number;
    chapters: StudentChapterResponse[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

/**
 * Student course response (full course with content)
 * Returned by GET /student/courses/:courseId
 * Includes sections, chapters, and video playback data
 */
export type StudentCourseResponse = {
    id: string;
    title: string;
    description: string;
    status: CourseStatus;
    price?: number | null;
    sections: StudentSectionResponse[];
    createdAt?: string | null;
    updatedAt?: string | null;
};
