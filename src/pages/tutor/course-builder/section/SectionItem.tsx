import {ReactNode, useEffect, useRef, useState} from "react";
import {AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion.tsx";
import {MoveButton} from "@/components/MoveButton.tsx";
import {ArrowDown, ArrowUp, Pencil, Trash2} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {cn} from "@/lib/utils.ts";

type Props = {
    section: {
        id: string;
        title: string;
        chapters: { id: string }[];
    };
    index: number;
    total: number;

    readOnly: boolean;

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
                                        readOnly,
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

    const actionsLocked = readOnly || isEditing;

    useEffect(() => {
        setDraftTitle(section.title ?? "");
        setIsEditing(false);
    }, [section.id, section.title]);

    useEffect(() => {
        if (readOnly) {
            setIsEditing(false);
        }
    }, [readOnly]);

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

        if (readOnly) {
            setDraftTitle(section.title ?? "");
            setIsEditing(false);
            return;
        }

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
            className={cn(
                "w-full max-w-full overflow-hidden rounded-xl border",
                "bg-muted/25"
            )}
        >
            {/* HEADER: tools ABOVE title + chevron */}
            <div className="w-full max-w-full px-3 py-3">
                {/* Row 1: Tools */}
                <div className="flex w-full items-center justify-end gap-1 pb-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={actionsLocked}
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
                        data-cy="delete-section"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={readOnly}
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
                        disabled={readOnly || !canMoveUp || isEditing}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMoveUp();
                        }}
                        icon={<ArrowUp className="h-4 w-4"/>}
                    />

                    <MoveButton
                        label="Descendre la section"
                        disabled={readOnly || !canMoveDown || isEditing}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMoveDown();
                        }}
                        icon={<ArrowDown className="h-4 w-4"/>}
                    />
                </div>

                {/* Row 2: Title + chevron */}
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
                                className="h-9 bg-background"
                                aria-label="Rename section"
                                disabled={readOnly}
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
            </div>

            {/* CONTENT */}
            <AccordionContent className="px-3 pb-4">
                <div className="space-y-3 rounded-lg border bg-background p-3">
                    {children}

                    <Button
                        type="button"
                        variant="outline"
                        data-cy="add-chapter"
                        className="w-full border-dashed text-muted-foreground hover:text-primary"
                        disabled={readOnly}
                        onClick={() => onAddChapter(section.id)}
                    >
                        + Ajouter un chapitre
                    </Button>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
