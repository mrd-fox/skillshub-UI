import {useEffect, useState} from "react";
import api from "@/lib/axios";
import { z } from "zod";

const courseSchema = z.object({
    title: z.string().min(3, "Le titre est requis (min 3 caractères)"),
    description: z.string().min(10, "La description est requise (min 10 caractères)"),
    price: z.number().min(0, "Le prix doit être positif"),
    sections: z.array(z.any()), // tu pourras typer plus tard
});

type CoursePayload = z.infer<typeof courseSchema>;


export default function CreateCourseForm() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);

    const [sections, setSections] = useState<any[]>([]);
    // Utilise setSections pour éviter l'erreur ESLint
    useEffect(() => {
        setSections([]);
    }, []);

    const [errors, setErrors] = useState<Partial<Record<keyof CoursePayload, string>>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setGeneralError(null);
        setSuccess(null);

        const payload = { title, description, price, sections };
        const validation = courseSchema.safeParse(payload);

        if (!validation.success) {
            const fieldErrors: Partial<Record<keyof CoursePayload, string>> = {};
            const formatted = validation.error.format();
            if (formatted.title?._errors[0]) fieldErrors.title = formatted.title._errors[0];
            if (formatted.description?._errors[0]) fieldErrors.description = formatted.description._errors[0];
            if (formatted.price?._errors[0]) fieldErrors.price = formatted.price._errors[0];
            setErrors(fieldErrors);
            return;
        }

        try {
            const response = await api.post("/course", payload);
            setSuccess("Cours créé avec succès !");
        } catch (err: any) {
            setGeneralError(err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
            <div>
                <input
                    type="text"
                    placeholder="Titre"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
            </div>

            <div>
        <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded"
        />
                {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
            </div>

            <div>
                <input
                    type="number"
                    placeholder="Prix"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                />
                {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
            </div>

            {generalError && <p className="text-red-600">{generalError}</p>}
            {success && <p className="text-green-600">{success}</p>}

            <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-black rounded hover:bg-indigo-700"
            >
                Créer le cours
            </button>
        </form>
    );
}