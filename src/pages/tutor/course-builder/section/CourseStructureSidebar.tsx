import {Accordion} from "@/components/ui/accordion.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";

import SectionItem from "./SectionItem";
import ChapterItem from "@/pages/tutor/course-builder/section/chapter/ChapterItem.tsx";
import {ChapterResponse, SectionResponse} from "@/layout/tutor";

type Direction = "UP" | "DOWN";

type Props = {
    // Note: courseId is passed by caller (useful for future actions), keep it to avoid prop errors
    courseId: string;

    sections: SectionResponse[];
    selectedChapterId: string | null;

    onSelectChapter: (chapterId: string) => void;

    // Lock editing (WAITING_VALIDATION / PUBLISHED / video in progress)
    structureLocked: boolean;

    // Reorder actions (from useSectionsOrder)
    moveSection: (sectionIndex: number, direction: Direction) => void;
    moveChapter: (sectionIndex: number, chapterIndex: number, direction: Direction) => void;

    // Optional "can move" helpers (caller may pass them). Sidebar can ignore them safely.
    canMoveSectionUp?: (sectionIndex: number) => boolean;
    canMoveSectionDown?: (sectionIndex: number) => boolean;
    canMoveChapterUp?: (sectionIndex: number, chapterIndex: number) => boolean;
    canMoveChapterDown?: (sectionIndex: number, chapterIndex: number) => boolean;

    // Optional structure actions (rename/delete/add). If missing -> actions will be disabled safely.
    onRenameSection?: (sectionId: string, nextTitle: string) => void;
    onDeleteSection?: (sectionId: string) => void;

    onRenameChapter?: (chapterId: string, nextTitle: string) => void;
    onDeleteChapter?: (chapterId: string) => void;

    onAddChapter?: (sectionId: string) => void;
    onAddSection?: () => void;
};

function noop(): void {
    // Intentionally empty (safety handler)
}

export default function CourseStructureSidebar({
                                                   courseId,
                                                   sections,
                                                   selectedChapterId,
                                                   onSelectChapter,
                                                   structureLocked,
                                                   moveSection,
                                                   moveChapter,
                                                   onRenameSection,
                                                   onDeleteSection,
                                                   onRenameChapter,
                                                   onDeleteChapter,
                                                   onAddSection,
                                                   onAddChapter,
                                               }: Readonly<Props>) {
    // If the caller didn't provide add/rename/delete handlers, we must disable those actions
    // otherwise SectionItem / ChapterItem would call undefined -> runtime crash.
    const actionsAvailable =
        Boolean(onRenameSection) &&
        Boolean(onDeleteSection) &&
        Boolean(onRenameChapter) &&
        Boolean(onDeleteChapter) &&
        Boolean(onAddSection) &&
        Boolean(onAddChapter);

    const readOnly = structureLocked || !actionsAvailable;

    const safeRenameSection = onRenameSection ?? (() => noop());
    const safeDeleteSection = onDeleteSection ?? (() => noop());
    const safeRenameChapter = onRenameChapter ?? (() => noop());
    const safeDeleteChapter = onDeleteChapter ?? (() => noop());
    const safeAddSection = onAddSection ?? (() => noop());
    const safeAddChapter = onAddChapter ?? (() => noop());

    return (
        <Card className="flex h-full flex-col border-muted/60" data-cy={`course-structure-${courseId}`}>
            <CardHeader className="pb-3">
                {/* Header kept identical on purpose */}
            </CardHeader>

            <CardContent className="flex flex-1 flex-col p-0">
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
                    <Accordion type="multiple" className="space-y-3">
                        {sections.map((section: SectionResponse, sectionIndex: number) => (
                            <SectionItem
                                key={section.id}
                                section={section}
                                index={sectionIndex}
                                total={sections.length}
                                readOnly={readOnly}
                                onMoveUp={() => moveSection(sectionIndex, "UP")}
                                onMoveDown={() => moveSection(sectionIndex, "DOWN")}
                                onRenameSection={safeRenameSection}
                                onDeleteSection={safeDeleteSection}
                                onAddChapter={safeAddChapter}
                            >
                                {(section.chapters ?? []).length === 0 ? (
                                    <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                                        Aucun chapitre dans cette section.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {(section.chapters ?? []).map((chapter: ChapterResponse, chapterIndex: number) => (
                                            <ChapterItem
                                                key={chapter.id}
                                                chapter={chapter}
                                                index={chapterIndex}
                                                total={(section.chapters ?? []).length}
                                                isSelected={selectedChapterId === chapter.id}
                                                readOnly={readOnly}
                                                onSelect={onSelectChapter}
                                                onMoveUp={() => moveChapter(sectionIndex, chapterIndex, "UP")}
                                                onMoveDown={() => moveChapter(sectionIndex, chapterIndex, "DOWN")}
                                                onRenameChapter={safeRenameChapter}
                                                onDeleteChapter={safeDeleteChapter}
                                            />
                                        ))}
                                    </div>
                                )}
                            </SectionItem>
                        ))}
                    </Accordion>
                </div>

                <div className="border-t bg-background px-6 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        data-cy="add-section"
                        className="w-full border-dashed text-muted-foreground hover:text-primary"
                        disabled={readOnly}
                        onClick={safeAddSection}
                    >
                        + Ajouter une section
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}