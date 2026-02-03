import {useMemo} from "react";
import {Accordion} from "@/components/ui/accordion.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";

import SectionItem from "./SectionItem";
import ChapterItem from "@/pages/tutor/course-builder/section/chapter/ChapterItem.tsx";

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

type Props = {
    sections: SectionLike[];
    selectedChapterId: string | null;

    onSelectChapter: (chapterId: string) => void;

    onMoveSection: (sectionIndex: number, direction: "UP" | "DOWN") => void;
    onMoveChapter: (sectionIndex: number, chapterIndex: number, direction: "UP" | "DOWN") => void;

    // Section actions
    onRenameSection: (sectionId: string, nextTitle: string) => void;
    onDeleteSection: (sectionId: string) => void;

    // Chapter actions
    onRenameChapter: (chapterId: string, nextTitle: string) => void;
    onDeleteChapter: (chapterId: string) => void;
};

export default function CourseStructureSidebar({
                                                   sections,
                                                   selectedChapterId,
                                                   onSelectChapter,
                                                   onMoveSection,
                                                   onMoveChapter,
                                                   onRenameSection,
                                                   onDeleteSection,
                                                   onRenameChapter,
                                                   onDeleteChapter,
                                               }: Readonly<Props>) {
    const totalChapters = useMemo(() => {
        return sections.reduce((acc, s) => acc + (s.chapters?.length ?? 0), 0);
    }, [sections]);

    return (
        <Card className="border-muted/60">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-base">Contenu du cours</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Sections → chapitres. Clique un chapitre pour l’afficher.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                            {sections.length} section{sections.length > 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                            {totalChapters} chapitre{totalChapters > 1 ? "s" : ""}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <Accordion type="multiple" className="space-y-3">
                    {sections.map((section, sectionIndex) => {
                        const totalSections = sections.length;

                        return (
                            <SectionItem
                                key={section.id}
                                section={section as any}
                                index={sectionIndex}
                                total={totalSections}
                                onMoveUp={() => onMoveSection(sectionIndex, "UP")}
                                onMoveDown={() => onMoveSection(sectionIndex, "DOWN")}
                                onRenameSection={onRenameSection}
                                onDeleteSection={onDeleteSection}
                            >
                                {section.chapters.length === 0 ? (
                                    <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                                        Aucun chapitre dans cette section.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {section.chapters.map((chapter, chapterIndex) => (
                                            <ChapterItem
                                                key={chapter.id}
                                                chapter={chapter}
                                                index={chapterIndex}
                                                total={section.chapters.length}
                                                isSelected={selectedChapterId === chapter.id}
                                                onSelect={onSelectChapter}
                                                onMoveUp={() =>
                                                    onMoveChapter(sectionIndex, chapterIndex, "UP")
                                                }
                                                onMoveDown={() =>
                                                    onMoveChapter(sectionIndex, chapterIndex, "DOWN")
                                                }
                                                onRenameChapter={onRenameChapter}
                                                onDeleteChapter={onDeleteChapter}
                                            />
                                        ))}
                                    </div>
                                )}
                            </SectionItem>
                        );
                    })}
                </Accordion>
            </CardContent>
        </Card>
    );
}