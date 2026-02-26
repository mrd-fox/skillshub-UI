import {useMemo, useState} from "react";
import {PanelRightClose, PanelRightOpen} from "lucide-react";

import ChapterVideoPanel from "@/components/courseBuilder/ChapterVideoPanel.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {cn} from "@/lib/utils.ts";

import {useCoursePolling} from "@/hooks/useCoursePolling.ts";
import {ChapterResponse, CourseResponse, SectionResponse, useCourseBuilder} from "@/layout/tutor";
import {useSectionsOrder} from "@/pages/tutor/course-builder/section/useSectionsOrder.ts";

import CourseStructureSidebar from "./CourseStructureSidebar";
import {hasInProgressVideo} from "@/lib/isVideoInProgress.ts";

/**
 * CourseSectionsEditor
 * - Handles UI + client-side ordering (UP/DOWN)
 * - NO API calls here
 * - Persistence happens only via the global "Save course" button (outside)
 *
 * Updated (MVP locks):
 * - Structure changes are blocked when:
 *   - course.status === WAITING_VALIDATION
 *   - OR course.status === PUBLISHED
 *   - OR at least one video is PENDING or PROCESSING (polling active)
 * - Video upload remains allowed for persisted chapters (non clientKey).
 */

type SelectedContext = {
    selectedSectionId: string | null;
    selectedChapterId: string | null;
    selectedSectionTitle: string | null;
    selectedChapterTitle: string | null;
};

function isClientKey(id: string | null | undefined): boolean {
    const value = (id ?? "").trim();
    return value.startsWith("client:");
}

function countChapters(sections: SectionResponse[]): number {
    return sections.reduce((acc, s) => acc + (s.chapters?.length ?? 0), 0);
}

function findSelectedContext(sections: SectionResponse[], selectedChapterId: string | null): SelectedContext {
    if (!selectedChapterId) {
        return {
            selectedSectionId: null,
            selectedChapterId: null,
            selectedSectionTitle: null,
            selectedChapterTitle: null,
        };
    }

    for (const section of sections) {
        const chapters = section.chapters ?? [];
        for (const chapter of chapters) {
            if (chapter.id === selectedChapterId) {
                return {
                    selectedSectionId: section.id,
                    selectedChapterId,
                    selectedSectionTitle: section.title,
                    selectedChapterTitle: chapter.title,
                };
            }
        }
    }

    return {
        selectedSectionId: null,
        selectedChapterId: null,
        selectedSectionTitle: null,
        selectedChapterTitle: null,
    };
}

function findSelectedChapter(
    sections: SectionResponse[],
    selectedChapterId: string | null
): { sectionId: string; chapter: ChapterResponse } | null {
    if (!selectedChapterId) {
        return null;
    }

    for (const section of sections) {
        for (const chapter of section.chapters ?? []) {
            if (chapter.id === selectedChapterId) {
                return {sectionId: section.id, chapter};
            }
        }
    }

    return null;
}

