import {SectionAccordion} from "./SectionAccordion.tsx";
import {useTranslation} from "react-i18next";
import CreateCourseForm from "@/components/courseBuilder/CourseForm.tsx";
import {useState} from "react";

export default function CourseBuilder() {
    const {t} = useTranslation();
    const [sections, setSections] = useState<any[]>([]);

    return (
        <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">
            <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                {/* Colonne gauche : Formulaire + sections */}
                <div className="md:col-span-2 space-y-6">
                    <h1 className="text-3xl font-bold text-gray-800">Créer un cours</h1>

                    {/* Formulaire principal */}
                    <CreateCourseForm sections={sections}/>

                    {/* Gestion des sections */}
                    <SectionAccordion onChange={setSections}/>
                </div>

                {/* Colonne droite : aide */}
                <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800">Aide & Conseils</h2>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                        <li>Ajoutez un titre clair et descriptif.</li>
                        <li>Divisez le cours en sections logiques.</li>
                        <li>Incluez des vidéos ou du contenu pertinent.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
