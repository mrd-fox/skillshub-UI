import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {NavLink, Outlet, useLocation, useParams} from "react-router-dom";
import api from "@/api/axios.ts";
import {Loader2, Save, Send} from "lucide-react";
import {VideoResponse} from "@/types/video.ts";
import {Button} from "@/components/ui/button.tsx";
import {Card} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {cn} from "@/lib/utils.ts";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {toast} from "sonner";

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
    setCourse: (value: CourseResponse | null | ((prev: CourseResponse | null) => CourseResponse | null)) => void;

    // Selection: single source of truth for the chapter currently displayed in the viewer.
    selectedChapterId: string | null;
    setSelectedChapterId: (value: string | null | ((prev: string | null) => string | null)) => void;

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

type PublishGate = {
    totalChapters: number;
    readyVideos: number;
    missingVideoChapters: number;
    notReadyVideos: number;
    canPublish: boolean;
};

function isClientKey(id: string | null | undefined): boolean {
    const value = (id ?? "").trim();
    return value.startsWith("client:");
}

function getCourseStatusLabel(status: CourseStatusEnum): string {
    if (status === "DRAFT") {
        return "Brouillon";
    }
    if (status === "WAITING_VALIDATION") {
        return "En attente de validation";
    }
    if (status === "VALIDATED") {
        return "Validé";
    }
    if (status === "REJECTED") {
        return "Rejeté";
    }
    if (status === "PUBLISHED") {
        return "Publié";
    }
    return status;
}

function computePublishGate(course: CourseResponse | null): PublishGate {
    const result: PublishGate = {
        totalChapters: 0,
        readyVideos: 0,
        missingVideoChapters: 0,
        notReadyVideos: 0,
        canPublish: false,
    };

    if (!course) {
        return result;
    }

    for (const section of course.sections ?? []) {
        for (const chapter of section.chapters ?? []) {
            result.totalChapters += 1;

            const video = chapter.video ?? null;
            if (!video) {
                result.missingVideoChapters += 1;
                continue;
            }

            if (video.status === "READY") {
                result.readyVideos += 1;
            } else {
                result.notReadyVideos += 1;
            }
        }
    }

    // MVP rule: every chapter must have a READY video.
    if (course.status === "WAITING_VALIDATION") {
        return result;
    }

    if (result.totalChapters <= 0) {
        return result;
    }

    if (result.missingVideoChapters > 0) {
        return result;
    }

    if (result.notReadyVideos > 0) {
        return result;
    }

    result.canPublish = result.readyVideos === result.totalChapters;
    return result;
}

function getPublishTooltipText(args: Readonly<{
    course: CourseResponse | null;
    isWaitingValidation: boolean;
    gate: PublishGate;
}>): string {
    if (!args.course) {
        return "Chargement du cours...";
    }

    if (args.isWaitingValidation) {
        return "Ce cours est en attente de validation : édition et publication bloquées.";
    }

    if (args.gate.totalChapters <= 0) {
        return "Ajoute au moins un chapitre avant de soumettre le cours.";
    }

    if (args.gate.missingVideoChapters > 0) {
        return `${args.gate.readyVideos}/${args.gate.totalChapters} vidéos prêtes — ${args.gate.missingVideoChapters} chapitre(s) sans vidéo.`;
    }

    if (args.gate.notReadyVideos > 0) {
        return `${args.gate.readyVideos}/${args.gate.totalChapters} vidéos prêtes — ${args.gate.notReadyVideos} vidéo(s) en cours / en échec.`;
    }

    return "Soumettre le cours à la procédure de validation interne.";
}

function getErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message.trim().length > 0) {
        return err.message;
    }
    return "Erreur inconnue.";
}

