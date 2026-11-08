'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

function detectLanguage(): string | null {
  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('uz')) return 'uz';
  if (browser.startsWith('ru')) return 'ru';
  return window.location.hostname.endsWith('.uz') ? 'uz' : null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      // A saved choice wins. Otherwise visitors from Uzbekistan get Uzbek and
      // Russian-speaking browsers get Russian, instead of English.
      const language = localStorage.getItem('i18n-language') ?? detectLanguage() ?? 'en';
      if (language !== i18n.language) {
        i18n.changeLanguage(language);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    // Keep <html lang> in step with the language shown, for screen readers and search engines.
    const setLang = (language: string) => { document.documentElement.lang = language; };
    setLang(i18n.language);
    i18n.on('languageChanged', setLang);
    return () => i18n.off('languageChanged', setLang);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}