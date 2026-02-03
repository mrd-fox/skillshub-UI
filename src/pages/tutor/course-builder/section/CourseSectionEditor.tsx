/**
 * CourseSectionsEditor
 * - Handles UI + client-side ordering (UP/DOWN)
 * - NO API calls here
 * - Persistence happens only via the global "Save course" button (outside)
 *
 * Updated:
 * - Central viewer (single ChapterVideoPanel) driven by selectedChapterId from CourseBuilderLayout context
 * - Right sidebar delegated to CourseStructureSidebar
 * - Polling enabled ONLY when at least one video is PROCESSING
 * - Inline rename/delete section + chapter handled at parent level (state only)
 */
import {Dispatch, SetStateAction, useMemo, useState} from "react";
import {PanelRightClose, PanelRightOpen} from "lucide-react";

import ChapterVideoPanel from "@/components/courseBuilder/ChapterVideoPanel.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {cn} from "@/lib/utils.ts";

import {useCoursePolling} from "@/hooks/useCoursePolling.ts";
import {useCourseBuilder} from "@/layout/tutor/CourseBuilderLayout.tsx";
import {useSectionsOrder} from "@/pages/tutor/course-builder/section/useSectionsOrder.ts";

import CourseStructureSidebar from "./CourseStructureSidebar";

export type ChapterLike = {
    id: string;
    title: string;
    position?: number | null;
    video?: any | null;
};

export type SectionLike = {
    id: string;
    title: string;
    position?: number | null;
    chapters: ChapterLike[];
};

export type CourseLike = {
    id: string;
    sections: SectionLike[];
};

type Props = {
    courseId: string;
    course: CourseLike;
    setCourse: Dispatch<SetStateAction<CourseLike>>;
    refreshCourse: () => Promise<void>;
};

function hasProcessingVideo(course: CourseLike): boolean {
    const sections = course.sections ?? [];

    for (const section of sections) {
        const chapters = section.chapters ?? [];
        for (const chapter of chapters) {
            const status = chapter.video?.status ?? null;
            if (status === "PROCESSING") {
                return true;
            }
        }
    }

    return false;
}

