// src/pages/tutor/course-builder/EditCoursePage.tsx
import {useTranslation} from "react-i18next";

export default function SettingsPage() {
    const {t} = useTranslation();

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">{t("navigation.settings")}</h1>
            {/* Place ton formulaire ici */}
        </div>
    );
}
