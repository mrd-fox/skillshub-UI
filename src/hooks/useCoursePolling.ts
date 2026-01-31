import {VideoStatusEnum} from "@/types/video.ts";
import {useEffect, useMemo, useRef} from "react";

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

function clearTimer(timerRef: React.MutableRefObject<number | null>) {
    if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
    }
}

/**
 * Polls refreshCourse() while at least one video is in PROCESSING state.
 *
 * Fix (critical):
 * - Do NOT restart polling on every `course` update.
 * - Only react to `shouldPoll` boolean (enter/exit PROCESSING).
 */
export function useCoursePolling(
    course: CourseLike | null,
    refreshCourse: () => Promise<void>,
    options?: Options
) {
    const enabled = options?.enabled ?? true;
    const intervalMs = options?.intervalMs ?? 3000;

    const timerRef = useRef<number | null>(null);
    const inFlightRef = useRef<boolean>(false);

    const courseRef = useRef<CourseLike | null>(course);
    const refreshRef = useRef<() => Promise<void>>(refreshCourse);
    const enabledRef = useRef<boolean>(enabled);
    const intervalRef = useRef<number>(intervalMs);

    useEffect(() => {
        courseRef.current = course;
    }, [course]);

    useEffect(() => {
        refreshRef.current = refreshCourse;
    }, [refreshCourse]);

    useEffect(() => {
        enabledRef.current = enabled;
        if (!enabled) {
            clearTimer(timerRef);
        }
    }, [enabled]);

    useEffect(() => {
        intervalRef.current = intervalMs;
    }, [intervalMs]);

    const shouldPoll = useMemo(() => {
        return hasProcessingVideo(course);
    }, [course]);

    const scheduleNext = () => {
        clearTimer(timerRef);
        timerRef.current = window.setTimeout(() => {
            void tick();
        }, intervalRef.current);
    };

    const tick = async () => {
        if (!enabledRef.current) {
            clearTimer(timerRef);
            return;
        }

        const stillProcessing = hasProcessingVideo(courseRef.current);
        if (!stillProcessing) {
            clearTimer(timerRef);
            return;
        }

        if (inFlightRef.current) {
            scheduleNext();
            return;
        }

        inFlightRef.current = true;
        try {
            await refreshRef.current();
        } finally {
            inFlightRef.current = false;
        }

        scheduleNext();
    };

    useEffect(() => {
        if (!enabled) {
            clearTimer(timerRef);
            return;
        }

        if (!shouldPoll) {
            clearTimer(timerRef);
            return;
        }

        // Already started -> do not restart on rerenders
        if (timerRef.current !== null) {
            return;
        }

        // Start once when entering PROCESSING
        void tick();

        return () => {
            clearTimer(timerRef);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, shouldPoll, intervalMs]);
}
