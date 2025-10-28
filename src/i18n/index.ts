import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

i18n
    .use(LanguageDetector) // détecte la langue du navigateur
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            fr: { translation: fr },
        },
        fallbackLng: "fr", // langue par défaut
        interpolation: {
            escapeValue: false, // react gère l’échappement
        },
    });

export default i18n;
