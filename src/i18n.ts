import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "fr",
    load: "languageOnly",
    keySeparator: false,
    backend: {
      loadPath: "/locales/{{lng}}.json?v=1.1",
      requestOptions: {
        cache: 'no-store'
      }
    },
    interpolation: {
      escapeValue: true,
    },
    react: {
      useSuspense: true, // Let React wait cleanly during asynchronous fetches
    },
  });

export default i18n;

