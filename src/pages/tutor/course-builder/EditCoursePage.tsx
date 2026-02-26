import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Textarea} from "@/components/ui/textarea.tsx";
import {useCourseBuilder} from "@/layout/tutor";
import {useAuth} from "@/context/AuthContext.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {courseService} from "@/api/services";
import {toast} from "sonner";
import {useNavigate} from "react-router-dom";
import {centsToEurosString, formatPriceFromCents, parsePriceEurosToCents} from "@/lib/price";

type VideoStatus = string | null | undefined;

function formatDate(value?: string | null): string {
    if (!value) {
        return "—";
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
        return "—";
    }

    return d.toLocaleString();
}

function isVideoInProgress(status: unknown): boolean {
    if (typeof status !== "string") {
        return false;
    }

    return status === "PENDING" || status === "PROCESSING";
}

/**
 * Check if course has any video in transitional state (PENDING or PROCESSING).
 * Course information editing must be locked when at least one video requires backend processing.
 *
 * @param course Course to check
 * @returns true if at least one video is PENDING or PROCESSING
 */
function hasProcessingVideo(course: unknown): boolean {
    if (!course || typeof course !== "object") {
        return false;
    }

    const courseObj = course as {
        sections?: Array<{
            chapters?: Array<{
                video?: { status?: VideoStatus } | null;
            }>;
        }>;
    };

    const sections = courseObj.sections ?? [];
    for (const section of sections) {
        const chapters = section.chapters ?? [];
        for (const chapter of chapters) {
            const status: VideoStatus = chapter?.video?.status ?? null;
            if (isVideoInProgress(status)) {
                return true;
            }
        }
    }

    return false;
}

function getDeleteDisabledReason(args: Readonly<{
    courseStatus: string;
    isWaitingValidation: boolean;
    isPublished: boolean;
    processingLock: boolean;
}>, t: (key: string) => string): string {
    if (args.isWaitingValidation) {
        return t("tutor.delete_disabled_waiting_validation");
    }

    if (args.isPublished) {
        return t("tutor.delete_disabled_published");
    }

    if (args.processingLock) {
        return t("tutor.delete_disabled_processing");
    }

    if (args.courseStatus !== "DRAFT") {
        return t("tutor.delete_disabled_not_draft");
    }

    return t("tutor.delete_disabled_generic");
}

