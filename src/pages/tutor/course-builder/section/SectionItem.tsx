import {AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion.tsx";
import {MoveButton} from "@/components/MoveButton.tsx";
import {ArrowDown, ArrowUp} from "lucide-react";

type Props = {
    section: {
        id: string;
        title: string;
        chapters: { id: string }[];
    };
    index: number;
    total: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    children: React.ReactNode;
};

export default function SectionItem({
                                        section,
                                        index,
                                        total,
                                        onMoveUp,
                                        onMoveDown,
                                        children,
                                    }: Props) {
    const canMoveUp = index > 0;
    const canMoveDown = index < total - 1;

    return (
        <AccordionItem value={section.id} className="rounded-xl border bg-card">
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-4">
                {/* Trigger ONLY (renders a <button>) */}
                <AccordionTrigger className="flex-1 py-0 no-underline hover:no-underline">
                    <div className="text-left">
                        <div className="font-semibold">
                            {index + 1}. {section.title || "Section sans titre"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {section.chapters.length} chapitre
                            {section.chapters.length > 1 ? "s" : ""}
                        </div>
                    </div>
                </AccordionTrigger>

                {/* ACTIONS — OUTSIDE trigger */}
                <div className="flex gap-1">
                    <MoveButton
                        label="Monter la section"
                        disabled={!canMoveUp}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp();
                        }}
                        icon={<ArrowUp className="h-4 w-4"/>}
                    />
                    <MoveButton
                        label="Descendre la section"
                        disabled={!canMoveDown}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown();
                        }}
                        icon={<ArrowDown className="h-4 w-4"/>}
                    />
                </div>
            </div>

            <AccordionContent className="px-4 pb-5">
                {children}
            </AccordionContent>
        </AccordionItem>
    );
}