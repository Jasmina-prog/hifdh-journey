import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../public/locales/en/common.json';
import ruCommon from '../public/locales/ru/common.json';
import uzCommon from '../public/locales/uz/common.json';

const resources = {
  en: { common: enCommon },
  ru: { common: ruCommon },
  uz: { common: uzCommon },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'uz',
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
} else {
  // The dev server keeps this instance across reloads, so new keys must be merged
  // in. Otherwise the server renders raw keys and hydration fails.
  for (const [language, namespaces] of Object.entries(resources)) {
    i18n.addResourceBundle(language, 'common', namespaces.common, true, true);
  }
}

export default i18n;
