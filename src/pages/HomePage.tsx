import {useEffect, useMemo, useState} from "react";
import api from "@/api/axios.ts";
import {SkeletonLoader} from "@/components/ui/SkeletonLoader.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge.tsx";

type CourseStatusEnum =
    | "DRAFT"
    | "WAITING_VALIDATION"
    | "VALIDATED"
    | "REJECTED"
    | "PUBLISHED";

type PublicCourse = {
    id: string;
    title: string;
    description?: string | null;
    status?: CourseStatusEnum | null;
    createdAt?: string | null;
    updatedAt?: string | null;
};

function statusVariant(status: CourseStatusEnum | null | undefined): "default" | "secondary" | "destructive" | "outline" {
    if (!status) {
        return "outline";
    }

    if (status === "PUBLISHED") {
        return "default";
    } else if (status === "REJECTED") {
        return "destructive";
    } else {
        
        return "secondary";
    }
}

export default function HomePage() {
    const [loading, setLoading] = useState<boolean>(true);
    const [courses, setCourses] = useState<PublicCourse[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const res = await api.get<PublicCourse[]>("/course");

                if (!cancelled) {
                    setCourses(Array.isArray(res.data) ? res.data : []);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message ?? "Impossible de charger les cours.");
                    setCourses([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    const publishedCourses = useMemo(() => {
        // Si ton backend renvoie déjà uniquement les cours “accessibles”, on ne filtre pas.
        // Mais côté UX public, on privilégie l’affichage des cours PUBLISHED en tête.
        const copy = [...courses];
        copy.sort((a, b) => {
            const aPub = a.status === "PUBLISHED" ? 1 : 0;
            const bPub = b.status === "PUBLISHED" ? 1 : 0;
            return bPub - aPub;
        });
        return copy;
    }, [courses]);

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold">Skillshub</h1>
                <p className="text-sm text-muted-foreground">
                    Parcours les cours disponibles. La connexion est requise uniquement pour acheter, suivre et publier.
                </p>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({length: 6}).map((_, i) => (
                        <SkeletonLoader key={i}/>
                    ))}
                </div>
            ) : publishedCourses.length === 0 ? (
                <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Aucun cours disponible pour le moment.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {publishedCourses.map((course) => {
                        return (
                            <Card key={course.id} className="border-muted/60">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle
                                            className="line-clamp-2 text-base">{course.title || "Cours sans titre"}</CardTitle>
                                        <Badge variant={statusVariant(course.status ?? null)}>
                                            {course.status ?? "UNKNOWN"}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    <p className="line-clamp-3 text-sm text-muted-foreground">
                                        {course.description ?? "Aucune description."}
                                    </p>

                                    <div className="text-xs text-muted-foreground">
                                        ID: <span className="font-mono">{course.id}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}