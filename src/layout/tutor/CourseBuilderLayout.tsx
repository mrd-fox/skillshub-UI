import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {NavLink, Outlet, useLocation, useParams} from "react-router-dom";
import {courseService} from "@/api/services";
import {Loader2, Save, Send} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Card} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {cn} from "@/lib/utils.ts";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {toast} from "sonner";

import {
    computePublishGate,
    CourseBuilderContext,
    CourseMetaSnapshot,
    CourseResponse,
    getCourseStatusLabel,
    getErrorMessage,
    getPublishTooltipText,
    mapPartialToUpdateRequest,
    PublishGate,
    UpdateCourseRequest,
} from "./CourseBuilderLayout.ts";
import {hasInProgressVideo} from "@/lib/isVideoInProgress.ts";

export default function CourseBuilderLayout() {
    const {courseId} = useParams();
    const location = useLocation();

    const resolvedCourseId = courseId ?? "";

    const [course, setCourse] = useState<CourseResponse | null>(null);
    const [metaSnapshot, setMetaSnapshot] = useState<CourseMetaSnapshot | null>(null);
    const [hadSectionsSnapshot, setHadSectionsSnapshot] = useState<boolean>(false);
    const [structureDirty, setStructureDirty] = useState<boolean>(false);

    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [publishing, setPublishing] = useState<boolean>(false);

    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState<boolean>(false);
    const [pendingSavePayload, setPendingSavePayload] = useState<UpdateCourseRequest | null>(null);

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
    }, [course?.status]);

    const isPublished = useMemo(() => {
        return course?.status === "PUBLISHED";
    }, [course?.status]);

    const inProgressLock = useMemo(() => {
        return hasInProgressVideo(course);
    }, [course]);

    const structureLocked = useMemo(() => {
        return Boolean(isWaitingValidation) || Boolean(isPublished) || Boolean(inProgressLock);
    }, [isWaitingValidation, isPublished, inProgressLock]);

    const isEditable = useMemo(() => {
        if (!course) {
            return false;
        }
        if (course.status === "WAITING_VALIDATION") {
            return false;
        }
        if (course.status === "PUBLISHED") {
            return false;
        }
        return true;
    }, [course]);

    const publishGate: PublishGate = useMemo(() => {
        return computePublishGate(course);
    }, [course]);

    const metaDirty = useMemo(() => {
        if (!course || !metaSnapshot) {
            return false;
        }
        if (course.title !== metaSnapshot.title) {
            return true;
        }
        if (course.description !== metaSnapshot.description) {
            return true;
        }
        if (course.price !== metaSnapshot.price) {
            return true;
        }
        return false;
    }, [course, metaSnapshot]);

    const publishTooltipText = useMemo(() => {
        return getPublishTooltipText({course, isWaitingValidation, inProgressLock, gate: publishGate});
    }, [course, isWaitingValidation, inProgressLock, publishGate]);

    const courseStatusLabel = useMemo(() => {
        if (!course) {
            return "";
        }
        return getCourseStatusLabel(course.status);
    }, [course]);

    const refreshCourse = useCallback(async (): Promise<void> => {
        if (!resolvedCourseId) {
            setCourse(null);
            setMetaSnapshot(null);
            setHadSectionsSnapshot(false);
            setLoading(false);
            return;
        }

        if (!hasFetchedOnceRef.current) {
            setLoading(true);
        }

        try {
            const fetched = await courseService.getCourseById(resolvedCourseId);
            const normalized = fetched as CourseResponse;
            setCourse(normalized);

            if (!hasFetchedOnceRef.current) {
                setMetaSnapshot({
                    title: normalized.title,
                    description: normalized.description,
                    price: normalized.price ?? null,
                });
                setHadSectionsSnapshot((normalized.sections ?? []).length > 0);
            }
        } finally {
            hasFetchedOnceRef.current = true;
            setLoading(false);
        }
    }, [resolvedCourseId]);

    const markStructureDirty = useCallback(() => {
        setStructureDirty(true);
    }, []);

    const saveCourse = useCallback(async (partial: Partial<CourseResponse>): Promise<CourseResponse | null> => {
        if (!resolvedCourseId) {
            return null;
        }

        if (!course) {
            return null;
        }

        if (isWaitingValidation) {
            toast.error("Ce cours est en attente de validation : modification bloquée.");
            return course;
        }

        if (isPublished) {
            toast.error("Ce cours est publié : modification bloquée.");
            return course;
        }

        if (inProgressLock) {
            toast.error("Sauvegarde bloquée : une vidéo est en PENDING/PROCESSING. Attendez la fin du traitement.");
            return course;
        }

        if (!isEditable) {
            toast.error("Modification bloquée.");
            return course;
        }

        setSaving(true);
        try {
            const payload = mapPartialToUpdateRequest(partial);
            const updated = await courseService.updateCourse(resolvedCourseId, payload);
            const normalized = updated as CourseResponse;

            setCourse(normalized);
            setMetaSnapshot({
                title: normalized.title,
                description: normalized.description,
                price: normalized.price ?? null,
            });
            setHadSectionsSnapshot((normalized.sections ?? []).length > 0);
            setStructureDirty(false);

            return normalized;
        } finally {
            setSaving(false);
        }
    }, [resolvedCourseId, course, isWaitingValidation, isPublished, inProgressLock, isEditable]);

    const handleSaveCourse = useCallback(async (): Promise<void> => {
        if (!course) {
            return;
        }

        if (isPublished) {
            toast.error("Impossible de sauvegarder : ce cours est publié.");
            return;
        }

        const isMetaDirty = metaDirty;
        const isStructureDirty = structureDirty;

        if (!isMetaDirty && !isStructureDirty) {
            toast.info("Aucune modification à sauvegarder.");
            return;
        }

        const partial: Partial<CourseResponse> = {};

        if (isStructureDirty) {
            partial.sections = course.sections;

            if (isMetaDirty && metaSnapshot) {
                if (course.title !== metaSnapshot.title) {
                    partial.title = course.title;
                }
                if (course.description !== metaSnapshot.description) {
                    partial.description = course.description;
                }
                if (course.price !== metaSnapshot.price) {
                    partial.price = course.price;
                }
            }

            const sectionsArray = course.sections ?? [];
            if (sectionsArray.length === 0 && hadSectionsSnapshot) {
                const payload = mapPartialToUpdateRequest(partial);
                setPendingSavePayload(payload);
                setShowDeleteAllConfirm(true);
                return;
            }

            await saveCourse(partial);
            return;
        }

        if (isMetaDirty && metaSnapshot) {
            if (course.title !== metaSnapshot.title) {
                partial.title = course.title;
            }
            if (course.description !== metaSnapshot.description) {
                partial.description = course.description;
            }
            if (course.price !== metaSnapshot.price) {
                partial.price = course.price;
            }

            await saveCourse(partial);
        }
    }, [course, isPublished, metaDirty, structureDirty, metaSnapshot, hadSectionsSnapshot, saveCourse]);

    const confirmDeleteAllSections = useCallback(async (): Promise<void> => {
        if (!pendingSavePayload) {
            return;
        }

        setSaving(true);
        try {
            const updated = await courseService.updateCourse(resolvedCourseId, pendingSavePayload);
            const normalized = updated as CourseResponse;

            setCourse(normalized);
            setMetaSnapshot({
                title: normalized.title,
                description: normalized.description,
                price: normalized.price ?? null,
            });
            setHadSectionsSnapshot((normalized.sections ?? []).length > 0);
            setStructureDirty(false);

            toast.success("Toutes les sections ont été supprimées.");
        } catch (err: unknown) {
            toast.error(`Sauvegarde échouée : ${getErrorMessage(err)}`);
        } finally {
            setSaving(false);
            setShowDeleteAllConfirm(false);
            setPendingSavePayload(null);
        }
    }, [pendingSavePayload, resolvedCourseId]);

    const cancelDeleteAll = useCallback((): void => {
        setShowDeleteAllConfirm(false);
        setPendingSavePayload(null);
    }, []);

    const handlePublishCourse = useCallback(async (): Promise<void> => {
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

        if (isPublished) {
            toast.error("Ce cours est déjà publié.");
            return;
        }

        if (inProgressLock) {
            toast.error("Publication bloquée : une vidéo est en PENDING/PROCESSING.");
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
            const updated = await courseService.publishCourse(resolvedCourseId);
            const normalized = updated as CourseResponse;
            setCourse(normalized);

            if (normalized.status === "WAITING_VALIDATION") {
                toast.success("Cours soumis à validation. Édition bloquée jusqu'à décision.");
            } else {
                toast.success("Cours soumis.");
            }
        } catch (err: unknown) {
            toast.error(`Soumission échouée : ${getErrorMessage(err)}`);
        } finally {
            setPublishing(false);
        }
    }, [resolvedCourseId, course, isWaitingValidation, isPublished, inProgressLock, publishGate]);

    useEffect(() => {
        setSelectedChapterId(null);
        setMetaSnapshot(null);
        setHadSectionsSnapshot(false);
        setStructureDirty(false);
        hasFetchedOnceRef.current = false;

        void refreshCourse();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedCourseId]);

    const ctxValue = useMemo(() => {
        return {
            courseId: resolvedCourseId,
            course,
            setCourse,
            selectedChapterId,
            setSelectedChapterId,
            loading,
            saving,
            structureDirty,
            markStructureDirty,
            refreshCourse,
            saveCourse,
        };
    }, [resolvedCourseId, course, selectedChapterId, loading, saving, structureDirty, markStructureDirty, refreshCourse, saveCourse]);

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
                                                disabled={loading || saving || publishing || !course || structureLocked || !publishGate.canPublish}
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

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Button
                                                size="sm"
                                                data-cy="course-save"
                                                onClick={() => void handleSaveCourse()}
                                                disabled={loading || saving || publishing || !course || structureLocked || !isEditable}
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
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <span>
                                            {isPublished
                                                ? "Publié : sauvegarde bloquée."
                                                : (structureLocked
                                                    ? (isWaitingValidation
                                                        ? "En attente de validation : sauvegarde bloquée."
                                                        : "Vidéo en PENDING/PROCESSING : sauvegarde bloquée temporairement.")
                                                    : "Sauvegarder les modifications du cours.")}
                                        </span>
                                    </TooltipContent>
                                </Tooltip>
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

                <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer toutes les sections ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Vous êtes sur le point de supprimer toutes les sections de ce cours. Cette action est
                                irréversible. Voulez-vous continuer ?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel data-cy="delete-all-cancel" onClick={cancelDeleteAll}>
                                Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                                data-cy="delete-all-confirm"
                                onClick={() => void confirmDeleteAllSections()}
                            >
                                Confirmer la suppression
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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