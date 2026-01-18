import * as React from "react";
import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {NavLink, Outlet, useLocation, useParams} from "react-router-dom";
import api from "@/api/axios.ts";
import {Loader2} from "lucide-react";
import {VideoResponse} from "@/types/video.ts";

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
        <CourseBuilderContext.Provider value={ctxValue}>
            <div className="w-full">
                {/* Top tabs */}
                <div className="w-full rounded-xl border bg-white px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2">
                        <TabLink to="edit" label="Informations" active={activeTab === "edit"}/>
                        <TabLink
                            to="sections"
                            label="Sections & chapitres"
                            active={activeTab === "sections"}
                        />
                        <TabLink to="resources" label="Ressources" active={activeTab === "resources"}/>
                        <TabLink to="settings" label="Paramètres" active={activeTab === "settings"}/>

                        <div className="ml-auto flex items-center gap-3 pr-1">
                            {loading ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                    Loading...
                                </div>
                            ) : null}

                            {saving ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                    Saving...
                                </div>
                            ) : null}

                            {course ? (
                                <span className="rounded-full border px-3 py-1 text-xs font-medium">
                  {course.status}
                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Content */}
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
    );
}

function TabLink(props: { to: string; label: string; active: boolean }) {
    return (
        <NavLink
            to={props.to}
            className={() => {
                return [
                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    props.active
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                ].join(" ");
            }}
            end
        >
            {props.label}
        </NavLink>
    );
}

