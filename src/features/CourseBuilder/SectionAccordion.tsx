import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { ChapterItem } from "./ChapterItem";
import { useState } from "react";

type Chapter = { id: number };
type Section = { id: number; chapters: Chapter[] };

export function SectionAccordion() {
    const [sections, setSections] = useState<Section[]>([]);

    const addSection = () => {
        const newSection: Section = {
            id: Date.now(),
            chapters: [],
        };
        setSections((prev) => [...prev, newSection]);
    };

    const removeSection = (sectionId: number) => {
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
    };

    const addChapter = (sectionId: number) => {
        setSections((prev) =>
            prev.map((section) =>
                section.id === sectionId
                    ? {
                        ...section,
                        chapters: [
                            ...section.chapters,
                            { id: Date.now() + Math.random() },
                        ],
                    }
                    : section
            )
        );
    };

    const removeChapter = (sectionId: number, chapterId: number) => {
        setSections((prev) =>
            prev.map((section) =>
                section.id === sectionId
                    ? {
                        ...section,
                        chapters: section.chapters.filter((c) => c.id !== chapterId),
                    }
                    : section
            )
        );
    };

    return (
        <div className="space-y-4">
            <Accordion type="multiple" className="space-y-2">
                {sections.map((section, sectionIndex) => (
                    <AccordionItem
                        key={section.id}
                        value={`section-${section.id}`}
                        title={`Section ${sectionIndex + 1}`}
                    >
                        <div className="text-lg font-semibold mb-2">
                            Section {sectionIndex + 1}
                        </div>

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Chapitres</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSection(section.id)}
                                className="text-red-500 hover:text-red-600"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        {section.chapters.map((chapter, chapterIndex) => (
                            <div key={chapter.id} className="relative">
                                <ChapterItem number={chapterIndex + 1} />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeChapter(section.id, chapter.id)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-600"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}

                        <Button
                            variant="outline"
                            onClick={() => addChapter(section.id)}
                            className="mt-3"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Ajouter un chapitre
                        </Button>
                    </AccordionItem>
                ))}
            </Accordion>

            <Button variant="default" onClick={addSection}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter une section
            </Button>
        </div>
    );
}