function sortAndNormalize(sections: SectionResponse[]): SectionResponse[] {
    const sortedSections = [...sections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    return sortedSections.map((s, sectionIndex) => {
        const sortedChapters = [...(s.chapters ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        return {
            ...s,
            position: sectionIndex + 1,
            chapters: sortedChapters.map((c, chapterIndex) => {
                return {
                    ...c,
                    position: chapterIndex + 1,
                };
            }),
        };
    });
}

function makeClientId(): string {
    // Use browser crypto when available
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `client:${crypto.randomUUID()}`;
    }

    // Fallback: sufficiently unique for client-side temp keys
    return `client:${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function CourseSectionEditor() {
    const {
        courseId,
        course,
        setCourse,
        selectedChapterId,
        setSelectedChapterId,
        markStructureDirty,
        refreshCourse,
    } = useCourseBuilder();

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

    const effectiveCourse: CourseResponse | null = useMemo(() => {
        return course ?? null;
    }, [course]);

    // Critical: always sort by position to avoid Set/random ordering jitter.
    const sections: SectionResponse[] = useMemo(() => {
        const raw = effectiveCourse?.sections ?? [];
        return sortAndNormalize(raw);
    }, [effectiveCourse]);

    const totalChapters = useMemo(() => {
        return countChapters(sections);
    }, [sections]);

    const selectedContext = useMemo(() => {
        return findSelectedContext(sections, selectedChapterId);
    }, [sections, selectedChapterId]);

    const selected = useMemo(() => {
        return findSelectedChapter(sections, selectedChapterId);
    }, [sections, selectedChapterId]);

    const processingLock = useMemo(() => {
        return hasInProgressVideo(effectiveCourse);
    }, [effectiveCourse]);

    useCoursePolling(
        effectiveCourse,
        async () => {
            await refreshCourse();
        },
        {enabled: processingLock, intervalMs: 3000}
    );

    const status = course?.status ?? "DRAFT";
    const isWaitingValidation = status === "WAITING_VALIDATION";
    const isPublished = status === "PUBLISHED";

    const structureLocked = isWaitingValidation || isPublished || processingLock;

    function setSections(next: SectionResponse[]) {
        setCourse((prev) => {
            if (!prev) {
                return prev;
            }

            return {
                ...prev,
                sections: sortAndNormalize(next),
            };
        });
    }

    const {
        moveSection,
        moveChapter,
        canMoveSectionUp,
        canMoveSectionDown,
        canMoveChapterUp,
        canMoveChapterDown,
    } = useSectionsOrder({
        sections,
        setSections,
        onStructureChange: () => {
            markStructureDirty();
        },
        structureLocked,
    });

    function handleSelectChapter(id: string) {
        setSelectedChapterId(id);
    }

    function toggleSidebar() {
        setSidebarOpen((prev) => !prev);
    }

    const selectedIsPersisted = useMemo(() => {
        if (!selected) {
            return false;
        }
        return !isClientKey(selected.chapter.id);
    }, [selected]);

    // =========================
    // Structure actions (restore full functionality)
    // =========================

    function handleAddSection(): void {
        if (structureLocked) {
            return;
        }

        const next: SectionResponse[] = [
            ...sections,
            {
                id: makeClientId(),
                title: "Nouvelle section",
                position: (sections.length ?? 0) + 1,
                chapters: [],
                createdAt: null,
                updatedAt: null,
            },
        ];

        setSections(next);
        markStructureDirty();
    }

    function handleAddChapter(sectionId: string): void {
        if (structureLocked) {
            return;
        }

        const next = sections.map((s) => {
            if (s.id !== sectionId) {
                return s;
            }

            const chapters = s.chapters ?? [];
            const newChapter: ChapterResponse = {
                id: makeClientId(),
                title: "Nouveau chapitre",
                position: (chapters.length ?? 0) + 1,
                createdAt: null,
                updatedAt: null,
                video: null,
            };

            return {
                ...s,
                chapters: [...chapters, newChapter],
            };
        });

        setSections(next);
        markStructureDirty();
    }

    function handleRenameSection(sectionId: string, nextTitle: string): void {
        if (structureLocked) {
            return;
        }

        const trimmed = (nextTitle ?? "").trim();
        if (trimmed.length === 0) {
            return;
        }

        const next = sections.map((s) => {
            if (s.id !== sectionId) {
                return s;
            }
            return {...s, title: trimmed};
        });

        setSections(next);
        markStructureDirty();
    }

    function handleRenameChapter(chapterId: string, nextTitle: string): void {
        if (structureLocked) {
            return;
        }

        const trimmed = (nextTitle ?? "").trim();
        if (trimmed.length === 0) {
            return;
        }

        const next = sections.map((s) => {
            const chapters = s.chapters ?? [];
            const updated = chapters.map((c) => {
                if (c.id !== chapterId) {
                    return c;
                }
                return {...c, title: trimmed};
            });

            return {...s, chapters: updated};
        });

        setSections(next);
        markStructureDirty();
    }

    function handleDeleteSection(sectionId: string): void {
        if (structureLocked) {
            return;
        }

        const removedSection = sections.find((s) => s.id === sectionId) ?? null;
        const removedChapterIds = new Set((removedSection?.chapters ?? []).map((c) => c.id));

        const next = sections.filter((s) => s.id !== sectionId);

        if (selectedChapterId && removedChapterIds.has(selectedChapterId)) {
            setSelectedChapterId(null);
        }

        setSections(next);
        markStructureDirty();
    }

    function handleDeleteChapter(chapterId: string): void {
        if (structureLocked) {
            return;
        }

        const next = sections.map((s) => {
            const chapters = s.chapters ?? [];
            const filtered = chapters.filter((c) => c.id !== chapterId);

            if (filtered.length === chapters.length) {
                return s;
            }

            return {
                ...s,
                chapters: filtered,
            };
        });

        if (selectedChapterId === chapterId) {
            setSelectedChapterId(null);
        }

        setSections(next);
        markStructureDirty();
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Top toolbar */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                        {sections.length} section(s)
                    </Badge>

                    <Badge variant="secondary" className="text-xs">
                        {totalChapters} chapitre(s)
                    </Badge>

                    {isWaitingValidation ? (
                        <Badge variant="destructive" className="text-xs">
                            Lecture seule (validation)
                        </Badge>
                    ) : null}

                    {isPublished ? (
                        <Badge variant="destructive" className="text-xs">
                            Lecture seule (publié)
                        </Badge>
                    ) : null}

                    {processingLock ? (
                        <Badge variant="outline" className="text-xs">
                            Vidéo en cours
                        </Badge>
                    ) : null}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    data-cy="toggle-course-sidebar"
                    onClick={toggleSidebar}
                    aria-label={sidebarOpen ? "Masquer la sidebar" : "Afficher la sidebar"}
                >
                    {sidebarOpen ? (
                        <PanelRightClose className="h-4 w-4"/>
                    ) : (
                        <PanelRightOpen className="h-4 w-4"/>
                    )}
                </Button>
            </div>

            {/* Layout */}
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row">
                {/* MAIN (left) */}
                <main className="order-1 flex-1 min-w-0 lg:min-w-[33%]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {selectedContext.selectedChapterTitle ? (
                                    <>
                                        {selectedContext.selectedSectionTitle} — {selectedContext.selectedChapterTitle}
                                    </>
                                ) : (
                                    "Sélectionne un chapitre"
                                )}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            {selected ? (
                                <ChapterVideoPanel
                                    courseId={courseId}
                                    sectionId={selected.sectionId}
                                    chapterId={selected.chapter.id}
                                    chapterTitle={selected.chapter.title}
                                    video={selected.chapter.video ?? null}
                                    onRequestRefresh={async () => {
                                        await refreshCourse();
                                    }}
                                    readOnly={structureLocked}
                                    uploadDisabledReason={
                                        !selectedIsPersisted
                                            ? "L’upload vidéo est désactivé tant que le cours n’a pas été sauvegardé."
                                            : null
                                    }
                                />
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    Choisis un chapitre dans la sidebar pour gérer la vidéo.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </main>

                {/* SIDEBAR (right) */}
                <aside
                    className={cn(
                        "order-2 w-full lg:w-[420px] lg:flex-shrink-0",
                        sidebarOpen ? "block" : "hidden"
                    )}
                >
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-base">Structure du cours</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <CourseStructureSidebar
                                courseId={courseId}
                                sections={sections}
                                selectedChapterId={selectedChapterId}
                                onSelectChapter={handleSelectChapter}
                                structureLocked={structureLocked}
                                moveSection={moveSection}
                                moveChapter={moveChapter}
                                canMoveSectionUp={canMoveSectionUp}
                                canMoveSectionDown={canMoveSectionDown}
                                canMoveChapterUp={canMoveChapterUp}
                                canMoveChapterDown={canMoveChapterDown}
                                onAddSection={handleAddSection}
                                onAddChapter={handleAddChapter}
                                onRenameSection={handleRenameSection}
                                onDeleteSection={handleDeleteSection}
                                onRenameChapter={handleRenameChapter}
                                onDeleteChapter={handleDeleteChapter}
                            />
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
