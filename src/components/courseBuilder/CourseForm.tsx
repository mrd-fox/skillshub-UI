// src/components/courseBuilder/CreateCourseForm.tsx
import {courseService} from "@/api/services";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {z} from "zod";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {toast} from "sonner";
import {useNavigate} from "react-router-dom";

const createCourseSchema = (t: (key: string) => string) => z.object({
    title: z.string().min(3, t("tutor.form_title_required")),
    description: z.string().min(10, t("tutor.form_description_required")),
    price: z.number().min(0, t("tutor.form_price_positive")),
    sections: z.array(
        z.object({
            title: z.string().min(1, t("tutor.form_section_title_required")),
            position: z.number(),
            chapters: z.array(
                z.object({
                    title: z.string().min(1, t("tutor.form_chapter_title_required")),
                    position: z.number().optional(),
                })
            ),
        })
    ).optional(),
});

type CoursePayload = z.infer<ReturnType<typeof createCourseSchema>>;

export default function CreateCourseForm({sections}: { sections: any[] }) {
    const {t} = useTranslation();
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
        const courseSchema = createCourseSchema(t);
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
            toast.success(t("tutor.course_created_success"));
            navigate(`/dashboard/tutor/course-builder/${createdCourse.id}`, {
                state: {course: createdCourse},
            });
        } catch (err: any) {
            console.error("🔥 API error:", err);
            toast.error(t("tutor.course_create_error"));
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl shadow-md space-y-6 border border-gray-100"
        >
            <div className="space-y-2">
                <label className="font-medium text-sm">{t("tutor.form_course_title")}</label>
                <Input
                    placeholder={t("tutor.form_title_placeholder")}
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                />
                {errors["title"] && <p className="text-sm text-red-600">{errors["title"]}</p>}
            </div>

            <div className="space-y-2">
                <label className="font-medium text-sm">{t("tutor.description")}</label>
                <Textarea
                    placeholder={t("tutor.form_description_placeholder")}
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                />
                {errors["description"] && <p className="text-sm text-red-600">{errors["description"]}</p>}
            </div>

            <div className="space-y-2">
                <label className="font-medium text-sm">{t("tutor.form_price_label")}</label>
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
                {t("tutor.form_create_course")}
            </Button>
        </form>
    );
}