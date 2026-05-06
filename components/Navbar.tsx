'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

// ─── Custom language dropdown ─────────────────────────────────────────────────

function LanguageSwitcher({ current, onChange }: { current: string; onChange: (lang: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleBlur = (e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };

  const currentLabel = languages.find((l) => l.code === current)?.name ?? 'EN';

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        {currentLabel}
        <svg
          className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[72px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onMouseDown={() => { onChange(lang.code); setOpen(false); }}
                className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors ${
                  current === lang.code
                    ? 'bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const pathname = usePathname();
  const { i18n } = useTranslation('common');
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    try { localStorage.setItem('i18n-language', lng); } catch {}
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-400 items-center justify-between px-4 py-3 sm:px-6 lg:px-16">

        {/* Logo */}
        <Link href="/" className="shrink-0 text-base font-semibold text-slate-900 transition hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300 sm:text-lg">
          My Hifdh Journey
        </Link>

        {/* ── Desktop nav ─────────────────────────────────── */}
        <nav className="hidden lg:flex items-center gap-0.5 text-sm font-medium">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`rounded-lg px-3.5 py-2 transition-colors ${
                isActive(item.href)
                  ? 'font-semibold text-slate-900 underline decoration-2 underline-offset-4 decoration-slate-900 dark:text-slate-100 dark:decoration-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="mx-2 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <button onClick={toggleTheme} aria-label="Toggle theme"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <LanguageSwitcher current={i18n.language} onChange={changeLanguage} />

          <Link href="/profile"
            className={`ml-1 rounded-lg p-2 transition ${
              isActive('/profile')
                ? 'text-slate-900 underline decoration-2 underline-offset-4 dark:text-slate-100'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            title="Profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
            </svg>
          </Link>
        </nav>

        {/* ── Mobile right controls ────────────────────────── */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <LanguageSwitcher current={i18n.language} onChange={changeLanguage} />

          <button onClick={toggleTheme} aria-label="Toggle theme"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <Link href="/profile"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
            </svg>
          </Link>

          <button onClick={() => setMobileOpen((v) => !v)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.svg key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.12 }}
                  className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </motion.svg>
              ) : (
                <motion.svg key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.12 }}
                  className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950 lg:hidden"
          >
            <nav className="px-4 py-3 space-y-0.5 sm:px-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-slate-900 font-semibold dark:text-slate-100 underline decoration-2 underline-offset-4 decoration-slate-900 dark:decoration-slate-100'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
