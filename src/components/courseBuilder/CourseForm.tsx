// src/components/courseBuilder/CreateCourseForm.tsx
import {courseService} from "@/api/services";
import {useState} from "react";
import {z} from "zod";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {toast} from "sonner";
import {useNavigate} from "react-router-dom";

const courseSchema = z.object({
    title: z.string().min(3, "Le titre est requis (min 3 caractères)"),
    description: z.string().min(10, "La description est requise (min 10 caractères)"),
    price: z.number().min(0, "Le prix doit être positif"),
    sections: z.array(
        z.object({
            title: z.string().min(1, "Le titre de section est requis"),
            position: z.number(),
            chapters: z.array(
                z.object({
                    title: z.string().min(1, "Le titre du chapitre est requis"),
                    position: z.number().optional(),
                })
            ),
        })
    ).optional(),
});

type CoursePayload = z.infer<typeof courseSchema>;

export default function CreateCourseForm({sections}: { sections: any[] }) {
    const [form, setForm] = useState<CoursePayload>({
        title: "",
        description: "",
        price: 0,
        sections: [],
    });
    const navigate = useNavigate();
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (key: keyof CoursePayload, value: any) => {
        setForm((prev) => ({...prev, [key]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {...form, sections};
        const validation = courseSchema.safeParse(payload);

        if (!validation.success) {
            const formatted: Record<string, string> = {};
            for (const issue of validation.error.issues) {
                formatted[issue.path.join(".")] = issue.message;
            }
            setErrors(formatted);
            return;
        }

        try {
            const createdCourse = await courseService.createCourse(payload);
            toast.success("Cours créé avec succès !");
            navigate(`/dashboard/tutor/course-builder/${createdCourse.id}`, {
                state: {course: createdCourse},
            });
        } catch (err: any) {
            console.error("🔥 API error:", err);
            toast.error("Erreur lors de la création du cours.");
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl shadow-md space-y-6 border border-gray-100"
        >
            <div className="space-y-2">
                <label className="font-medium text-sm">Titre du cours</label>
                <Input
                    placeholder="Ex: Apprendre React de zéro"
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                />
                {errors["title"] && <p className="text-sm text-red-600">{errors["title"]}</p>}
            </div>

            <div className="space-y-2">
                <label className="font-medium text-sm">Description</label>
                <Textarea
                    placeholder="Décrivez le contenu et les objectifs du cours"
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                />
                {errors["description"] && <p className="text-sm text-red-600">{errors["description"]}</p>}
            </div>

            <div className="space-y-2">
                <label className="font-medium text-sm">Prix (€)</label>
                <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => handleChange("price", Number(e.target.value))}
                />
                {errors["price"] && <p className="text-sm text-red-600">{errors["price"]}</p>}
            </div>

            <Button type="submit" className="w-full !bg-[#2A6AEE] !text-white hover:!bg-[#1f57ca]">
                Créer le cours
            </Button>
        </form>
    );
}