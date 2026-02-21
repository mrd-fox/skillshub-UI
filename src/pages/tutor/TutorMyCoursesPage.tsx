import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import api from "@/api/axios";

// shadcn/ui
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {Button} from "@/components/ui/button";

type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "PROCESSING" | "READY";

type CourseListItem = {
    id: string;
    title?: string;
    status: CourseStatus;
    updatedAt?: string;
};

type ApiError = {
    status: number;
    message: string;
    raw?: unknown;
};

export default function TutorMyCoursesPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState<boolean>(true);
    const [courses, setCourses] = useState<CourseListItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadCourses() {
            setLoading(true);
            setError(null);

            try {
                // baseURL already contains "/api" (VITE_API_URL=http://.../api)
                const res = await api.get<CourseListItem[]>("/course");
                const data = res.data;

                if (!cancelled) {
                    setCourses(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                const err = e as ApiError;

                // Message is already sanitized by axios interceptor (never show backend logs/messages)
                if (!cancelled) {
                    setError(typeof err?.message === "string" && err.message.length > 0 ? err.message : t("api.errors.generic_retry"));
                    setCourses([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadCourses();

        return () => {
            cancelled = true;
        };
    }, [t]);

    const skeletonItems = useMemo(() => {
        return new Array(6).fill(null).map((_, idx) => {
            return {
                id: `skeleton-${idx}`,
                title: undefined,
                status: "DRAFT" as CourseStatus,
                updatedAt: undefined,
                __skeleton: true as const,
            };
        });
    }, []);

    const items = useMemo(() => {
        if (loading) {
            return skeletonItems;
        } else {
            return courses.map((c) => {
                return {
                    ...c,
                    __skeleton: false as const,
                };
            });
        }
    }, [loading, courses, skeletonItems]);

    return (
        <div className="w-full p-4 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">{t("navigation.my_courses")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("tutor.courses_page_description")}
                    </p>
                </div>

                <Button
                    onClick={() => {
                        navigate("/dashboard/tutor/create");
                    }}
                >
                    {t("dashboard.create_course")}
                </Button>
            </div>

            {error !== null ? (
                <Card className="border-destructive/40">
                    <CardHeader>
                        <div className="text-sm font-medium text-destructive">{t("tutor.loading_failed")}</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground break-words">{error}</div>
                        <div className="mt-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    window.location.reload();
                                }}
                            >
                                {t("common.retry")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {!loading && error === null && courses.length === 0 ? (
                <Card className="mt-4">
                    <CardContent className="py-8">
                        <div className="text-sm font-medium">{t("tutor.no_courses_yet")}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            {t("tutor.no_courses_description")}
                        </div>
                        <div className="mt-4">
                            <Button
                                onClick={() => {
                                    navigate("/dashboard/tutor/create");
                                }}
                            >
                                {t("dashboard.create_course")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                    const isSkeleton = (item as any).__skeleton === true;

                    return (
                        <CourseCard
                            key={item.id}
                            course={item}
                            disabled={isSkeleton}
                            onOpen={() => {
                                if (isSkeleton) {
                                    return;
                                } else {
                                    navigate(`/dashboard/tutor/course-builder/${item.id}/edit`);
                                }
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function CourseCard(props: {
    course: CourseListItem;
    disabled: boolean;
    onOpen: () => void;
}) {
    const {t} = useTranslation();
    const statusVariant = getStatusVariant(props.course.status);
    const statusLabel = getStatusLabel(props.course.status, t);

    const title = props.course.title ?? t("tutor.untitled_course");
    const updatedLabel = formatUpdatedAt(props.course.updatedAt, t);

    return (
        <Card
            role="button"
            tabIndex={props.disabled ? -1 : 0}
            onClick={() => {
                if (props.disabled) {
                    return;
                } else {
                    props.onOpen();
                }
            }}
            onKeyDown={(e) => {
                if (props.disabled) {
                    return;
                } else {
                    if (e.key === "Enter") {
                        props.onOpen();
                    } else if (e.key === " ") {
                        props.onOpen();
                    } else {
                        // no-op
                    }
                }
            }}
            className={["relative transition", props.disabled ? "opacity-80" : "cursor-pointer hover:shadow-md"].join(" ")}
        >
            <div className="absolute right-3 top-3 z-10">
                <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>

            {/* Thumbnail is always a skeleton: no image by design */}
            <CardHeader className="pb-2">
                <Skeleton className="h-28 w-full rounded-md"/>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="space-y-1">
                    {props.disabled ? (
                        <Skeleton className="h-4 w-3/4"/>
                    ) : (
                        <div className="text-sm font-semibold leading-tight line-clamp-2">{title}</div>
                    )}

                    {props.disabled ? <Skeleton className="h-3 w-1/2"/> :
                        <div className="text-xs text-muted-foreground">{updatedLabel}</div>}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-24"/>
                        <Skeleton className="h-3 w-10"/>
                    </div>
                    <Skeleton className="h-2 w-full rounded-full"/>
                </div>

                <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20"/>
                    <Skeleton className="h-3 w-24"/>
                </div>

                <div className="pt-1">
                    {props.disabled ? <Skeleton className="h-3 w-28"/> :
                        <span className="text-xs text-muted-foreground">{t("tutor.open_editor")}</span>}
                </div>
            </CardContent>
        </Card>
    );
}

function getStatusLabel(status: CourseStatus, t: (key: string) => string): string {
    if (status === "DRAFT") {
        return t("course_status.draft");
    } else if (status === "PUBLISHED") {
        return t("course_status.published");
    } else if (status === "ARCHIVED") {
        return t("course_status.archived");
    } else if (status === "PROCESSING") {
        return t("course_status.processing");
    } else if (status === "READY") {
        return t("course_status.ready");
    } else {
        return status;
    }
}

function getStatusVariant(status: CourseStatus): "default" | "secondary" | "destructive" | "outline" {
    if (status === "PUBLISHED") {
        return "default";
    } else if (status === "DRAFT") {
        return "secondary";
    } else if (status === "ARCHIVED") {
        return "outline";
    } else if (status === "PROCESSING") {
        return "secondary";
    } else if (status === "READY") {
        return "default";
    } else {
        return "secondary";
    }
}

function formatUpdatedAt(updatedAt?: string, t?: (key: string) => string): string {
    if (!updatedAt) {
        return t ? t("tutor.updated_recently") : "Updated recently";
    } else {
        const date = new Date(updatedAt);
        if (Number.isNaN(date.getTime())) {
            return t ? t("tutor.updated_recently") : "Updated recently";
        } else {
            return t ? `${t("tutor.updated_on")} ${date.toLocaleDateString()}` : `Updated on ${date.toLocaleDateString()}`;
        }
    }
}
