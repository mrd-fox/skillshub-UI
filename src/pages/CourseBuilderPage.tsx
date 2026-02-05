import {useEffect, useState} from "react";
import {useLocation, useParams} from "react-router-dom";
import {courseService} from "@/api/services";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {SectionAccordion} from "@/components/courseBuilder/SectionAccordion";
import {Loader2} from "lucide-react";
import {toast} from "sonner";

interface Course {
    id: string | undefined;
    title: string;
    description: string;
    price: number;
    sections: unknown[];
    status: string;
}

export default function CourseBuilderPage() {
    const {courseId} = useParams();
    const location = useLocation();

    // ✅ Si le cours vient de la redirection après création
    const initialCourse = location.state?.course;

    const [loading, setLoading] = useState(!initialCourse);
    const [saving, setSaving] = useState(false);

    const [course, setCourse] = useState(
        initialCourse || {
            id: courseId,
            title: "",
            description: "",
            price: 0,
            sections: [],
            status: "DRAFT",
        }
    );

    // 🔁 Si aucun state, fallback vers le GET (ex: accès direct par URL)
    useEffect(() => {
        if (initialCourse) return; // déjà en mémoire
        const fetchCourse = async () => {
            try {
                const data = await courseService.getCourseById(courseId!);
                setCourse(data as any);
            } catch (err) {
                console.error("Erreur chargement cours:", err);
                toast.error("Impossible de charger le cours.");
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [courseId, initialCourse]);

    const handleChange = <K extends keyof Course>(key: K, value: Course[K]) => {
        setCourse((prev: Course) => ({...prev, [key]: value}));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await courseService.updateCourse(course.id!, course as any);
            setCourse(updated as any); // synchro avec backend
            toast.success("Brouillon enregistré avec succès !");
        } catch (err) {
            console.error("Erreur sauvegarde:", err);
            toast.error("La mise à jour du cours a échoué.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <Loader2 className="animate-spin w-6 h-6 text-skillshub-blue"/>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">✏️ Édition du cours</h1>
                    <span
                        className={`px-3 py-1 text-sm rounded-full font-medium ${
                            course.status === "DRAFT"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                        }`}
                    >
                        {course.status}
                    </span>
                </header>

                {/* 🧩 Informations principales */}
                <div className="bg-white p-6 rounded-lg shadow-md space-y-4 border border-gray-100">
                    <div>
                        <label className="text-sm font-medium">Titre du cours</label>
                        <Input
                            value={course.title}
                            onChange={(e) => handleChange("title", e.target.value)}
                            placeholder="Ex: Apprendre React de zéro"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                            value={course.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder="Décrivez le contenu et les objectifs du cours"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Prix (€)</label>
                        <Input
                            type="number"
                            min="0"
                            value={course.price}
                            onChange={(e) => handleChange("price", Number(e.target.value))}
                        />
                    </div>
                </div>

                {/* 🔽 Sections & Chapitres */}
                <SectionAccordion
                    onChange={(sections) => handleChange("sections", sections)}
                />

                {/* 💾 Actions */}
                <div className="flex justify-end gap-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="!bg-[#2A6AEE] text-white hover:!bg-[#1F57CA]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin"/> Sauvegarde...
                            </>
                        ) : (
                            "💾 Enregistrer le brouillon"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
