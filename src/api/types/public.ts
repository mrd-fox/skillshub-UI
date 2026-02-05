/**
 * Public course types (unauthenticated endpoints)
 */

export type PublicCourseListItem = {
    id: string;
    title: string;
    author?: string | null;
    price?: number | null; // cents
};

export type PublicChapterResponse = {
    title: string;
    position: number;
};

export type PublicSectionResponse = {
    title: string;
    position: number;
    chapters?: PublicChapterResponse[] | null;
};

export type PublicCourseDetailResponse = {
    id: string;
    title: string;
    description?: string | null;
    price?: number | null;
    sections?: PublicSectionResponse[] | null;
    createdAt?: string | null;
};
