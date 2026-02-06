import {useEffect, useMemo, useRef, useState} from "react";
import api, {ApiError} from "@/api/axios.ts";
import {SkeletonLoader} from "@/components/ui/SkeletonLoader.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog.tsx";

type PublicCourseListItem = {
    id: string;
    title: string;
    author?: string | null;
    price?: number | null; // cents
};

type PublicCourseDetailResponse = {
    id: string;
    title: string;
    description?: string | null;
    price?: number | null;
    sections?: PublicSectionResponse[] | null;
    createdAt?: string | null;
};

type PublicSectionResponse = {
    title: string;
    position: number;
    chapters?: PublicChapterResponse[] | null;
};

type PublicChapterResponse = {
    title: string;
    position: number;
};

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

function sortByPosition<T extends { position: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.position - b.position);
}

function isApiError(e: unknown): e is ApiError {
    if (!e || typeof e !== "object") {
        return false;
    }
    const candidate = e as { status?: unknown; message?: unknown };
    return typeof candidate.status === "number" && typeof candidate.message === "string";
}

function publicCatalogErrorMessage(e: unknown): string {
    // Public page: never present auth/session semantics to the user
    if (isApiError(e)) {
        if (e.status === 401 || e.status === 403) {
            return "Catalogue indisponible (accès non autorisé).";
        }
        return e.message;
    }

    if (e instanceof Error && typeof e.message === "string" && e.message.trim().length > 0) {
        return e.message;
    }

    return "Impossible de charger le catalogue.";
}

export default function HomePage() {
    const [loading, setLoading] = useState<boolean>(true);
    const [courses, setCourses] = useState<PublicCourseListItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState<boolean>(false);
    const [detailLoading, setDetailLoading] = useState<boolean>(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detail, setDetail] = useState<PublicCourseDetailResponse | null>(null);

    const catalogAbortRef = useRef<AbortController | null>(null);
    const detailAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const abort = new AbortController();
        catalogAbortRef.current = abort;

        async function loadCatalog(): Promise<void> {
            setLoading(true);
            setError(null);

            try {
                const res = await api.get<PublicCourseListItem[]>("/public/courses", {
                    signal: abort.signal,
                });

                const data = Array.isArray(res.data) ? res.data : [];
                setCourses(data);
            } catch (e: unknown) {
                // Abort is not an error from user perspective
                if (abort.signal.aborted) {
                    return;
                }
                setError(publicCatalogErrorMessage(e));
                setCourses([]);
            } finally {
                if (!abort.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadCatalog();

        return () => {
            abort.abort();
        };
    }, []);

    const sortedCourses = useMemo(() => {
        return [...courses].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }, [courses]);

    async function openCourseDetail(courseId: string): Promise<void> {
        setSelectedCourseId(courseId);
        setDetailOpen(true);

        // Cancel any pending detail call
        if (detailAbortRef.current) {
            detailAbortRef.current.abort();
        }
        const abort = new AbortController();
        detailAbortRef.current = abort;

        setDetail(null);
        setDetailError(null);
        setDetailLoading(true);

        try {
            const res = await api.get<PublicCourseDetailResponse>(`/public/courses/${courseId}`, {
                signal: abort.signal,
            });
            if (!abort.signal.aborted) {
                setDetail(res.data ?? null);
            }
        } catch (e: unknown) {
            if (abort.signal.aborted) {
                return;
            }
            setDetailError(publicCatalogErrorMessage(e));
        } finally {
            if (!abort.signal.aborted) {
                setDetailLoading(false);
            }
        }
    }

    const outline = useMemo(() => {
        const sections = detail?.sections ?? [];
        const normalizedSections = Array.isArray(sections) ? sections : [];

        return sortByPosition(normalizedSections).map((s) => {
            const chapters = s.chapters ?? [];
            const normalizedChapters = Array.isArray(chapters) ? chapters : [];
            return {
                title: s.title || "Section",
                chapters: sortByPosition(normalizedChapters).map((c) => ({
                    title: c.title || "Chapitre",
                })),
            };
        });
    }, [detail]);

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold">Skillshub</h1>
                <p className="text-sm text-muted-foreground">
                    Parcours les cours disponibles. La connexion est requise uniquement pour acheter, suivre et publier.
                </p>
            </header>

            {error ? (
                <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                         aria-live="polite">
                    {error}
                </section>
            ) : null}

            {loading ? (
                <section aria-label="Chargement du catalogue">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({length: 6}).map((_, i) => (
                            <Card key={i} className="overflow-hidden">
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
            ) : sortedCourses.length === 0 ? (
                <section className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Aucun cours disponible pour le moment.
                </section>
            ) : (
                <section aria-label="Catalogue des cours">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sortedCourses.map((course) => {
                            const title = course.title || "Titre de la formation";
                            const author = course.author ?? "Auteur";
                            const price = formatPrice(course.price ?? null);

                            return (
                                <article key={course.id}>
                                    <AlertDialog
                                        open={detailOpen && selectedCourseId === course.id}
                                        onOpenChange={(open) => {
                                            setDetailOpen(open);

                                            if (!open) {
                                                // Cancel pending detail call when closing dialog
                                                if (detailAbortRef.current) {
                                                    detailAbortRef.current.abort();
                                                }

                                                setSelectedCourseId(null);
                                                setDetail(null);
                                                setDetailError(null);
                                                setDetailLoading(false);
                                            }
                                        }}
                                    >
                                        <AlertDialogTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={() => void openCourseDetail(course.id)}
                                                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                aria-label={`Voir le détail du cours : ${title}`}
                                            >
                                                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                                                    <CardContent className="p-0">
                                                        <div className="relative">
                                                            <SkeletonLoader className="h-36 w-full rounded-none"/>
                                                        </div>

                                                        <div className="space-y-1 p-4">
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
                                                </Card>
                                            </button>
                                        </AlertDialogTrigger>

                                        <AlertDialogContent className="max-w-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    {detail?.title ?? title}
                                                </AlertDialogTitle>
                                            </AlertDialogHeader>

                                            {detailLoading ? (
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
                                            ) : detailError ? (
                                                <section
                                                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                                                    aria-live="polite"
                                                >
                                                    {detailError}
                                                </section>
                                            ) : (
                                                <section className="space-y-4">
                                                    <div className="space-y-2">
                                                        {detail?.description ? (
                                                            <p className="text-sm text-muted-foreground">
                                                                {detail.description}
                                                            </p>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">
                                                                Aucune description.
                                                            </p>
                                                        )}

                                                        <div className="text-base font-semibold">
                                                            {formatPrice(detail?.price ?? course.price ?? null)}
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
                                            )}

                                            <AlertDialogFooter>
                                                <AlertDialogCancel type="button">Fermer</AlertDialogCancel>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}
        </main>
    );
}
