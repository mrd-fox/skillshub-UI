/**
 * Course Catalog Card Component
 * Reusable card for displaying a course in the catalog
 * Provides separate clickable and action areas to avoid nested interactive elements
 */

import {ReactNode} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {SkeletonLoader} from "@/components/ui/SkeletonLoader";
import {PublicCourseListItem} from "@/api/types/public";

interface CourseCatalogCardProps {
    course: PublicCourseListItem;
    onOpenDetails: () => void;
    actions?: ReactNode;
}

function formatPrice(priceCents: number | null | undefined): string {
    if (priceCents === null || priceCents === undefined) {
        return "—";
    }
    if (priceCents === 0) {
        return "Gratuit";
    }
    const euros = priceCents / 100;
    return euros.toLocaleString("fr-FR", {style: "currency", currency: "EUR"});
}

export function CourseCatalogCard({course, onOpenDetails, actions}: Readonly<CourseCatalogCardProps>) {
    const title = course.title || "Titre de la formation";
    const author = course.author ?? "Auteur";
    const price = formatPrice(course.price ?? null);

    return (
        <article className="flex flex-col">
            <Card className="flex flex-1 flex-col overflow-hidden transition-shadow hover:shadow-md">
                <button
                    type="button"
                    onClick={onOpenDetails}
                    className="flex flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`Voir le détail du cours : ${title}`}
                >
                    <CardContent className="flex flex-1 flex-col p-0">
                        <div className="relative">
                            <SkeletonLoader className="h-36 w-full rounded-none"/>
                        </div>

                        <div className="flex flex-1 flex-col space-y-1 p-4">
                            <CardHeader className="p-0">
                                <CardTitle className="line-clamp-2 text-base">
                                    {title}
                                </CardTitle>
                            </CardHeader>

                            <p className="text-sm text-muted-foreground">{author}</p>

                            <div className="pt-2 text-lg font-semibold">
                                {price}
                            </div>
                        </div>
                    </CardContent>
                </button>

                {actions ? (
                    <div className="border-t p-4">
                        {actions}
                    </div>
                ) : null}
            </Card>
        </article>
    );
}
