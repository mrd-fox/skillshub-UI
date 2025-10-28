import {SectionAccordion} from "./SectionAccordion.tsx";
import {useTranslation} from "react-i18next";
import CreateCourseForm from "@/components/courseBuilder/CourseForm.tsx";

export default function CourseBuilder() {
    const {t} = useTranslation();

    return (
        <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">
            <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                {/* Colonne gauche (formulaire) */}
                <div className="md:col-span-2 space-y-6">
                    <h1 className="text-3xl font-bold">{t("create_course")}</h1>
                    <CreateCourseForm/>
                    <SectionAccordion/>
                </div>

                {/* Colonne droite (infos/preview) */}
                <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
                    <h2 className="text-lg font-semibold">Aide & Conseils</h2>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                        <li>Ajoutez un titre clair et descriptif.</li>
                        <li>Divisez le cours en sections logiques.</li>
                        <li>Incluez des vidéos de qualité.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
