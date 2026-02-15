import {useEffect, useMemo, useRef, useState} from "react";
import api, {ApiError} from "@/api/axios";
import {API_ENDPOINTS} from "@/api/endpoints";
import {CourseCatalogGrid} from "@/components/catalog/CourseCatalogGrid";
import {CourseDetailDialog} from "@/components/catalog/CourseDetailDialog";
import {PublicCourseDetailResponse, PublicCourseListItem} from "@/api/types/public";

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

    if (e instanceof Error && e.message.trim().length > 0) {
        return e.message;
    }

    return "Impossible de charger le catalogue.";
}

export default function HomePage() {
    const [loading, setLoading] = useState<boolean>(true);
    const [courses, setCourses] = useState<PublicCourseListItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [detailOpen, setDetailOpen] = useState<boolean>(false);
    const [detailLoading, setDetailLoading] = useState<boolean>(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detail, setDetail] = useState<PublicCourseDetailResponse | null>(null);

    const detailAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const abort = new AbortController();

        async function loadCatalog(): Promise<void> {
            setLoading(true);
            setError(null);

            try {
                const res = await api.get<PublicCourseListItem[]>(API_ENDPOINTS.PUBLIC.COURSES, {
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
            const res = await api.get<PublicCourseDetailResponse>(API_ENDPOINTS.PUBLIC.COURSE_BY_ID(courseId), {
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

    function handleDetailOpenChange(open: boolean): void {
        setDetailOpen(open);

        if (!open) {
            // Cancel pending detail call when closing dialog
            if (detailAbortRef.current) {
                detailAbortRef.current.abort();
            }

            setDetail(null);
            setDetailError(null);
            setDetailLoading(false);
        }
    }

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold">Skillshub</h1>
                <p className="text-sm text-muted-foreground">
                    Parcours les cours disponibles. La connexion est requise uniquement pour acheter, suivre et publier.
                </p>
            </header>

            <CourseCatalogGrid
                courses={sortedCourses}
                onOpenDetails={openCourseDetail}
                loading={loading}
                error={error}
            />

            <CourseDetailDialog
                course={detail}
                open={detailOpen}
                onOpenChange={handleDetailOpenChange}
                loading={detailLoading}
                error={detailError}
            />
        </main>
    );
}