export default function CourseBuilderLayout() {
    const {courseId} = useParams();
    const location = useLocation();

    const resolvedCourseId = courseId ?? "";

    const [course, setCourse] = useState<CourseResponse | null>(null);

    // Only for initial fetch (course=null). Must not unmount Outlet on background refresh.
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [publishing, setPublishing] = useState<boolean>(false);

    // Chapter selection (for the central viewer).
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

    // Tracks the first fetch for the CURRENT courseId.
    const hasFetchedOnceRef = useRef<boolean>(false);

    const activeTab = useMemo(() => {
        const path = location.pathname;
        if (path.endsWith("/sections")) {
            return "sections";
        }
        if (path.endsWith("/resources")) {
            return "resources";
        }
        if (path.endsWith("/settings")) {
            return "settings";
        }
        return "edit";
    }, [location.pathname]);

    const isWaitingValidation = useMemo(() => {
        return course?.status === "WAITING_VALIDATION";
    }, [course]);

    const isEditable = useMemo(() => {
        return !!course && course.status !== "WAITING_VALIDATION";
    }, [course]);

    const publishGate = useMemo(() => {
        return computePublishGate(course);
    }, [course]);

    const publishTooltipText = useMemo(() => {
        return getPublishTooltipText({course, isWaitingValidation, gate: publishGate});
    }, [course, isWaitingValidation, publishGate]);

    const courseStatusLabel = useMemo(() => {
        if (!course) {
            return "";
        }
        return getCourseStatusLabel(course.status);
    }, [course]);

    const refreshCourse = useCallback(async (): Promise<void> => {
        if (!resolvedCourseId) {
            setCourse(null);
            setLoading(false);
            return;
        }

        if (!hasFetchedOnceRef.current) {
            setLoading(true);
        }

        try {
            // IMPORTANT: axios baseURL already contains "/api".
            // So routes MUST NOT start with "/api".
            const res = await api.get(`/course/${resolvedCourseId}`);
            setCourse(res.data as CourseResponse);
        } finally {
            hasFetchedOnceRef.current = true;
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
            req.price = partial.price === null || partial.price === undefined ? null : Number(partial.price);
        }

        if (partial.sections !== undefined) {
            if (partial.sections === null) {
                req.sections = null;
            } else {
                req.sections = (partial.sections ?? []).map((s) => {
                    const section: UpdateSectionRequest = {
                        title: s.title ?? null,
                        position: (s as SectionResponse).position ?? null,
                        chapters: ((s as SectionResponse).chapters ?? []).map((c) => {
                            const chapter: UpdateChapterRequest = {
                                title: c.title ?? null,
                                position: c.position ?? null,
                            };

                            // Backend assigns ids. Never send UI clientKey ids.
                            if (c.id && c.id.trim().length > 0 && !isClientKey(c.id)) {
                                chapter.id = c.id;
                            }

                            return chapter;
                        }),
                    };

                    // Backend assigns ids. Never send UI clientKey ids.
                    if (s.id && s.id.trim().length > 0 && !isClientKey(s.id)) {
                        section.id = s.id;
                    }

                    return section;
                });
            }
        }

        return req;
    }

    async function saveCourse(partial: Partial<CourseResponse>): Promise<CourseResponse | null> {
        if (!resolvedCourseId) {
            return null;
        }

        if (!isEditable) {
            toast.error("Ce cours est en attente de validation : modification bloquée.");
            return course;
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

        await saveCourse({sections: course.sections});
    }

    async function handlePublishCourse(): Promise<void> {
        if (!resolvedCourseId) {
            return;
        }

        if (!course) {
            return;
        }

        if (isWaitingValidation) {
            toast.error("Ce cours est déjà en attente de validation.");
            return;
        }

        if (!publishGate.canPublish) {
            if (publishGate.totalChapters <= 0) {
                toast.error("Publication impossible : le cours ne contient aucun chapitre.");
                return;
            }

            if (publishGate.missingVideoChapters > 0) {
                toast.error(`Publication impossible : ${publishGate.missingVideoChapters} chapitre(s) sans vidéo.`);
                return;
            }

            if (publishGate.notReadyVideos > 0) {
                toast.error(`Publication impossible : ${publishGate.notReadyVideos} vidéo(s) ne sont pas prêtes.`);
                return;
            }

            toast.error("Publication impossible : toutes les vidéos doivent être prêtes.");
            return;
        }

        setPublishing(true);
        try {
            // Backend route: POST /api/course/{courseId}/publish
            const res = await api.post(`/course/${resolvedCourseId}/publish`, {});
            const updated = res.data as CourseResponse;
            setCourse(updated);

            if (updated.status === "WAITING_VALIDATION") {
                toast.success("Cours soumis à validation. Édition bloquée jusqu’à décision.");
            } else {
                toast.success("Cours soumis.");
            }
        } catch (err: unknown) {
            toast.error(`Soumission échouée : ${getErrorMessage(err)}`);
        } finally {
            setPublishing(false);
        }
    }

    useEffect(() => {
        // Reset per-course state
        setSelectedChapterId(null);
        hasFetchedOnceRef.current = false;

        void refreshCourse();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedCourseId]);

    const ctxValue: CourseBuilderContextValue = useMemo(() => {
        return {
            courseId: resolvedCourseId,
            course,
            setCourse,
            selectedChapterId,
            setSelectedChapterId,
            loading,
            saving,
            refreshCourse,
            saveCourse,
        };
    }, [resolvedCourseId, course, selectedChapterId, loading, saving, refreshCourse]);

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
                                <TabLink to="sections" label="Sections & chapitres" active={activeTab === "sections"}/>
                                <TabLink to="resources" label="Ressources" active={activeTab === "resources"}/>
                                <TabLink to="settings" label="Paramètres" active={activeTab === "settings"}/>
                            </div>

                            <div className="ml-auto flex items-center gap-3">
                                {course ? (
                                    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                                        {courseStatusLabel}
                                    </Badge>
                                ) : null}

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Button
                                                size="sm"
                                                onClick={() => void handlePublishCourse()}
                                                disabled={
                                                    loading ||
                                                    saving ||
                                                    publishing ||
                                                    !course ||
                                                    !publishGate.canPublish ||
                                                    isWaitingValidation
                                                }
                                                className="h-9 rounded-lg"
                                            >
                                                {publishing ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                        Publication...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="mr-2 h-4 w-4"/>
                                                        Publier
                                                    </>
                                                )}
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <span>{publishTooltipText}</span>
                                    </TooltipContent>
                                </Tooltip>

                                <Button
                                    size="sm"
                                    onClick={() => void handleSaveCourse()}
                                    disabled={loading || saving || publishing || !course || !isEditable}
                                    className="h-9 rounded-lg"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Enregistrement...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4"/>
                                            Enregistrer
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div className="mt-6">
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

function TabLink(props: Readonly<{ to: string; label: string; active: boolean }>) {
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
