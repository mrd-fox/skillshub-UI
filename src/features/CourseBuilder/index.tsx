// src/features/CourseBuilder/index.tsx
import { CourseForm } from "./CourseForm";
import { SectionAccordion } from "./SectionAccordion";
import {useTranslation} from "react-i18next";

export default function CourseBuilderPage() {
    const {t} = useTranslation();
    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <h1 className="text-2xl font-semibold">{t("create_course")}</h1>
                <CourseForm />
                <SectionAccordion />
            </div>
        </div>
    );
}