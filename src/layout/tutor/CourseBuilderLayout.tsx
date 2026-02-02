import * as React from "react";
import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {NavLink, Outlet, useLocation, useParams} from "react-router-dom";
import api from "@/api/axios.ts";
import {Loader2, Save} from "lucide-react";
import {VideoResponse} from "@/types/video.ts";
import {Button} from "@/components/ui/button.tsx";
import {Card} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {cn} from "@/lib/utils.ts";
import {TooltipProvider} from "@/components/ui/tooltip";

type ChapterResponse = {
    id: string;
    title: string;
    position: number;

    createdAt?: string | null;
    updatedAt?: string | null;

    video?: VideoResponse | null;
};

type SectionResponse = {
    id: string;
    title: string;
    position: number;
    chapters: ChapterResponse[];

    createdAt?: string | null;
    updatedAt?: string | null;
};

type CourseStatusEnum =
    | "DRAFT"
    | "WAITING_VALIDATION"
    | "VALIDATED"
    | "REJECTED"
    | "PUBLISHED";

export type CourseResponse = {
    id: string;
    title: string;
    description: string;
    status: CourseStatusEnum;
    price?: number | null;
    sections: SectionResponse[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

// Backend UpdateCourseRequest (PATCH-like)
type UpdateCourseRequest = {
    title?: string | null;
    description?: string | null;
    price?: number | null;
    sections?: UpdateSectionRequest[] | null;
};

type UpdateSectionRequest = {
    id?: string | null;
    title?: string | null;
    position?: number | null;
    chapters?: UpdateChapterRequest[] | null;
};

type UpdateChapterRequest = {
    id?: string | null;
    title?: string | null;
    position?: number | null;
};

type CourseBuilderContextValue = {
    courseId: string;
    course: CourseResponse | null;
    setCourse: React.Dispatch<React.SetStateAction<CourseResponse | null>>;
    loading: boolean;
    saving: boolean;
    refreshCourse: () => Promise<void>;
    saveCourse: (partial: Partial<CourseResponse>) => Promise<CourseResponse | null>;
};

const CourseBuilderContext = createContext<CourseBuilderContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useCourseBuilder(): CourseBuilderContextValue {
    const ctx = useContext(CourseBuilderContext);
    if (ctx === null) {
        throw new Error("useCourseBuilder must be used within CourseBuilderLayout");
    }
    return ctx;
}

export default function CourseBuilderLayout() {
    const {courseId} = useParams();
    const location = useLocation();

    const resolvedCourseId = courseId ?? "";

    const [course, setCourse] = useState<CourseResponse | null>(null);
    // IMPORTANT: keep the Outlet mounted.
    // "loading" is only for the FIRST fetch (course=null).
    // Background refreshes (polling, manual refresh) DO NOT change loading state,
    // otherwise the Outlet unmounts/remounts and triggers an infinite refresh loop.
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    const activeTab = useMemo(() => {
        const path = location.pathname;
        if (path.endsWith("/sections")) {
            return "sections";
        } else if (path.endsWith("/resources")) {
            return "resources";
        } else if (path.endsWith("/settings")) {
            return "settings";
        } else {
            return "edit";
        }
    }, [location.pathname]);

    const refreshCourse = useCallback(async (): Promise<void> => {
        if (!resolvedCourseId) {
            setCourse(null);
            setLoading(false);
            return;
        }

        // Use functional update to avoid depending on `course` in useCallback deps.
        // This prevents infinite loops: refreshCourse reference stays stable across renders.
        setCourse((prevCourse) => {
            // Set loading state only on first fetch (when prevCourse is null)
            if (prevCourse === null) {
                setLoading(true);
            }
            // For subsequent refreshes (polling, manual), keep the UI mounted by NOT changing loading state
            return prevCourse;
        });

        try {
            // IMPORTANT: axios baseURL already contains "/api".
            // So routes MUST NOT start with "/api".
            const res = await api.get(`/course/${resolvedCourseId}`);
            setCourse(res.data as CourseResponse);
        } finally {
            setLoading(false);
        }
    }, [resolvedCourseId]);

    function mapPartialToUpdateRequest(partial: Partial<CourseResponse>): UpdateCourseRequest {
        const req: UpdateCourseRequest = {};

        if (partial.title !== undefined) {
            req.title = partial.title ?? null;
        }

        if (partial.description !== undefined) {
            req.description = partial.description ?? null;
        }

        // Free course: price can be 0. Null/undefined means "no update" or "unset in UI".
        if (partial.price !== undefined) {
            if (partial.price === null || partial.price === undefined) {
                req.price = null;
            } else {
                req.price = Number(partial.price);
            }
        }

        if (partial.sections !== undefined) {
            if (partial.sections === null) {
                req.sections = null;
            } else {
                req.sections = (partial.sections ?? []).map((s) => {
                    return {
                        id: s.id ?? null,
                        title: s.title ?? null,
                        position: (s as SectionResponse).position ?? null,
                        chapters: ((s as SectionResponse).chapters ?? []).map((c) => {
                            return {
                                id: c.id ?? null,
                                title: c.title ?? null,
                                position: c.position ?? null,
                            };
                        }),
                    };
                });
            }
        }

        return req;
    }

    async function saveCourse(partial: Partial<CourseResponse>): Promise<CourseResponse | null> {
        if (!resolvedCourseId) {
            return null;
        }

        setSaving(true);
        try {
            const payload = mapPartialToUpdateRequest(partial);

            // IMPORTANT: axios baseURL already contains "/api".
            // So routes MUST NOT start with "/api".
            const res = await api.put(`/course/${resolvedCourseId}`, payload);

            const updated = res.data as CourseResponse;
            setCourse(updated);
            return updated;
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveCourse(): Promise<void> {
        if (!course) {
            return;
        }

        // Persist ONLY what is impacted by the builder right now (ordering + titles if updated later)
        await saveCourse({sections: course.sections});
    }

    useEffect(() => {
        void refreshCourse();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedCourseId]);

    const ctxValue: CourseBuilderContextValue = useMemo(() => {
        return {
            courseId: resolvedCourseId,
            course,
            setCourse,
            loading,
            saving,
            refreshCourse,
            saveCourse,
        };
    }, [resolvedCourseId, course, loading, saving, refreshCourse]);

    if (!resolvedCourseId) {
        return (
            <div className="p-6">
                <div className="text-sm font-medium text-red-600">Missing courseId in route.</div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <CourseBuilderContext.Provider value={ctxValue}>
                <div className="w-full">
                    <Card className="w-full p-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <TabLink to="edit" label="Informations" active={activeTab === "edit"}/>
                                <TabLink
                                    to="sections"
                                    label="Sections & chapitres"
                                    active={activeTab === "sections"}
                                />
                                <TabLink
                                    to="resources"
                                    label="Ressources"
                                    active={activeTab === "resources"}
                                />
                                <TabLink
                                    to="settings"
                                    label="Paramètres"
                                    active={activeTab === "settings"}
                                />
                            </div>

                            <div className="ml-auto flex items-center gap-3">
                                {course ? (
                                    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                                        {course.status}
                                    </Badge>
                                ) : null}

                                <Button
                                    size="sm"
                                    onClick={() => void handleSaveCourse()}
                                    disabled={loading || saving || !course}
                                    className="h-9 rounded-lg"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Saving
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4"/>
                                            Save course
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div className="mt-6">
                        {/*
                          Keep the Outlet mounted.
                          If we unmount it during background refreshes, hooks like useCoursePolling re-mount and
                          immediately call refreshCourse again, causing a tight refresh loop.
                        */}
                        {loading && course === null ? (
                            <div className="flex h-[55vh] items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin"/>
                            </div>
                        ) : (
                            <Outlet/>
                        )}
                    </div>
                </div>
            </CourseBuilderContext.Provider>
        </TooltipProvider>
    );
}

function TabLink(props: { to: string; label: string; active: boolean }) {
    return (
        <Button
            variant={props.active ? "secondary" : "ghost"}
            size="sm"
            asChild
            className={cn("h-9 rounded-lg px-4", props.active ? "shadow-sm" : "text-muted-foreground")}
        >
            <NavLink to={props.to} end>
                {props.label}
            </NavLink>
        </Button>
    );
}