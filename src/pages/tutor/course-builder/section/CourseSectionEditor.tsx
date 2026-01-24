/**
 * CourseSectionsEditor
 * - Handles UI + client-side ordering (UP/DOWN)
 * - NO API calls here
 * - Persistence happens only via the global "Save course" button (outside)
 *
 * Accessibility:
 * - Icon buttons provide aria-label + tooltip
 * - Buttons are keyboard focusable and respect disabled state
 */
import {ChapterVideoPanel} from "@/components/courseBuilder/ChapterVideoPanel.tsx";
import {useCoursePolling} from "@/hooks/useCoursePolling.ts";
import {useMemo} from "react";
import {Badge} from "@/components/ui/badge.tsx";
import {Separator} from "@radix-ui/react-dropdown-menu";
import {Accordion} from "@/components/ui/accordion.tsx";
import {ArrowDown, ArrowUp} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {MoveButton} from "@/components/MoveButton.tsx";
import {useSectionsOrder} from "@/pages/tutor/course-builder/section/useSectionsOrder.ts";
import SectionItem from "./SectionItem";

/* ========= Types (local feature scope) ========= */

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
    setCourse: (next: CourseLike) => void;
    refreshCourse: () => Promise<void>;
};

export default function CourseSectionsEditor(props: Props) {
    const {courseId, course, setCourse, refreshCourse} = props;

    // Keeps video statuses fresh while processing (backend polling updates)
    useCoursePolling(course as any, refreshCourse, {enabled: true, intervalMs: 3000});

    const sectionsSorted = useMemo<SectionLike[]>(() => {
        const raw = [...(course.sections ?? [])];

        // Stable ordering: backend can serialize Sets in unpredictable order
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
        setCourse({
            ...course,
            sections: nextSections,
        });
    });

    return (

        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Sections & chapitres</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Réorganise les sections et chapitres. Les changements sont enregistrés uniquement via le
                            bouton global <strong>Save course</strong>.
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
                    </div>
                </div>

                <Separator/>
            </div>

            {/* Content */}
            {sectionsSorted.length === 0 ? (
                <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Ce cours ne contient aucune section pour l’instant.
                </div>
            ) : (
                <Accordion type="multiple" className="space-y-3">
                    {sectionsSorted.map((section, sectionIndex) => {
                        const total = sectionsSorted.length;

                        return (
                            <SectionItem
                                key={section.id}
                                section={section as any}
                                index={sectionIndex}
                                total={total}
                                onMoveUp={() => moveSection(sectionIndex, "UP")}
                                onMoveDown={() => moveSection(sectionIndex, "DOWN")}
                            >
                                {section.chapters.length === 0 ? (
                                    <div
                                        className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                                        Aucun chapitre dans cette section.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {section.chapters.map((chapter, chapterIndex) => {
                                            const chapterUp = chapterIndex > 0;
                                            const chapterDown = chapterIndex < section.chapters.length - 1;

                                            return (
                                                <Card key={chapter.id} className="border-muted/60">
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <CardTitle className="text-base">
                                                                Chapitre {chapterIndex + 1} —{" "}
                                                                {chapter.title || "Sans titre"}
                                                            </CardTitle>

                                                            <div className="flex items-center gap-1">
                                                                <MoveButton
                                                                    label="Déplacer le chapitre vers le haut"
                                                                    disabled={!chapterUp}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        moveChapter(sectionIndex, chapterIndex, "UP");
                                                                    }}
                                                                    icon={<ArrowUp className="h-4 w-4"/>}
                                                                />
                                                                <MoveButton
                                                                    label="Déplacer le chapitre vers le bas"
                                                                    disabled={!chapterDown}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        moveChapter(
                                                                            sectionIndex,
                                                                            chapterIndex,
                                                                            "DOWN"
                                                                        );
                                                                    }}
                                                                    icon={<ArrowDown className="h-4 w-4"/>}
                                                                />
                                                            </div>
                                                        </div>
                                                    </CardHeader>

                                                    <CardContent className="space-y-4">
                                                        <ChapterVideoPanel
                                                            courseId={courseId}
                                                            sectionId={section.id}
                                                            chapterId={chapter.id}
                                                            chapterTitle={chapter.title}
                                                            video={chapter.video ?? null}
                                                            onRefresh={refreshCourse}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </SectionItem>
                        );
                    })}
                </Accordion>
            )}
        </div>

    );
}

function countChapters(sections: SectionLike[]): number {
    return sections.reduce((acc, s) => acc + (s.chapters?.length ?? 0), 0);
}