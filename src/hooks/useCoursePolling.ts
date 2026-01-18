import {VideoStatusEnum} from "@/types/video.ts";
import {useEffect, useRef} from "react";

type CourseLike = {
    sections?: Array<{
        chapters?: Array<{
            video?: {
                status?: VideoStatusEnum | string | null;
            } | null;
        }>;
    }>;
};

type Options = {
    /**
     * Poll interval in milliseconds.
     * Default: 3000ms.
     */
    intervalMs?: number;

    /**
     * Enable/disable polling.
     * Default: true.
     */
    enabled?: boolean;
};

function hasProcessingVideo(course: CourseLike | null | undefined): boolean {
    if (!course?.sections || course.sections.length === 0) {
        return false;
    }

    for (const section of course.sections) {
        const chapters = section.chapters ?? [];
        for (const chapter of chapters) {
            const status = chapter.video?.status ?? null;
            if (status === "PROCESSING") {
                return true;
            }
        }
    }

    return false;
}

/**
 * Polls refreshCourse() while at least one video is in PROCESSING state.
 * Source of truth remains GET /course/{courseId}.
 */
export function useCoursePolling(
    course: CourseLike | null,
    refreshCourse: () => Promise<void>,
    options?: Options
) {
    const enabled = options?.enabled ?? true;
    const intervalMs = options?.intervalMs ?? 3000;

    const intervalRef = useRef<number | null>(null);
    const inFlightRef = useRef<boolean>(false);

    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const shouldPoll = hasProcessingVideo(course);

        if (!shouldPoll) {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        if (intervalRef.current !== null) {
            // already polling
            return;
        }

        intervalRef.current = window.setInterval(async () => {
            if (inFlightRef.current) {
                return;
            }

            inFlightRef.current = true;
            try {
                await refreshCourse();
            } finally {
                inFlightRef.current = false;
            }
        }, intervalMs);

        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, intervalMs, course, refreshCourse]);
}