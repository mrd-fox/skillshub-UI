import {Accordion} from "@/components/ui/accordion.tsx";
import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";

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

    // Add actions
    onAddChapter: (sectionId: string) => void;
    onAddSection: () => void;
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
                                                   onAddSection,
                                                   onAddChapter,
                                               }: Readonly<Props>) {
    return (
        <Card className="flex h-full flex-col border-muted/60">
            <CardHeader className="pb-3">
                {/* header identique */}
            </CardHeader>

            <CardContent className="flex flex-1 flex-col p-0">
                {/* Scrollable content */}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
                    <Accordion type="multiple" className="space-y-3">
                        {sections.map((section, sectionIndex) => (
                            <SectionItem
                                key={section.id}
                                section={section as any}
                                index={sectionIndex}
                                total={sections.length}
                                onMoveUp={() => onMoveSection(sectionIndex, "UP")}
                                onMoveDown={() => onMoveSection(sectionIndex, "DOWN")}
                                onRenameSection={onRenameSection}
                                onDeleteSection={onDeleteSection}
                                onAddChapter={onAddChapter}
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
                                                onMoveUp={() => onMoveChapter(sectionIndex, chapterIndex, "UP")}
                                                onMoveDown={() => onMoveChapter(sectionIndex, chapterIndex, "DOWN")}
                                                onRenameChapter={onRenameChapter}
                                                onDeleteChapter={onDeleteChapter}
                                            />
                                        ))}
                                    </div>
                                )}
                            </SectionItem>
                        ))}
                    </Accordion>
                </div>

                {/* Sticky footer actions (always visible) */}
                <div className="border-t bg-background px-6 py-3">
                    <button
                        type="button"
                        className="w-full rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        onClick={onAddSection}
                    >
                        + Ajouter une section
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}