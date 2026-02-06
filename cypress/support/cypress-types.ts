/// <reference types="cypress" />

/**
 * English comment: Shared types for Cypress E2E tests
 * This file centralizes type definitions to respect the DRY principle
 */

export type AuthMeResponse = {
    id: string;
    email: string;
    roles: string[];
};

export type InternalUserEnvelope = {
    created: boolean;
    user: {
        id: string;
        externalId: string;
        email: string;
        firstName: string;
        lastName: string;
        active: boolean;
        roles: { name: string }[];
    };
};

export type VideoResponse = {
    id: string;
    status: "PENDING" | "PROCESSING" | "READY" | "FAILED" | "EXPIRED";
};

export type ChapterResponse = {
    id: string;
    title: string;
    position: number;
    video?: VideoResponse | null;
};

export type SectionResponse = {
    id: string;
    title: string;
    position: number;
    chapters: ChapterResponse[];
};

export type CourseResponse = {
    id: string;
    title: string;
    description: string;
    status: "DRAFT" | "WAITING_VALIDATION" | "REJECTED" | "PUBLISHED" | "VALIDATED";
    price?: number | null;
    sections: SectionResponse[];
};
