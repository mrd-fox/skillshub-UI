import {useMemo, useState} from "react";
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

    if (status === "PENDING") {
        return true;
    }
    if (status === "PROCESSING") {
        return true;
    }

    return false;
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
}>): string {
    if (args.isWaitingValidation) {
        return "Désactivé : en attente de validation.";
    }

    if (args.isPublished) {
        return "Désactivé : cours publié.";
    }

    if (args.processingLock) {
        return "Désactivé : vidéo en PENDING/PROCESSING.";
    }

    if (args.courseStatus !== "DRAFT") {
        return "Désactivé : seulement pour DRAFT.";
    }

    return "Désactivé.";
}

export default function EditCoursePage() {
    const {course, setCourse, loading} = useCourseBuilder();
    const {internalUser} = useAuth();

    const [deleteUiDone, setDeleteUiDone] = useState<boolean>(false);

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

        if (isWaitingValidation) {
            return false;
        }

        if (isPublished) {
            return false;
        }

        if (processingLock) {
            return false;
        }

        return true;
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
        });
    }, [canDeleteDraft, course?.status, isWaitingValidation, isPublished, processingLock]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Informations du cours</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Chargement…</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Détails</CardTitle>
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
                <h1 className="text-2xl font-bold">Informations du cours</h1>
                <p className="text-sm text-muted-foreground">Aucune donnée de cours disponible.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Informations du cours</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Champs modifiables : <strong>titre</strong> et <strong>description</strong>. Les changements
                            sont persistés via le bouton global <strong>Save course</strong>.
                        </p>

                        {isWaitingValidation ? (
                            <div className="mt-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                                Ce cours est <strong>en attente de validation</strong> : édition et suppression
                                désactivées.
                            </div>
                        ) : null}

                        {isPublished ? (
                            <div className="mt-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                                Ce cours est <strong>publié</strong> : édition et suppression désactivées.
                            </div>
                        ) : null}

                        {!isWaitingValidation && !isPublished && processingLock ? (
                            <div
                                className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                Édition désactivée : au moins une vidéo est en <strong>PENDING/PROCESSING</strong>. Le
                                polling backend/UI peut rafraîchir l&apos;état du cours et écraser des changements non
                                sauvegardés.
                            </div>
                        ) : null}

                        {deleteUiDone ? (
                            <div
                                className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                                UI delete : action confirmée (aucun appel backend effectué).
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
                    <CardTitle>Détails</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label>Auteur</Label>
                        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{authorLabel}</div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>ID du cours</Label>
                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-mono">{course.id}</div>
                        </div>

                        <div className="space-y-2">
                            <Label>Statut</Label>
                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{course.status}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="course-title">Titre</Label>
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
                        <Label htmlFor="course-description">Description</Label>
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
                            <Label>Créé le</Label>
                            <div
                                className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{formatDate(course.createdAt)}</div>
                        </div>

                        <div className="space-y-2">
                            <Label>Dernière mise à jour</Label>
                            <div
                                className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{formatDate(course.updatedAt)}</div>
                        </div>
                    </div>

                    {/* Delete draft (UI only) */}
                    <div className="pt-2">
                        <div className="rounded-lg border p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-sm font-semibold">Zone dangereuse</div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Supprimer le cours (brouillon uniquement). Pour l’instant : UI uniquement, pas
                                        d’appel backend.
                                    </div>
                                </div>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={!canDeleteDraft}>
                                            Delete draft
                                        </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Supprimer ce brouillon ?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Cette action est destructive. Pour le moment, elle ne déclenche aucun
                                                appel backend (UI uniquement).
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    setDeleteUiDone(true);
                                                }}
                                            >
                                                Confirm
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
