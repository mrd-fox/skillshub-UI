import {useEffect, useMemo, useRef} from "react";
import {hasInProgressVideo} from "@/lib/isVideoInProgress.ts";


type CourseLike = {
    sections?: Array<{
        chapters?: Array<{
            video?: {
                status?: string | null;
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

function clearTimer<T>(ref: { current: T | null }) {
    if (ref.current !== null) {
        globalThis.clearTimeout(ref.current as ReturnType<typeof globalThis.setTimeout>);
        ref.current = null;
    }
}

/**
 * Polls refreshCourse() while at least one video is in progress (PENDING or PROCESSING).
 *
 * Critical behavior:
 * - Do NOT restart polling on every `course` update.
 * - Only react to `shouldPoll` boolean (enter/exit in-progress).
 */
export function useCoursePolling(
    course: CourseLike | null,
    refreshCourse: () => Promise<void>,
    options?: Options
) {
    const enabled = options?.enabled ?? true;
    const intervalMs = options?.intervalMs ?? 3000;

    const timerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
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
        return hasInProgressVideo(course);
    }, [course]);

    const scheduleNext = () => {
        clearTimer(timerRef);
        timerRef.current = globalThis.setTimeout(() => {
            void tick();
        }, intervalRef.current);
    };

    const tick = async () => {
        if (!enabledRef.current) {
            clearTimer(timerRef);
            return;
        }

        const stillInProgress = hasInProgressVideo(courseRef.current);
        if (!stillInProgress) {
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

        // Start once when entering in-progress state
        void tick();

        return () => {
            clearTimer(timerRef);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, shouldPoll, intervalMs]);
}