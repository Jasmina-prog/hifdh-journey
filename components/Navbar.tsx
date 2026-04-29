'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeProvider';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/map', label: 'Mushaf Map' },
  { href: '/journal', label: 'Journal' },
];

const languages = [
  { code: 'en', name: 'EN' },
  { code: 'uz', name: 'UZ' },
  { code: 'ru', name: 'RU' },
];

export function Navbar() {
  const { i18n } = useTranslation('common');
  const { theme, toggleTheme } = useTheme();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18n-language', lng);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900 transition hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-50">
          My Hifdh Journey
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={toggleTheme}
            className="rounded-full px-4 py-2 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                i18n.language === lang.code
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                  : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
