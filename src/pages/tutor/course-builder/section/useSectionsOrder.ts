import {ChapterLike, SectionLike} from "@/pages/tutor/course-builder/section/CourseSectionEditor.tsx";

export function useSectionsOrder(
    sections: SectionLike[],
    setSections: (next: SectionLike[]) => void
) {
    function moveSection(index: number, direction: "UP" | "DOWN") {
        if (direction === "UP" && index === 0) return;
        if (direction === "DOWN" && index === sections.length - 1) return;

        const next = swap(sections, index, direction === "UP" ? index - 1 : index + 1);
        setSections(normalizeSections(next));
    }

    function moveChapter(
        sectionIndex: number,
        chapterIndex: number,
        direction: "UP" | "DOWN"
    ) {
        const section = sections[sectionIndex];
        if (!section) return;

        const chapters = section.chapters;
        if (direction === "UP" && chapterIndex === 0) return;
        if (direction === "DOWN" && chapterIndex === chapters.length - 1) return;

        const nextChapters = swap(
            chapters,
            chapterIndex,
            direction === "UP" ? chapterIndex - 1 : chapterIndex + 1
        );

        const nextSections = sections.map((s, i) =>
            i === sectionIndex
                ? {...s, chapters: normalizeChapters(nextChapters)}
                : s
        );

        setSections(normalizeSections(nextSections));
    }

    return {moveSection, moveChapter};
}

function swap<T>(arr: T[], a: number, b: number): T[] {
    const copy = [...arr];
    [copy[a], copy[b]] = [copy[b], copy[a]];
    return copy;
}

function normalizeSections(sections: SectionLike[]): SectionLike[] {
    return sections.map((s, i) => ({
        ...s,
        position: i + 1,
        chapters: normalizeChapters(s.chapters),
    }));
}

function normalizeChapters(chapters: ChapterLike[]): ChapterLike[] {
    return chapters.map((c, i) => ({...c, position: i + 1}));
}