/**
 * Student Course Viewer Page
 * Displays enrolled course content with video player
 * Students can navigate through sections and chapters
 */

import {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {ArrowLeft, ChevronRight, PlayCircle} from "lucide-react";
import {useAuth} from "@/context/AuthContext";
import {courseService} from "@/api/services/courseService";
import {Course} from "@/api/types/course";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {SkeletonLoader} from "@/components/ui/SkeletonLoader";
import {ApiError} from "@/api/axios";
import VimeoPlayer from "@/components/video/VimeoPlayer";
import {Separator} from "@/components/ui/separator";

function isApiError(e: unknown): e is ApiError {
    if (!e || typeof e !== "object") {
        return false;
    }
    const candidate = e as { status?: unknown; message?: unknown };
    return typeof candidate.status === "number" && typeof candidate.message === "string";
}

function errorMessage(e: unknown): string {
    if (isApiError(e)) {
        if (e.status === 403) {
            return "Vous n'avez pas accès à ce cours.";
        }
        if (e.status === 404) {
            return "Cours introuvable.";
        }
        return e.message;
    }
    if (e instanceof Error && e.message.trim().length > 0) {
        return e.message;
    }
    return "Impossible de charger le cours.";
}

function buildSourceUri(sourceUri: string | null | undefined): string | null {
    if (!sourceUri) {
        return null;
    }
    const match = /^vimeo:\/\/(\d+)$/.exec(sourceUri);
    if (!match) {
        return null;
    }
    return match[1];
}

export default function StudentCourseViewerPage() {
    const {courseId} = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const {internalUser} = useAuth();

    const [loading, setLoading] = useState<boolean>(true);
    const [course, setCourse] = useState<Course | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load(): Promise<void> {
            if (!courseId) {
                setError("ID de cours manquant.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = await courseService.getEnrolledCourseById(courseId);

                if (!cancelled) {
                    setCourse(data);

                    if (data.sections && data.sections.length > 0) {
                        const firstSection = data.sections[0];
                        setSelectedSectionId(firstSection.id);

                        if (firstSection.chapters && firstSection.chapters.length > 0) {
                            setSelectedChapterId(firstSection.chapters[0].id);
                        }
                    }
                }
            } catch (e: unknown) {
                if (!cancelled) {
                    setError(errorMessage(e));
                    setCourse(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [courseId]);

    const isEnrolled = useMemo(() => {
        if (!internalUser || !courseId) {
            return false;
        }
        return internalUser.enrolledCourseIds.includes(courseId);
    }, [internalUser, courseId]);

    const selectedChapter = useMemo(() => {
        if (!course || !selectedSectionId || !selectedChapterId) {
            return null;
        }

        const section = course.sections.find((s) => s.id === selectedSectionId);
        if (!section) {
            return null;
        }

        const chapter = section.chapters.find((c) => c.id === selectedChapterId);
        return chapter ?? null;
    }, [course, selectedSectionId, selectedChapterId]);

    const videoSourceUri = useMemo(() => {
        if (!selectedChapter?.video?.sourceUri) {
            return null;
        }
        return buildSourceUri(selectedChapter.video.sourceUri);
    }, [selectedChapter]);

    function handleGoBack(): void {
        navigate("/dashboard/student/courses");
    }

    function handleSelectChapter(sectionId: string, chapterId: string): void {
        setSelectedSectionId(sectionId);
        setSelectedChapterId(chapterId);
    }

    if (loading) {
        return (
            <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
                <header className="space-y-3">
                    <SkeletonLoader className="h-8 w-48"/>
                    <SkeletonLoader className="h-6 w-full"/>
                </header>

                <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardContent className="p-0">
                                <SkeletonLoader className="aspect-video w-full rounded-t-lg"/>
                                <div className="space-y-3 p-6">
                                    <SkeletonLoader className="h-6 w-3/4"/>
                                    <SkeletonLoader className="h-4 w-full"/>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <aside>
                        <Card>
                            <CardHeader>
                                <SkeletonLoader className="h-5 w-32"/>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <SkeletonLoader className="h-10 w-full"/>
                                <SkeletonLoader className="h-10 w-full"/>
                                <SkeletonLoader className="h-10 w-full"/>
                            </CardContent>
                        </Card>
                    </aside>
                </section>
            </main>
        );
    }

    if (error) {
        return (
            <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
                <header>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGoBack}
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true"/>
                        Retour à mes cours
                    </Button>
                </header>

                <section
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    aria-live="polite"
                >
                    {error}
                </section>
            </main>
        );
    }

    if (!course) {
        return (
            <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
                <section className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Aucun cours à afficher.
                </section>
            </main>
        );
    }

    if (!isEnrolled) {
        return (
            <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
                <header>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGoBack}
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true"/>
                        Retour à mes cours
                    </Button>
                </header>

                <section
                    className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700"
                >
                    Vous devez être inscrit à ce cours pour accéder au contenu.
                </section>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
            <header className="space-y-3">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGoBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true"/>
                    Retour à mes cours
                </Button>

                <div>
                    <h1 className="text-3xl font-bold">{course.title}</h1>
                    {course.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                            {course.description}
                        </p>
                    ) : null}
                </div>
            </header>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {selectedChapter?.title ?? "Sélectionnez un chapitre"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {selectedChapter ? (
                                <>
                                    {videoSourceUri && selectedChapter.video ? (
                                        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                                            <VimeoPlayer
                                                sourceUri={videoSourceUri}
                                                embedHash={selectedChapter.video.embedHash ?? null}
                                                thumbnailUrl={selectedChapter.video.thumbnailUrl ?? null}
                                                minimalUi={false}
                                                autoplay={false}
                                                onError={(msg) => {
                                                    console.error("Video error:", msg);
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className="flex aspect-video w-full items-center justify-center rounded-lg border bg-muted/10">
                                            <div className="text-center text-sm text-muted-foreground">
                                                <PlayCircle
                                                    className="mx-auto mb-2 h-12 w-12"
                                                    aria-hidden="true"
                                                />
                                                <p>Aucune vidéo disponible pour ce chapitre.</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div
                                    className="flex aspect-video w-full items-center justify-center rounded-lg border bg-muted/10">
                                    <p className="text-sm text-muted-foreground">
                                        Sélectionnez un chapitre pour commencer.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <aside>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Contenu du cours</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {course.sections.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Aucun contenu disponible.
                                </p>
                            ) : (
                                <nav className="space-y-4" aria-label="Sections et chapitres">
                                    {[...course.sections]
                                        .sort((a, b) => a.position - b.position)
                                        .map((section) => (
                                            <div key={section.id}>
                                                <h3 className="mb-2 text-sm font-semibold">
                                                    {section.title}
                                                </h3>

                                                <Separator className="mb-2"/>

                                                {section.chapters.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        Aucun chapitre.
                                                    </p>
                                                ) : (
                                                    <ul className="space-y-1">
                                                        {[...section.chapters]
                                                            .sort((a, b) => a.position - b.position)
                                                            .map((chapter) => {
                                                                const isSelected =
                                                                    selectedSectionId === section.id &&
                                                                    selectedChapterId === chapter.id;

                                                                return (
                                                                    <li key={chapter.id}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleSelectChapter(
                                                                                    section.id,
                                                                                    chapter.id
                                                                                )
                                                                            }
                                                                            className={
                                                                                isSelected
                                                                                    ? "flex w-full items-center justify-between rounded-md bg-primary/10 px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                                                                                    : "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
                                                                            }
                                                                            aria-current={
                                                                                isSelected ? "true" : undefined
                                                                            }
                                                                        >
                                                                            <span className="flex items-center gap-2">
                                                                                {chapter.video?.status === "PUBLISHED" ? (
                                                                                    <PlayCircle
                                                                                        className="h-4 w-4 flex-shrink-0"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                ) : null}
                                                                                {chapter.title}
                                                                            </span>
                                                                            {isSelected ? (
                                                                                <ChevronRight
                                                                                    className="h-4 w-4 flex-shrink-0"
                                                                                    aria-hidden="true"
                                                                                />
                                                                            ) : null}
                                                                        </button>
                                                                    </li>
                                                                );
                                                            })}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                </nav>
                            )}
                        </CardContent>
                    </Card>
                </aside>
            </section>
        </main>
    );
}
