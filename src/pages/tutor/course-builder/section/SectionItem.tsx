import {ReactNode, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion.tsx";
import {MoveButton} from "@/components/MoveButton.tsx";
import {ArrowDown, ArrowUp, Pencil, Trash2} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {cn} from "@/lib/utils.ts";

import type {SectionResponse} from "@/layout/tutor";

type Props = {
    section: SectionResponse;

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
    const {t} = useTranslation();
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

    const chaptersCount = section.chapters?.length ?? 0;
    const chaptersLabel = chaptersCount === 0
        ? t("common.no_chapters")
        : chaptersCount === 1
            ? `1 ${t("tutor.chapter_singular")}`
            : `${chaptersCount} ${t("tutor.chapter_plural")}`;

    return (
        <AccordionItem
            value={section.id}
            className={cn("w-full max-w-full overflow-hidden rounded-xl border", "bg-muted/25")}
        >
            <div className="w-full max-w-full px-3 py-3">
                <div className="flex w-full items-center justify-end gap-1 pb-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={actionsLocked}
                        aria-label={t("tutor.rename_section")}
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
                        aria-label={t("tutor.delete_section")}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteSection(section.id);
                        }}
                    >
                        <Trash2 className="h-4 w-4"/>
                    </Button>

                    <MoveButton
                        label={t("tutor.move_section_up")}
                        disabled={readOnly || !canMoveUp || isEditing}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMoveUp();
                        }}
                        icon={<ArrowUp className="h-4 w-4"/>}
                    />

                    <MoveButton
                        label={t("tutor.move_section_down")}
                        disabled={readOnly || !canMoveDown || isEditing}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onMoveDown();
                        }}
                        icon={<ArrowDown className="h-4 w-4"/>}
                    />
                </div>

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
                                aria-label={t("tutor.rename_section")}
                                disabled={readOnly}
                            />
                        ) : (
                            <>
                                <div className="truncate font-semibold">
                                    {index + 1}. {section.title || t("tutor.untitled_section")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {chaptersLabel}
                                </div>
                            </>
                        )}
                    </div>
                </AccordionTrigger>
            </div>

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
                        + {t("tutor.add_chapter")}
                    </Button>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
