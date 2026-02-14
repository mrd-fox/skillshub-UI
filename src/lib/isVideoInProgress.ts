import {VideoStatusEnum} from "@/types/video.ts";

export const VIDEO_IN_PROGRESS_STATUSES = ["PENDING", "PROCESSING"] as const;

type InProgressStatus = (typeof VIDEO_IN_PROGRESS_STATUSES)[number];

type CourseLike = {
    sections?: Array<{
        chapters?: Array<{
            video?: {
                status?: VideoStatusEnum | string | null;
            } | null;
        }> | null;
    }> | null;
};

/**
 * Single source of truth: a video is considered "in progress" when it is:
 * - PENDING
 * - PROCESSING
 *
 * IMPORTANT:
 * - Keep this list centralized to avoid divergence across locks/polling/tooltips.
 */
export function isVideoInProgress(status: VideoStatusEnum | string | null | undefined): boolean {
    if (!status) {
        return false;
    }

    return status === (VIDEO_IN_PROGRESS_STATUSES[0] as InProgressStatus)
        || status === (VIDEO_IN_PROGRESS_STATUSES[1] as InProgressStatus);
}

/**
 * Checks whether a course has at least one video in progress (PENDING or PROCESSING).
 */
export function hasInProgressVideo(course: CourseLike | null | undefined): boolean {
    if (!course?.sections || course.sections.length === 0) {
        return false;
    }

    for (const section of course.sections) {
        const chapters = section?.chapters ?? [];
        for (const chapter of chapters) {
            const status = chapter?.video?.status ?? null;
            if (isVideoInProgress(status)) {
                return true;
            }
        }
    }

    return false;
}
