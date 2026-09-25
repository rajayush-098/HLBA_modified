import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import hinglish from "./locales/hinglish.json";
import mr from "./locales/mr.json";
import bn from "./locales/bn.json";
import te from "./locales/te.json";
import ta from "./locales/ta.json";

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
  hinglish: { translation: hinglish },
  mr: { translation: mr },
  bn: { translation: bn },
  te: { translation: te },
  ta: { translation: ta },
};

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "hi", name: "Hindi", nativeName: "हिंदी", bcp47: "hi-IN" },
  { code: "en", name: "English", nativeName: "English", bcp47: "en-IN" },
  { code: "hinglish", name: "Hinglish", nativeName: "Hinglish (बोलचाल)", bcp47: "hi-IN" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", bcp47: "mr-IN" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", bcp47: "bn-IN" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", bcp47: "te-IN" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", bcp47: "ta-IN" },
];

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "hi",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
