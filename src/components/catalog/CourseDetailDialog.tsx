/**
 * Course Detail Dialog Component
 * Reusable dialog for displaying course details
 * Supports custom footer actions slot
 */

import {ReactNode, useMemo} from "react";
import {Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {SkeletonLoader} from "@/components/ui/SkeletonLoader";
import {PublicChapterResponse, PublicCourseDetailResponse, PublicSectionResponse} from "@/api/types/public";
import {Button} from "@/components/ui/button";
import {formatPriceFromCents} from "@/lib/price";

interface CourseDetailDialogProps {
    course: PublicCourseDetailResponse | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loading?: boolean;
    error?: string | null;
    footerActions?: ReactNode;
}

interface OutlineSection {
    title: string;
    chapters: OutlineChapter[];
}

interface OutlineChapter {
    title: string;
}

function sortByPosition<T extends { position: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.position - b.position);
}

export function CourseDetailDialog({
                                       course,
                                       open,
                                       onOpenChange,
                                       loading = false,
                                       error = null,
                                       footerActions,
                                   }: Readonly<CourseDetailDialogProps>) {
    const outline: OutlineSection[] = useMemo(() => {
        if (!course) {
            return [];
        }

        const sections = course.sections ?? [];
        const normalizedSections = Array.isArray(sections) ? sections : [];

        return sortByPosition(normalizedSections).map((s: PublicSectionResponse) => {
            const chapters = s.chapters ?? [];
            const normalizedChapters = Array.isArray(chapters) ? chapters : [];
            return {
                title: s.title || "Section",
                chapters: sortByPosition(normalizedChapters).map((c: PublicChapterResponse) => ({
                    title: c.title || "Chapitre",
                })),
            };
        });
    }, [course]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {course?.title ?? "Détail du cours"}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <section aria-label="Chargement du détail">
                        <div className="space-y-3">
                            <SkeletonLoader className="h-4 w-3/4"/>
                            <SkeletonLoader className="h-4 w-2/3"/>
                            <SkeletonLoader className="h-4 w-1/2"/>
                            <div className="pt-4">
                                <SkeletonLoader className="h-6 w-1/3"/>
                            </div>
                            <div className="space-y-2">
                                <SkeletonLoader className="h-4 w-2/3"/>
                                <SkeletonLoader className="h-4 w-1/2"/>
                                <SkeletonLoader className="h-4 w-3/5"/>
                            </div>
                        </div>
                    </section>
                ) : null}

                {!loading && error ? (
                    <section
                        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                        aria-live="polite"
                    >
                        {error}
                    </section>
                ) : null}

                {!loading && !error ? (
                    <section className="space-y-4">
                        <div className="space-y-2">
                            {course?.description ? (
                                <p className="text-sm text-muted-foreground">
                                    {course.description}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Aucune description.
                                </p>
                            )}

                            <div className="text-base font-semibold">
                                {formatPriceFromCents(course?.price ?? null)}
                            </div>
                        </div>

                        <section aria-label="Plan du cours" className="space-y-3">
                            <h2 className="text-sm font-semibold">Contenu</h2>

                            {outline.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Aucun contenu disponible.
                                </p>
                            ) : (
                                <ol className="space-y-3">
                                    {outline.map((sec, secIdx) => (
                                        <li
                                            key={`${sec.title}-${secIdx}`}
                                            className="rounded-lg border p-3"
                                        >
                                            <h3 className="text-sm font-semibold">
                                                {sec.title}
                                            </h3>

                                            {sec.chapters.length === 0 ? (
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Aucun chapitre.
                                                </p>
                                            ) : (
                                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                                    {sec.chapters.map((ch, chIdx) => (
                                                        <li key={`${ch.title}-${chIdx}`}>
                                                            {ch.title}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>
                    </section>
                ) : null}

                <DialogFooter>
                    {footerActions}
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Fermer</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