export default function EditCoursePage() {
    const {t} = useTranslation();
    const {course, setCourse, loading} = useCourseBuilder();
    const {internalUser} = useAuth();
    const navigate = useNavigate();

    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const authorLabel = useMemo(() => {
        if (!internalUser) {
            return "—";
        }

        const first = internalUser.firstName?.trim() ?? "";
        const last = internalUser.lastName?.trim() ?? "";
        const fullName = `${first} ${last}`.trim();

        if (fullName.length > 0) {
            return `${fullName} (${internalUser.email})`;
        }

        return internalUser.email;
    }, [internalUser]);

    const isWaitingValidation = useMemo(() => {
        return course?.status === "WAITING_VALIDATION";
    }, [course?.status]);

    const isPublished = useMemo(() => {
        return course?.status === "PUBLISHED";
    }, [course?.status]);

    const processingLock = useMemo(() => {
        return hasProcessingVideo(course);
    }, [course]);

    const canEditInfo = useMemo(() => {
        if (!course) {
            return false;
        }

        return !isWaitingValidation && !isPublished && !processingLock;
    }, [course, isWaitingValidation, isPublished, processingLock]);

    const canDeleteDraft = useMemo(() => {
        if (!course) {
            return false;
        }

        if (isWaitingValidation) {
            return false;
        }

        if (isPublished) {
            return false;
        }

        if (processingLock) {
            return false;
        }

        return course.status === "DRAFT";
    }, [course, isWaitingValidation, isPublished, processingLock]);

    const deleteDisabledReason = useMemo(() => {
        if (canDeleteDraft) {
            return null;
        }

        return getDeleteDisabledReason({
            courseStatus: course?.status ?? "",
            isWaitingValidation,
            isPublished,
            processingLock,
        }, t);
    }, [canDeleteDraft, course?.status, isWaitingValidation, isPublished, processingLock, t]);

    async function handleDeleteCourse(): Promise<void> {
        if (!course?.id) {
            return;
        }

        setIsDeleting(true);

        try {
            await courseService.deleteCourse(course.id);
            toast.success(t("tutor.course_deleted"));
            navigate("/dashboard/tutor/courses");
        } catch {
            toast.error(t("api.errors.service_unavailable"));
        } finally {
            setIsDeleting(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">{t("tutor.course_information")}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("common.loading")}</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("tutor.details")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="h-10 w-full rounded-md bg-muted"/>
                        <div className="h-24 w-full rounded-md bg-muted"/>
                        <div className="h-10 w-40 rounded-md bg-muted"/>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">{t("tutor.course_information")}</h1>
                <p className="text-sm text-muted-foreground">{t("tutor.no_course_data")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t("tutor.course_information")}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("tutor.editable_fields_description")}
                        </p>

                        {isWaitingValidation ? (
                            <div className="mt-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                                {t("tutor.waiting_validation_notice")}
                            </div>
                        ) : null}

                        {isPublished ? (
                            <div className="mt-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                                {t("tutor.published_notice")}
                            </div>
                        ) : null}

                        {!isWaitingValidation && !isPublished && processingLock ? (
                            <div
                                className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                {t("tutor.processing_lock_notice")}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                            {course.status}
                        </Badge>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("tutor.details")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label>{t("tutor.author")}</Label>
                        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{authorLabel}</div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t("tutor.course_id")}</Label>
                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-mono">{course.id}</div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("common.status")}</Label>
                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{course.status}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="course-title">{t("tutor.title")}</Label>
                        <Input
                            id="course-title"
                            data-cy="course-title"
                            value={course.title ?? ""}
                            disabled={!canEditInfo}
                            onChange={(e) => {
                                const next = e.target.value;
                                setCourse((prev) => {
                                    if (!prev) {
                                        return prev;
                                    }
                                    return {
                                        ...prev,
                                        title: next,
                                    };
                                });
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="course-description">{t("tutor.description")}</Label>
                        <Textarea
                            id="course-description"
                            data-cy="course-description"
                            value={course.description ?? ""}
                            rows={6}
                            disabled={!canEditInfo}
                            onChange={(e) => {
                                const next = e.target.value;
                                setCourse((prev) => {
                                    if (!prev) {
                                        return prev;
                                    }
                                    return {
                                        ...prev,
                                        description: next,
                                    };
                                });
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="course-price">{t("tutor.price_euros")}</Label>
                            <Input
                                id="course-price"
                                data-cy="course-price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={centsToEurosString(course.price ?? null)}
                                disabled={!canEditInfo}
                                onChange={(e) => {
                                    const inputValue = e.target.value;
                                    const priceCents = parsePriceEurosToCents(inputValue);

                                    if (priceCents !== null && priceCents < 0) {
                                        toast.error(t("tutor.price_negative_error"));
                                        return;
                                    }

                                    setCourse((prev) => {
                                        if (!prev) {
                                            return prev;
                                        }
                                        return {
                                            ...prev,
                                            price: priceCents,
                                        };
                                    });
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t("tutor.price")}</Label>
                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-semibold">
                                {formatPriceFromCents(course.price ?? null)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t("tutor.created_at")}</Label>
                            <div
                                className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{formatDate(course.createdAt)}</div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("tutor.updated_at")}</Label>
                            <div
                                className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{formatDate(course.updatedAt)}</div>
                        </div>
                    </div>

                    {/* Delete draft */}
                    <div className="pt-2">
                        <div className="rounded-lg border p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-sm font-semibold">{t("tutor.danger_zone")}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {t("tutor.danger_zone_description")}
                                    </div>
                                </div>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={!canDeleteDraft || isDeleting}>
                                            {t("tutor.delete_draft")}
                                        </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t("tutor.delete_draft_title")}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t("tutor.delete_draft_warning")}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        <AlertDialogFooter>
                                            <AlertDialogCancel
                                                disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
                                            <AlertDialogAction
                                                disabled={isDeleting}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleDeleteCourse();
                                                }}
                                            >
                                                {isDeleting ? t("tutor.deleting") : t("common.confirm")}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {deleteDisabledReason ? (
                                    <div className="text-xs text-muted-foreground">{deleteDisabledReason}</div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
