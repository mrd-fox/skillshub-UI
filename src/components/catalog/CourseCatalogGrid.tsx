/**
 * Course Catalog Grid Component
 * Renders a grid of course cards with optional action slots
 * Does not handle data fetching, only presentation
 */

import {ReactNode} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {SkeletonLoader} from "@/components/ui/SkeletonLoader";
import {PublicCourseListItem} from "@/api/types/public";
import {CourseCatalogCard} from "./CourseCatalogCard";

interface CourseCatalogGridProps {
    courses: PublicCourseListItem[];
    onOpenDetails: (courseId: string) => void;
    renderActions?: (courseId: string) => ReactNode;
    loading?: boolean;
    error?: string | null;
}

export function CourseCatalogGrid({
                                      courses,
                                      onOpenDetails,
                                      renderActions,
                                      loading = false,
                                      error = null,
                                  }: Readonly<CourseCatalogGridProps>) {
    if (error) {
        return (
            <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" aria-live="polite">
                {error}
            </section>
        );
    }

    if (loading) {
        return (
            <section aria-label="Chargement du catalogue">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({length: 6}, (_, idx) => `skeleton-loader-${idx}`).map((key) => (
                        <Card key={key} className="overflow-hidden">
                            <CardContent className="p-0">
                                <SkeletonLoader className="h-36 w-full rounded-none"/>
                                <div className="space-y-2 p-4">
                                    <SkeletonLoader className="h-4 w-3/4"/>
                                    <SkeletonLoader className="h-3 w-1/3"/>
                                    <SkeletonLoader className="h-6 w-1/4"/>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        );
    }

    if (courses.length === 0) {
        return (
            <section className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                Aucun cours disponible pour le moment.
            </section>
        );
    }

    return (
        <section aria-label="Catalogue des cours">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                    <CourseCatalogCard
                        key={course.id}
                        course={course}
                        onOpenDetails={() => onOpenDetails(course.id)}
                        actions={renderActions ? renderActions(course.id) : undefined}
                    />
                ))}
            </div>
        </section>
    );
}
