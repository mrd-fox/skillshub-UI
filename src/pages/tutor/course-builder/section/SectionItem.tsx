import React, {useEffect, useRef, useState} from "react";
import {AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion.tsx";
import {MoveButton} from "@/components/MoveButton.tsx";
import {ArrowDown, ArrowUp, Pencil, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {cn} from "@/lib/utils.ts";

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

    // NEW: UI-only actions (no API here)
    onRenameSection: (sectionId: string, nextTitle: string) => void;
    onDeleteSection: (sectionId: string) => void;

    children: React.ReactNode;
};

export default function SectionItem({
                                        section,
                                        index,
                                        total,
                                        onMoveUp,
                                        onMoveDown,
                                        onRenameSection,
                                        onDeleteSection,
                                        children,
                                    }: Readonly<Props>) {
    const canMoveUp = index > 0;
    const canMoveDown = index < total - 1;

    const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
    const [draftTitle, setDraftTitle] = useState<string>(section.title ?? "");
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        // Sync draft when section changes (reorder, refresh, etc.)
        setDraftTitle(section.title ?? "");
        setIsEditingTitle(false);
    }, [section.id, section.title]);

    useEffect(() => {
        if (!isEditingTitle) {
            return;
        }
        // Focus the input when entering edit mode
        const id = window.setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);

        return () => {
            window.clearTimeout(id);
        };
    }, [isEditingTitle]);

    function startEdit(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsEditingTitle(true);
    }

    function cancelEdit() {
        setDraftTitle(section.title ?? "");
        setIsEditingTitle(false);
    }

    function commitEdit() {
        const trimmed = (draftTitle ?? "").trim();

        // Rule: title cannot be empty -> rollback
        if (trimmed.length === 0) {
            cancelEdit();
            return;
        }

        // No-op if unchanged
        if (trimmed === (section.title ?? "").trim()) {
            setIsEditingTitle(false);
            return;
        }

        onRenameSection(section.id, trimmed);
        setIsEditingTitle(false);
    }

    function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();

        // Deliberately no modal here for now.
        // If you want confirmation, we will add it at parent level (consistent UX).
        onDeleteSection(section.id);
    }

    return (
        <AccordionItem value={section.id} className="rounded-xl border bg-card">
            {/* HEADER */}
            <div className="flex items-center justify-between gap-3 px-4 py-4">
                {/* Trigger ONLY (renders a <button>) */}
                <AccordionTrigger className="flex-1 py-0 no-underline hover:no-underline">
                    <div className="min-w-0 text-left">
                        {isEditingTitle ? (
                            <Input
                                ref={inputRef}
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        commitEdit();
                                    } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        cancelEdit();
                                    } else {
                                        // no-op
                                    }
                                }}
                                onBlur={() => commitEdit()}
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

                {/* ACTIONS — OUTSIDE trigger (avoid nested buttons) */}
                <div className="flex shrink-0 items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("h-9 w-9 rounded-lg", isEditingTitle ? "opacity-50" : "")}
                        onClick={startEdit}
                        disabled={isEditingTitle}
                        aria-label="Edit section title"
                        title="Renommer"
                    >
                        <Pencil className="h-4 w-4"/>
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg text-destructive hover:text-destructive"
                        onClick={handleDelete}
                        aria-label="Delete section"
                        title="Supprimer"
                    >
                        <Trash2 className="h-4 w-4"/>
                    </Button>

                    <MoveButton
                        label="Monter la section"
                        disabled={!canMoveUp || isEditingTitle}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMoveUp();
                        }}
                        icon={<ArrowUp className="h-4 w-4"/>}
                    />
                    <MoveButton
                        label="Descendre la section"
                        disabled={!canMoveDown || isEditingTitle}
                        onClick={(e) => {
                            e.preventDefault();
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
