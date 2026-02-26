import type {ChapterResponse, SectionResponse} from "@/layout/tutor";

type Direction = "UP" | "DOWN";

export type UseSectionsOrderArgs = Readonly<{
    sections: SectionResponse[];
    setSections: (next: SectionResponse[]) => void;

    /**
     * Called when a structure change happens (reorder).
     * Typically marks the course "structureDirty".
     */
    onStructureChange: () => void;

    /**
     * When true, structure edits must be blocked.
     * The hook will no-op and canMove* will be false.
     */
    structureLocked: boolean;
}>;

type CanMoveFn = (index: number) => boolean;

export function useSectionsOrder(args: UseSectionsOrderArgs) {
    const {sections, setSections, onStructureChange, structureLocked} = args;

    const canMoveSectionUp: CanMoveFn = (index) => {
        if (structureLocked) {
            return false;
        }
        return index > 0;
    };

    const canMoveSectionDown: CanMoveFn = (index) => {
        if (structureLocked) {
            return false;
        }
        return index >= 0 && index < sections.length - 1;
    };

    const canMoveChapterUp = (sectionIndex: number, chapterIndex: number): boolean => {
        if (structureLocked) {
            return false;
        }

        const section = sections[sectionIndex];
        if (!section) {
            return false;
        }

        return chapterIndex > 0;
    };

    const canMoveChapterDown = (sectionIndex: number, chapterIndex: number): boolean => {
        if (structureLocked) {
            return false;
        }

        const section = sections[sectionIndex];
        if (!section) {
            return false;
        }

        return chapterIndex >= 0 && chapterIndex < (section.chapters?.length ?? 0) - 1;
    };

    function moveSection(index: number, direction: Direction): void {
        if (structureLocked) {
            return;
        }

        if (direction === "UP" && !canMoveSectionUp(index)) {
            return;
        }

        if (direction === "DOWN" && !canMoveSectionDown(index)) {
            return;
        }

        const targetIndex = direction === "UP" ? index - 1 : index + 1;
        const next = swap(sections, index, targetIndex);
        setSections(normalizeSections(next));
        onStructureChange();
    }

    function moveChapter(sectionIndex: number, chapterIndex: number, direction: Direction): void {
        if (structureLocked) {
            return;
        }

        const section = sections[sectionIndex];
        if (!section) {
            return;
        }

        const chapters = section.chapters ?? [];

        if (direction === "UP" && !canMoveChapterUp(sectionIndex, chapterIndex)) {
            return;
        }

        if (direction === "DOWN" && !canMoveChapterDown(sectionIndex, chapterIndex)) {
            return;
        }

        const targetIndex = direction === "UP" ? chapterIndex - 1 : chapterIndex + 1;
        const nextChapters = swap(chapters, chapterIndex, targetIndex);

        const nextSections = sections.map((s, i) => {
            if (i === sectionIndex) {
                return {...s, chapters: normalizeChapters(nextChapters)};
            }
            return s;
        });

        setSections(normalizeSections(nextSections));
        onStructureChange();
    }

    return {
        moveSection,
        moveChapter,
        canMoveSectionUp,
        canMoveSectionDown,
        canMoveChapterUp,
        canMoveChapterDown,
    };
}

function swap<T>(arr: T[], a: number, b: number): T[] {
    const copy = [...arr];
    [copy[a], copy[b]] = [copy[b], copy[a]];
    return copy;
}

function normalizeSections(sections: SectionResponse[]): SectionResponse[] {
    return sections.map((s, i) => {
        return {
            ...s,
            position: i + 1,
            chapters: normalizeChapters(s.chapters ?? []),
        };
    });
}

function normalizeChapters(chapters: ChapterResponse[]): ChapterResponse[] {
    return chapters.map((c, i) => {
        return {
            ...c,
            position: i + 1,
        };
    });
}
