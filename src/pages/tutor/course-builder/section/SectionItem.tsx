import {ReactNode, useEffect, useRef, useState} from "react";
import {AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion.tsx";
import {MoveButton} from "@/components/MoveButton.tsx";
import {ArrowDown, ArrowUp, Pencil, Trash2} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";

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

    onRenameSection: (sectionId: string, nextTitle: string) => void;
    onDeleteSection: (sectionId: string) => void;

    onAddChapter: (sectionId: string) => void;

    children: ReactNode;
};

export default function SectionItem({
                                        section,
                                        index,
                                        total,
                                        onMoveUp,
                                        onMoveDown,
                                        onRenameSection,
                                        onDeleteSection,
                                        onAddChapter,
                                        children,
                                    }: Readonly<Props>) {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [draftTitle, setDraftTitle] = useState<string>(section.title ?? "");
    const inputRef = useRef<HTMLInputElement | null>(null);

    const canMoveUp = index > 0;
    const canMoveDown = index < total - 1;

    useEffect(() => {
        setDraftTitle(section.title ?? "");
        setIsEditing(false);
    }, [section.id, section.title]);

    useEffect(() => {
        if (isEditing) {
            requestAnimationFrame(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            });
        }
    }, [isEditing]);

    function commitRename() {
        const trimmed = (draftTitle ?? "").trim();
        if (trimmed.length === 0) {
            setDraftTitle(section.title ?? "");
            setIsEditing(false);
            return;
        }

        if (trimmed !== section.title) {
            onRenameSection(section.id, trimmed);
        }

        setIsEditing(false);
    }

    function cancelRename() {
        setDraftTitle(section.title ?? "");
        setIsEditing(false);
    }

    return (
        <AccordionItem
            value={section.id}
            className="w-full max-w-full overflow-hidden rounded-xl border bg-card"
        >
            {/* HEADER split in 2 rows to keep actions ALWAYS visible */}
            <div className="w-full max-w-full px-3 py-3">
                {/* Row 1: Trigger (button) only contains title + chevron */}
                <AccordionTrigger className="w-full min-w-0 py-0 no-underline hover:no-underline">
                    <div className="min-w-0 max-w-full text-left">
                        {isEditing ? (
                            <Input
                                ref={inputRef}
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        commitRename();
                                    } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelRename();
                                    }
                                }}
                                onBlur={commitRename}
                                className="h-9"
                                aria-label="Rename section"
                            />
                        ) : (
                            <>
                                <div className="truncate font-semibold">
                                    {index + 1}. {section.title || "Section sans titre"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {section.chapters.length} chapitre{section.chapters.length > 1 ? "s" : ""}
                                </div>
                            </>
                        )}
                    </div>
                </AccordionTrigger>

                {/* Row 2: Actions at the bottom of the section header */}
                <div className="mt-2 flex w-full items-center justify-end gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isEditing}
                        aria-label="Rename section"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                    >
                        <Pencil className="h-4 w-4"/>
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label="Delete section"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteSection(section.id);
                        }}
                    >
                        <Trash2 className="h-4 w-4"/>
                    </Button>

                    <MoveButton
                        label="Monter la section"
                        disabled={!canMoveUp || isEditing}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMoveUp();
                        }}
                        icon={<ArrowUp className="h-4 w-4"/>}
                    />

                    <MoveButton
                        label="Descendre la section"
                        disabled={!canMoveDown || isEditing}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMoveDown();
                        }}
                        icon={<ArrowDown className="h-4 w-4"/>}
                    />
                </div>
            </div>

            <AccordionContent className="space-y-3 px-3 pb-4">
                {children}

                <button
                    type="button"
                    className="w-full rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    onClick={() => onAddChapter(section.id)}
                >
                    + Ajouter un chapitre
                </button>
            </AccordionContent>
        </AccordionItem>
    );
}