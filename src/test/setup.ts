import '@testing-library/jest-dom';
import {beforeAll, beforeEach} from 'vitest';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import fr from '@/i18n/locales/fr.json';
import en from '@/i18n/locales/en.json';

// Initialize i18n synchronously for tests in French (same as production default)
beforeAll(async () => {
    if (!i18n.isInitialized) {
        await i18n
            .use(initReactI18next)
            .init({
                resources: {
                    fr: {translation: fr},
                    en: {translation: en},
                },
                lng: 'fr',
                fallbackLng: 'fr',
                supportedLngs: ['fr', 'en'],
                interpolation: {
                    escapeValue: false,
                },
                react: {
                    useSuspense: false,
                },
                detection: {
                    order: [],
                    caches: [],
                },
            });
    }
    await i18n.changeLanguage('fr');
});

// Clear sessionStorage before each test to avoid state leakage
beforeEach(async () => {
    sessionStorage.clear();
    await i18n.changeLanguage('fr');
});