export default function CourseSectionsEditor({
                                                 courseId,
                                                 course,
                                                 setCourse,
                                                 refreshCourse,
                                             }: Readonly<Props>) {
    const {selectedChapterId, setSelectedChapterId} = useCourseBuilder();
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

    // Enable polling ONLY when at least one video is PROCESSING.
    const shouldPoll = useMemo(() => hasProcessingVideo(course), [course]);
    useCoursePolling(course as any, refreshCourse, {enabled: shouldPoll, intervalMs: 3000});

    const sectionsSorted = useMemo<SectionLike[]>(() => {
        const raw = [...(course.sections ?? [])];
        return raw
            .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER))
            .map((section) => ({
                ...section,
                chapters: [...(section.chapters ?? [])].sort(
                    (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
                ),
            }));
    }, [course.sections]);

    const {moveSection, moveChapter} = useSectionsOrder(sectionsSorted, (nextSections) => {
        setCourse((prev) => ({
            ...prev,
            sections: nextSections,
        }));
    });

    const selected = useMemo(() => {
        if (!selectedChapterId) {
            return null;
        }

        for (const section of sectionsSorted) {
            for (const chapter of section.chapters) {
                if (chapter.id === selectedChapterId) {
                    return {section, chapter};
                }
            }
        }
        return null;
    }, [sectionsSorted, selectedChapterId]);

    function handleRenameSection(sectionId: string, nextTitle: string) {
        const normalized = (nextTitle ?? "").trim();
        if (normalized.length === 0) {
            return;
        }

        setCourse((prev) => {
            const nextSections = (prev.sections ?? []).map((s) => {
                if (s.id !== sectionId) {
                    return s;
                }
                return {
                    ...s,
                    title: normalized,
                };
            });

            return {
                ...prev,
                sections: nextSections,
            };
        });
    }

    function handleDeleteSection(sectionId: string) {
        // Decide selection reset outside setCourse (no side-effects in state setter)
        const deleted = (course.sections ?? []).find((s) => s.id === sectionId);
        const shouldResetSelection =
            Boolean(deleted) &&
            Boolean(selectedChapterId) &&
            (deleted?.chapters ?? []).some((c) => c.id === selectedChapterId);

        setCourse((prev) => {
            const existing = prev.sections ?? [];
            const nextSections = existing.filter((s) => s.id !== sectionId);

            return {
                ...prev,
                sections: nextSections,
            };
        });

        if (shouldResetSelection) {
            setSelectedChapterId(null);
        }
    }

    function handleRenameChapter(chapterId: string, nextTitle: string) {
        const normalized = (nextTitle ?? "").trim();
        if (normalized.length === 0) {
            return;
        }

        setCourse((prev) => {
            const nextSections = (prev.sections ?? []).map((s) => ({
                ...s,
                chapters: (s.chapters ?? []).map((c) => {
                    if (c.id !== chapterId) {
                        return c;
                    }
                    return {
                        ...c,
                        title: normalized,
                    };
                }),
            }));

            return {
                ...prev,
                sections: nextSections,
            };
        });
    }

    function handleDeleteChapter(chapterId: string) {
        if (selectedChapterId === chapterId) {
            setSelectedChapterId(null);
        }

        setCourse((prev) => {
            const nextSections = (prev.sections ?? []).map((s) => ({
                ...s,
                chapters: (s.chapters ?? []).filter((c) => c.id !== chapterId),
            }));

            return {
                ...prev,
                sections: nextSections,
            };
        });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Sections & chapitres</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Navigation + réorganisation. Les changements sont enregistrés uniquement via{" "}
                            <strong>Save course</strong>.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                            {sectionsSorted.length} section{sectionsSorted.length > 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                            {countChapters(sectionsSorted)} chapitre
                            {countChapters(sectionsSorted) > 1 ? "s" : ""}
                        </Badge>

                        <Button variant="outline" size="sm" onClick={() => setIsSidebarOpen((v) => !v)}>
                            {isSidebarOpen ? <PanelRightClose className="h-4 w-4"/> :
                                <PanelRightOpen className="h-4 w-4"/>}
                        </Button>
                    </div>
                </div>

                <div className="h-px w-full bg-border"/>
            </div>

            {sectionsSorted.length === 0 ? (
                <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Ce cours ne contient aucune section.
                </div>
            ) : (
                <div
                    className={cn("grid gap-6", isSidebarOpen ? "grid-cols-1 lg:grid-cols-[1fr_380px]" : "grid-cols-1")}>
                    {/* MAIN VIEWER */}
                    <Card className="border-muted/60">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Viewer</CardTitle>
                        </CardHeader>

                        <CardContent>
                            {!selected ? (
                                <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                                    Aucun chapitre sélectionné.
                                </div>
                            ) : (
                                <ChapterVideoPanel
                                    courseId={courseId}
                                    sectionId={selected.section.id}
                                    chapterId={selected.chapter.id}
                                    video={selected.chapter.video ?? null}
                                    onRequestRefresh={refreshCourse}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* RIGHT SIDEBAR */}
                    {isSidebarOpen ? (
                        <CourseStructureSidebar
                            sections={sectionsSorted}
                            selectedChapterId={selectedChapterId}
                            onSelectChapter={setSelectedChapterId}
                            onMoveSection={moveSection}
                            onMoveChapter={moveChapter}
                            onRenameSection={handleRenameSection}
                            onDeleteSection={handleDeleteSection}
                            onRenameChapter={handleRenameChapter}
                            onDeleteChapter={handleDeleteChapter}
                        />
                    ) : null}
                </div>
            )}
        </div>
    );
}

function countChapters(sections: SectionLike[]): number {
    return sections.reduce((acc, s) => acc + (s.chapters?.length ?? 0), 0);
}
