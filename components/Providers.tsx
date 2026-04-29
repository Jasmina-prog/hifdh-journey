'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('i18n-language');
      if (saved && saved !== i18n.language) {
        i18n.changeLanguage(saved);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}