/**
 * Course types (authenticated endpoints)
 */

import {VideoResponse} from "@/types/video";

export type CourseStatus =
    | "DRAFT"
    | "REVISION"
    | "WAITING_VALIDATION"
    | "VALIDATED"
    | "PUBLISHED"
    | "REJECTED"
    | "ARCHIVED"
    | "PENDING"
    | "PROCESSING"
    | "READY"
    | "FAILED";

export type Chapter = {
    id: string;
    title: string;
    position: number;
    video?: VideoResponse | null;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type Section = {
    id: string;
    title: string;
    position: number;
    chapters: Chapter[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type Course = {
    id: string;
    title: string;
    description: string;
    status: CourseStatus;
    price?: number | null;
    sections: Section[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type CourseListItem = {
    id: string;
    title?: string;
    status: CourseStatus;
    updatedAt?: string;
    price?: number | null;
};

// Create course payload
export type CreateCoursePayload = {
    title: string;
    description: string;
    price?: number;
    sections?: Array<{
        title: string;
        position?: number;
        chapters: Array<{
            title: string;
            position?: number;
        }>;
    }>;
};

// Update course payload (partial)
export type UpdateChapterRequest = {
    id?: string | null;
    title?: string | null;
    position?: number | null;
};

export type UpdateSectionRequest = {
    id?: string | null;
    title?: string | null;
    position?: number | null;
    chapters?: UpdateChapterRequest[] | null;
};

export type UpdateCoursePayload = {
    title?: string | null;
    description?: string | null;
    price?: number | null;
    sections?: UpdateSectionRequest[] | null;
};
