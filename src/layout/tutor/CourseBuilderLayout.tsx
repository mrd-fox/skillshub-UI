import * as React from "react";
import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {NavLink, Outlet, useLocation, useParams} from "react-router-dom";
import api from "@/api/axios.ts";
import {Loader2} from "lucide-react";
import {VideoResponse} from "@/types/video.ts";
import {Button} from "@/components/ui/button.tsx";
import {Card} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {cn} from "@/lib/utils.ts";
import {TooltipProvider} from "@/components/ui/tooltip.tsx";

type ChapterResponse = {
    id: string;
    title: string;

    createdAt?: string | null;
    updatedAt?: string | null;

    video?: VideoResponse | null;
};

type SectionResponse = {
    id: string;
    title: string;
    chapters: ChapterResponse[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

type CourseStatusEnum = "DRAFT" | "WAITING_VALIDATION" | "VALIDATED" | "REJECTED" | "PUBLISHED";

export type CourseResponse = {
    id: string;
    title: string;
    description: string;
    status: CourseStatusEnum;
    sections: SectionResponse[];
    createdAt?: string | null;
    updatedAt?: string | null;
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

    async function refreshCourse(): Promise<void> {
        if (!resolvedCourseId) {
            setCourse(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await api.get(`/course/${resolvedCourseId}`);
            setCourse(res.data as CourseResponse);
        } finally {
            setLoading(false);
        }
    }

    async function saveCourse(partial: Partial<CourseResponse>): Promise<CourseResponse | null> {
        if (!resolvedCourseId) {
            return null;
        }

        setSaving(true);
        try {
            const payload = {
                ...(course ?? {}),
                ...partial,
                id: resolvedCourseId,
            };

            const res = await api.put(`/course/${resolvedCourseId}`, payload);
            const updated = res.data as CourseResponse;
            setCourse(updated);
            return updated;
        } finally {
            setSaving(false);
        }
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
    }, [resolvedCourseId, course, loading, saving]);

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
                                <TabLink to="resources" label="Ressources" active={activeTab === "resources"}/>
                                <TabLink to="settings" label="Paramètres" active={activeTab === "settings"}/>
                            </div>

                            <div className="ml-auto flex items-center gap-3">
                                {loading ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                        Loading
                                    </div>
                                ) : null}

                                {saving ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                        Saving
                                    </div>
                                ) : null}

                                {course ? (
                                    <Badge
                                        variant="outline"
                                        className="rounded-full px-3 py-1 text-xs font-semibold"
                                    >
                                        {course.status}
                                    </Badge>
                                ) : null}
                            </div>
                        </div>
                    </Card>

                    <div className="mt-6">
                        {loading ? (
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
            className={cn(
                "h-9 rounded-lg px-4",
                props.active ? "shadow-sm" : "text-muted-foreground"
            )}
        >
            <NavLink to={props.to} end>
                {props.label}
            </NavLink>
        </Button>
    );
}

