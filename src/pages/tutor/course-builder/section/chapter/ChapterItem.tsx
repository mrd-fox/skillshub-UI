import {useEffect, useRef, useState} from "react";
import {ArrowDown, ArrowUp, Pencil, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {MoveButton} from "@/components/MoveButton.tsx";
import {cn} from "@/lib/utils.ts";

type Props = {
    chapter: {
        id: string;
        title: string;
        video?: any | null;
    };
    index: number;
    total: number;
    isSelected: boolean;

    onSelect: (chapterId: string) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;

    onRenameChapter: (chapterId: string, nextTitle: string) => void;
    onDeleteChapter: (chapterId: string) => void;
};

export default function ChapterItem({
                                        chapter,
                                        index,
                                        total,
                                        isSelected,
                                        onSelect,
                                        onMoveUp,
                                        onMoveDown,
                                        onRenameChapter,
                                        onDeleteChapter,
                                    }: Readonly<Props>) {
    const [isEditing, setIsEditing] = useState(false);
    const [draftTitle, setDraftTitle] = useState(chapter.title ?? "");
    const inputRef = useRef<HTMLInputElement | null>(null);

    const canMoveUp = index > 0;
    const canMoveDown = index < total - 1;

    useEffect(() => {
        setDraftTitle(chapter.title ?? "");
        setIsEditing(false);
    }, [chapter.id, chapter.title]);

    useEffect(() => {
        if (isEditing) {
            requestAnimationFrame(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            });
        }
    }, [isEditing]);

    function commit() {
        const trimmed = draftTitle.trim();
        if (trimmed.length === 0) {
            setDraftTitle(chapter.title ?? "");
            setIsEditing(false);
            return;
        }
        if (trimmed !== chapter.title) {
            onRenameChapter(chapter.id, trimmed);
        }
        setIsEditing(false);
    }

    function cancel() {
        setDraftTitle(chapter.title ?? "");
        setIsEditing(false);
    }

    return (
        <div
            className={cn(
                "grid grid-cols-[1fr_auto] items-start gap-2 rounded-lg border p-2",
                isSelected
                    ? "border-primary/50 bg-primary/5"
                    : "border-muted/60 hover:bg-muted/30"
            )}
        >
            {/* Selection / title */}
            <button
                type="button"
                className={cn(
                    "min-w-0 rounded-md p-1 text-left transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-primary/40"
                )}
                onClick={() => onSelect(chapter.id)}
            >
                {isEditing ? (
                    <Input
                        ref={inputRef}
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                commit();
                            } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancel();
                            }
                        }}
                        onBlur={commit}
                        className="h-9"
                        aria-label="Rename chapter"
                    />
                ) : (
                    <div className="min-w-0">
                        <div className="text-sm font-semibold">
                            Chapitre {index + 1} —{" "}
                            <span className="font-semibold">
                                {chapter.title || "Sans titre"}
                            </span>
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                            Status vidéo :{" "}
                            <span className="font-medium text-foreground">
                                {chapter.video?.status ?? "—"}
                            </span>
                        </div>
                    </div>
                )}
            </button>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isEditing}
                    aria-label="Rename chapter"
                    onClick={() => setIsEditing(true)}
                >
                    <Pencil className="h-4 w-4"/>
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    aria-label="Delete chapter"
                    onClick={() => onDeleteChapter(chapter.id)}
                >
                    <Trash2 className="h-4 w-4"/>
                </Button>

                <MoveButton
                    label="Déplacer le chapitre vers le haut"
                    disabled={!canMoveUp || isEditing}
                    onClick={onMoveUp}
                    icon={<ArrowUp className="h-4 w-4"/>}
                />
                <MoveButton
                    label="Déplacer le chapitre vers le bas"
                    disabled={!canMoveDown || isEditing}
                    onClick={onMoveDown}
                    icon={<ArrowDown className="h-4 w-4"/>}
                />
            </div>
        </div>
    );
}
