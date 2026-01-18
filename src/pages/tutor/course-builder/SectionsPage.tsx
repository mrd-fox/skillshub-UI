import {useCourseBuilder} from "@/layout/tutor/CourseBuilderLayout.tsx";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {ChapterVideoPanel} from "@/components/courseBuilder/ChapterVideoPanel.tsx";
import {useCoursePolling} from "@/hooks/useCoursePolling.ts";

type ChapterLike = {
    id: string;
    title: string;
    video?: any | null;
};

type SectionLike = {
    id: string;
    title: string;
    chapters: ChapterLike[];
};

export default function SectionsPage() {
    const {courseId, course, refreshCourse} = useCourseBuilder();

    // Auto-poll while at least one video is PROCESSING
    useCoursePolling(course, refreshCourse, {enabled: true, intervalMs: 3000});

    if (!course) {
        return (
            <div className="space-y-3">
                <h1 className="text-2xl font-bold">Sections & chapitres</h1>
                <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Aucun cours chargé.
                </div>
            </div>
        );
    }

    const sections = (course.sections ?? []) as unknown as SectionLike[];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Sections & chapitres</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Gère les vidéos au niveau des chapitres (INIT → upload Vimeo → CONFIRM → PROCESSING → READY →
                    IN_REVIEW).
                </p>
            </div>

            {sections.length === 0 ? (
                <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Ce cours ne contient aucune section pour l’instant.
                </div>
            ) : (
                <Accordion type="multiple" className="space-y-3">
                    {sections.map((section, sectionIndex) => {
                        const chapterCount = section.chapters?.length ?? 0;

                        return (
                            <AccordionItem key={section.id} value={`section-${section.id}`}
                                           className="rounded-xl border bg-white px-4">
                                <AccordionTrigger className="no-underline hover:no-underline">
                                    <div className="flex w-full items-center justify-between pr-2">
                                        <div className="min-w-0">
                                            <div className="truncate text-base font-semibold">
                                                {sectionIndex + 1}. {section.title || "Section sans titre"}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {chapterCount} chapitre{chapterCount > 1 ? "s" : ""}
                                            </div>
                                        </div>
                                    </div>
                                </AccordionTrigger>

                                <AccordionContent className="pb-5">
                                    {chapterCount === 0 ? (
                                        <div
                                            className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                                            Aucun chapitre dans cette section.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {section.chapters.map((chapter, chapterIndex) => {
                                                return (
                                                    <Card key={chapter.id} className="border-muted/60">
                                                        <CardHeader className="pb-3">
                                                            <CardTitle className="text-base">
                                                                Chapitre {chapterIndex + 1} — {chapter.title || "Sans titre"}
                                                            </CardTitle>
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
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            )}
        </div>
    );
}