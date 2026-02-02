import {Accordion, AccordionItem} from "@/components/ui/accordion.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Plus, Trash2} from "lucide-react";
import {useEffect, useState} from "react";
import {Input} from "@/components/ui/input.tsx";

type Chapter = { id: number; title: string; position: number };
type Section = { id: number; title: string; position: number; chapters: Chapter[] };

export function SectionAccordion({onChange}: { onChange: (sections: Section[]) => void }) {
    const [sections, setSections] = useState<Section[]>([]);

    // 🔁 sync vers le parent
    useEffect(() => {
        onChange(sections);
    }, [sections]);

    const addSection = () => {
        setSections(prev => [
            ...prev,
            {id: Date.now(), title: "", position: prev.length + 1, chapters: []},
        ]);
    };

    const removeSection = (id: number) => {
        setSections(prev => prev.filter(s => s.id !== id));
    };

    const updateSectionTitle = (id: number, title: string) => {
        setSections(prev =>
            prev.map(s => (s.id === id ? {...s, title} : s))
        );
    };

    const addChapter = (sectionId: number) => {
        setSections(prev =>
            prev.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        chapters: [
                            ...section.chapters,
                            {
                                id: Date.now(),
                                title: "",
                                position: section.chapters.length + 1,
                            },
                        ],
                    }
                    : section
            )
        );
    };

    const updateChapterTitle = (sectionId: number, chapterId: number, title: string) => {
        setSections(prev =>
            prev.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        chapters: section.chapters.map(ch =>
                            ch.id === chapterId ? {...ch, title} : ch
                        ),
                    }
                    : section
            )
        );
    };

    const removeChapter = (sectionId: number, chapterId: number) => {
        setSections(prev =>
            prev.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        chapters: section.chapters.filter(ch => ch.id !== chapterId),
                    }
                    : section
            )
        );
    };

    return (
        <div className="space-y-5">
            <Accordion type="multiple" className="space-y-3">
                {sections.map((section, i) => (
                    <AccordionItem key={section.id} value={`section-${section.id}`}>
                        {/* En-tête section */}
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Section {i + 1}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSection(section.id)}
                                className="!text-[#E33335] hover:!text-[#b02224]"
                            >
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        </div>

                        {/* Champ titre de section */}
                        <Input
                            placeholder={`Titre de la section ${i + 1}`}
                            value={section.title}
                            onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                            className="mb-4"
                        />

                        {/* Liste des chapitres */}
                        <div className="space-y-3">
                            {section.chapters.map((ch, j) => (
                                <div
                                    key={ch.id}
                                    className="flex items-center gap-3 bg-gray-50 border rounded-lg p-3"
                                >
                                    <span className="text-sm font-medium text-gray-700 w-24">
                                        Chapitre {j + 1}
                                    </span>
                                    <Input
                                        placeholder={`Titre du chapitre ${j + 1}`}
                                        value={ch.title}
                                        onChange={(e) =>
                                            updateChapterTitle(section.id, ch.id, e.target.value)
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeChapter(section.id, ch.id)}
                                        className="!text-[#E33335] hover:!text-[#b02224]"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Bouton ajouter chapitre */}
                        <Button
                            variant="secondary"
                            onClick={() => addChapter(section.id)}
                            className="mt-4 !bg-[#E6EDFF] !text-[#2A6AEE] hover:!bg-[#d6e3ff]"
                        >
                            <Plus className="w-4 h-4 mr-2"/> Ajouter un chapitre
                        </Button>
                    </AccordionItem>
                ))}
            </Accordion>

            {/* Bouton ajouter section */}
            <Button
                onClick={addSection}
                className="!bg-[#2A6AEE] text-white hover:!bg-[#1f57ca]"
            >
                <Plus className="w-4 h-4 mr-2"/> Ajouter une section
            </Button>
        </div>
    );
}