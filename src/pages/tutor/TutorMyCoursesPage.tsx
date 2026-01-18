// src/pages/tutor/TutorMyCoursesPage.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// shadcn/ui v0
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "PROCESSING" | "READY";

type CourseListItem = {
    id: string;
    title?: string;
    status: CourseStatus;
    updatedAt?: string;
};

export default function TutorMyCoursesPage() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState<boolean>(true);
    const [courses, setCourses] = useState<CourseListItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8080";
    const listUrl = `${apiBaseUrl}/api/course`;

    useEffect(() => {
        let cancelled = false;

        async function loadCourses() {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(listUrl, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        Accept: "application/json",
                    },
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `HTTP ${res.status}`);
                }

                const data = (await res.json()) as CourseListItem[];

                if (!cancelled) {
                    setCourses(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                if (!cancelled) {
                    const message = e instanceof Error ? e.message : "Unknown error";
                    setError(message);
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
    }, [listUrl]);

    const skeletonItems = useMemo(() => {
        // Skeleton while loading page. Status can't be “real” until data arrives.
        // We keep a neutral status to preserve UI structure.
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
        }
        return courses.map((c) => {
            return {
                ...c,
                __skeleton: false as const,
            };
        });
    }, [loading, courses, skeletonItems]);

    return (
        <div className="w-full p-4 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">My Courses</h1>
                    <p className="text-sm text-muted-foreground">
                        Click a course to open the editor. Covers are intentionally hidden (skeleton).
                    </p>
                </div>

                <Button
                    onClick={() => {
                        navigate("/dashboard/tutor/create");
                    }}
                >
                    Create Course
                </Button>
            </div>

            {error !== null ? (
                <Card className="border-destructive/40">
                    <CardHeader>
                        <div className="text-sm font-medium text-destructive">Loading failed</div>
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
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {!loading && error === null && courses.length === 0 ? (
                <Card className="mt-4">
                    <CardContent className="py-8">
                        <div className="text-sm font-medium">No courses yet</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Create your first course to start building your content.
                        </div>
                        <div className="mt-4">
                            <Button
                                onClick={() => {
                                    navigate("/dashboard/tutor/create");
                                }}
                            >
                                Create Course
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
    const statusVariant = getStatusVariant(props.course.status);
    const statusLabel = getStatusLabel(props.course.status);

    const title = props.course.title ?? "Untitled course";
    const updatedLabel = formatUpdatedAt(props.course.updatedAt);

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
            className={[
                "relative transition",
                props.disabled ? "opacity-80" : "cursor-pointer hover:shadow-md",
            ].join(" ")}
        >
            <div className="absolute right-3 top-3 z-10">
                <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>

            {/* Thumbnail is always a skeleton: no image by design */}
            <CardHeader className="pb-2">
                <Skeleton className="h-28 w-full rounded-md" />
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Title + meta */}
                <div className="space-y-1">
                    {props.disabled ? (
                        <Skeleton className="h-4 w-3/4" />
                    ) : (
                        <div className="text-sm font-semibold leading-tight line-clamp-2">{title}</div>
                    )}

                    {props.disabled ? (
                        <Skeleton className="h-3 w-1/2" />
                    ) : (
                        <div className="text-xs text-muted-foreground">{updatedLabel}</div>
                    )}
                </div>

                {/* Body skeleton blocks (to match your mock style) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                </div>

                <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                </div>

                {/* Call to action hint */}
                <div className="pt-1">
                    {props.disabled ? (
                        <Skeleton className="h-3 w-28" />
                    ) : (
                        <span className="text-xs text-muted-foreground">Open editor →</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function getStatusLabel(status: CourseStatus): string {
    if (status === "DRAFT") {
        return "Draft";
    } else if (status === "PUBLISHED") {
        return "Published";
    } else if (status === "ARCHIVED") {
        return "Archived";
    } else if (status === "PROCESSING") {
        return "Processing";
    } else if (status === "READY") {
        return "Ready";
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

function formatUpdatedAt(updatedAt?: string): string {
    if (!updatedAt) {
        return "Updated recently";
    }

    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) {
        return "Updated recently";
    }

    return `Updated on ${date.toLocaleDateString()}`;
}
