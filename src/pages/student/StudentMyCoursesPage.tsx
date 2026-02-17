/**
 * Student My Courses Page
 * Displays courses the student is enrolled in
 * Fetches enrolled courses from backend via search endpoint
 */

import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext";
import {courseService} from "@/api/services/courseService";
import {PublicCourseListItem} from "@/api/types/public";
import {CourseCatalogGrid} from "@/components/catalog/CourseCatalogGrid";
import {Button} from "@/components/ui/button";
import {ApiError} from "@/api/axios";

function isApiError(e: unknown): e is ApiError {
    if (!e || typeof e !== "object") {
        return false;
    }
    const candidate = e as { status?: unknown; message?: unknown };
    return typeof candidate.status === "number" && typeof candidate.message === "string";
}

function errorMessage(e: unknown): string {
    if (isApiError(e)) {
        return e.message;
    }

    if (e instanceof Error && e.message.trim().length > 0) {
        return e.message;
    }

    return "Impossible de charger vos cours.";
}

export default function StudentMyCoursesPage() {
    const {internalUser} = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState<boolean>(true);
    const [courses, setCourses] = useState<PublicCourseListItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const enrolledCourseIds = internalUser?.enrolledCourseIds ?? [];
    const idsKey = enrolledCourseIds.join("|");

    useEffect(() => {
        let cancelled = false;

        async function loadEnrolledCourses(): Promise<void> {
            const ids = idsKey.length > 0 ? idsKey.split("|") : [];

            if (ids.length === 0) {
                setLoading(false);
                setCourses([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = await courseService.searchCoursesByIds(ids);

                if (!cancelled) {
                    const filtered = data.filter((item) => {
                        const candidate = item as PublicCourseListItem & { status?: string };
                        if (candidate.status) {
                            return candidate.status === "PUBLISHED";
                        }
                        return true;
                    });
                    setCourses(filtered);
                }
            } catch (e: unknown) {
                if (!cancelled) {
                    setError(errorMessage(e));
                    setCourses([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadEnrolledCourses();

        return () => {
            cancelled = true;
        };
    }, [idsKey]);

    const sortedCourses = useMemo(() => {
        return [...courses].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }, [courses]);

    function handleOpenDetails(courseId: string): void {
        navigate(`/dashboard/student/courses/${courseId}`);
    }

    function handleGoToCatalog(): void {
        navigate("/dashboard/student");
    }

    if (!internalUser) {
        return (
            <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
                <header className="space-y-1">
                    <h1 className="text-3xl font-bold">Mes cours</h1>
                </header>
                <section className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Utilisateur non authentifié.
                </section>
            </main>
        );
    }

    if (enrolledCourseIds.length === 0) {
        return (
            <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
                <header className="space-y-1">
                    <h1 className="text-3xl font-bold">Mes cours</h1>
                    <p className="text-sm text-muted-foreground">
                        Vos cours inscrits apparaîtront ici.
                    </p>
                </header>
                <section className="rounded-lg border bg-muted/10 p-6 text-center">
                    <p className="mb-4 text-sm text-muted-foreground">
                        Vous n&apos;êtes inscrit à aucun cours pour le moment.
                    </p>
                    <Button type="button" onClick={handleGoToCatalog}>
                        Parcourir le catalogue
                    </Button>
                </section>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold">Mes cours</h1>
                <p className="text-sm text-muted-foreground">
                    Accédez aux cours auxquels vous êtes inscrit.
                </p>
            </header>

            <section>
                <CourseCatalogGrid
                    courses={sortedCourses}
                    onOpenDetails={handleOpenDetails}
                    loading={loading}
                    error={error}
                />
            </section>
        </main>
    );
}
