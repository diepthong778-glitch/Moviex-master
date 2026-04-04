import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from '../locales/en/translation.json';
import viTranslation from '../locales/vi/translation.json';
import jaTranslation from '../locales/ja/translation.json';

const LANGUAGE_STORAGE_KEY = 'moviex.language';
const supportedLanguages = ['en', 'vi', 'ja'];

const resolveInitialLanguage = () => {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage && supportedLanguages.includes(storedLanguage)) {
    return storedLanguage;
  }

  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      vi: { translation: viTranslation },
      ja: { translation: jaTranslation },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
