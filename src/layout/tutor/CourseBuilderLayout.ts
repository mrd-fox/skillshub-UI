/**
 * =========================
 * Public DTOs used by UI
 * =========================
 */
import {CourseStatus} from "@/api/types/course.ts";
import {VideoResponse} from "@/types/video.ts";
import {createContext, useContext} from "react";

export type ChapterResponse = {
    id: string;
    title: string;
    position: number;

    createdAt?: string | null;
    updatedAt?: string | null;

    video?: VideoResponse | null;
};

export type SectionResponse = {
    id: string;
    title: string;
    position: number;
    chapters: ChapterResponse[];

    createdAt?: string | null;
    updatedAt?: string | null;
};

export type CourseResponse = {
    id: string;
    title: string;
    description: string;
    status: CourseStatus;
    price?: number | null;
    sections: SectionResponse[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

/**
 * =========================
 * Backend UpdateCourseRequest (PATCH-like)
 * =========================
 */

export type UpdateCourseRequest = {
    title?: string | null;
    description?: string | null;
    price?: number | null;
    sections?: UpdateSectionRequest[] | null;
};

export type UpdateSectionRequest = {
    id?: string | null;
    title?: string | null;
    position?: number | null;
    chapters?: UpdateChapterRequest[] | null;
};

export type UpdateChapterRequest = {
    id?: string | null;
    title?: string | null;
    position?: number | null;
};

/**
 * =========================
 * Context contract
 * =========================
 */

export type CourseBuilderContextValue = {
    courseId: string;

    course: CourseResponse | null;
    setCourse: (value: CourseResponse | null | ((prev: CourseResponse | null) => CourseResponse | null)) => void;

    selectedChapterId: string | null;
    setSelectedChapterId: (value: string | null | ((prev: string | null) => string | null)) => void;

    loading: boolean;
    saving: boolean;

    structureDirty: boolean;
    markStructureDirty: () => void;

    refreshCourse: () => Promise<void>;
    saveCourse: (partial: Partial<CourseResponse>) => Promise<CourseResponse | null>;
};

export const CourseBuilderContext = createContext<CourseBuilderContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useCourseBuilder(): CourseBuilderContextValue {
    const ctx = useContext(CourseBuilderContext);
    if (ctx === null) {
        throw new Error("useCourseBuilder must be used within CourseBuilderLayout");
    }
    return ctx;
}

/**
 * =========================
 * Snapshots / publish gate
 * =========================
 */

export type CourseMetaSnapshot = {
    title: string;
    description: string;
    price: number | null;
};

export type PublishGate = {
    totalChapters: number;
    readyVideos: number;
    missingVideoChapters: number;
    notReadyVideos: number;
    canPublish: boolean;
};

export function isClientKey(id: string | null | undefined): boolean {
    const value = (id ?? "").trim();
    return value.startsWith("client:");
}

export function getCourseStatusLabel(status: CourseStatus): string {
    if (status === "DRAFT") {
        return "Brouillon";
    }
    if (status === "WAITING_VALIDATION") {
        return "En attente de validation";
    }
    if (status === "VALIDATED") {
        return "Validé";
    }
    if (status === "REJECTED") {
        return "Rejeté";
    }
    if (status === "PUBLISHED") {
        return "Publié";
    }
    return status;
}

export function computePublishGate(course: CourseResponse | null): PublishGate {
    const result: PublishGate = {
        totalChapters: 0,
        readyVideos: 0,
        missingVideoChapters: 0,
        notReadyVideos: 0,
        canPublish: false,
    };

    if (!course) {
        return result;
    }

    for (const section of course.sections ?? []) {
        for (const chapter of section.chapters ?? []) {
            result.totalChapters += 1;

            const video = chapter.video ?? null;
            if (!video) {
                result.missingVideoChapters += 1;
                continue;
            }

            if (video.status === "READY") {
                result.readyVideos += 1;
            } else {
                result.notReadyVideos += 1;
            }
        }
    }

    if (course.status === "WAITING_VALIDATION") {
        return result;
    }

    if (result.totalChapters <= 0) {
        return result;
    }

    if (result.missingVideoChapters > 0) {
        return result;
    }

    if (result.notReadyVideos > 0) {
        return result;
    }

    result.canPublish = result.readyVideos === result.totalChapters;
    return result;
}

export function getPublishTooltipText(args: Readonly<{
    course: CourseResponse | null;
    isWaitingValidation: boolean;
    inProgressLock: boolean;
    gate: PublishGate;
}>): string {
    if (!args.course) {
        return "Chargement du cours...";
    }

    if (args.isWaitingValidation) {
        return "Ce cours est en attente de validation : édition et publication bloquées.";
    }

    if (args.inProgressLock) {
        return "Une vidéo est en PENDING/PROCESSING : sauvegarde et modification de structure bloquées (upload vidéo toujours possible sur chapitres déjà enregistrés).";
    }

    if (args.gate.totalChapters <= 0) {
        return "Ajoute au moins un chapitre avant de soumettre le cours.";
    }

    if (args.gate.missingVideoChapters > 0) {
        return `${args.gate.readyVideos}/${args.gate.totalChapters} vidéos prêtes — ${args.gate.missingVideoChapters} chapitre(s) sans vidéo.`;
    }

    if (args.gate.notReadyVideos > 0) {
        return `${args.gate.readyVideos}/${args.gate.totalChapters} vidéos prêtes — ${args.gate.notReadyVideos} vidéo(s) en cours / en échec.`;
    }

    return "Soumettre le cours à la procédure de validation interne.";
}

export function getErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message.trim().length > 0) {
        return err.message;
    }
    return "Erreur inconnue.";
}

/**
 * Build backend PATCH-like payload from a partial CourseResponse.
 * Rules:
 * - Meta fields are included only if present in `partial`.
 * - Sections are included only if present in `partial`.
 * - client:* ids are omitted so backend treats them as creations.
 */
export function mapPartialToUpdateRequest(partial: Partial<CourseResponse>): UpdateCourseRequest {
    const req: UpdateCourseRequest = {};

    if (partial.title !== undefined) {
        req.title = partial.title ?? null;
    }

    if (partial.description !== undefined) {
        req.description = partial.description ?? null;
    }

    if (partial.price !== undefined) {
        req.price = partial.price === null || partial.price === undefined ? null : Number(partial.price);
    }

    if (partial.sections !== undefined) {
        if (partial.sections === null) {
            req.sections = null;
        } else {
            req.sections = (partial.sections ?? []).map((s) => {
                const section: UpdateSectionRequest = {
                    title: s.title ?? null,
                    position: (s as SectionResponse).position ?? null,
                    chapters: ((s as SectionResponse).chapters ?? []).map((c) => {
                        const chapter: UpdateChapterRequest = {
                            title: c.title ?? null,
                            position: c.position ?? null,
                        };

                        if (c.id && c.id.trim().length > 0 && !isClientKey(c.id)) {
                            chapter.id = c.id;
                        }

                        return chapter;
                    }),
                };

                if (s.id && s.id.trim().length > 0 && !isClientKey(s.id)) {
                    section.id = s.id;
                }

                return section;
            });
        }
    }

    return req;
}