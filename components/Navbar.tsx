'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeProvider';
import { IslamicThemeToggle } from './IslamicToggle';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const NAV_KEYS = [
  { href: '/', key: 'navHome' },
  { href: '/dashboard', key: 'navDashboard' },
  { href: '/map', key: 'mushafMap' },
  { href: '/journal', key: 'navJournal' },
] as const;

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
  const { t, i18n } = useTranslation('common');
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setSigningIn(false);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    try { localStorage.setItem('i18n-language', lng); } catch {}
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-[#faf7f2]/70 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-950/75">
      <div className="mx-auto flex h-20 max-w-400 items-center justify-between px-4 sm:px-6 lg:px-16">

        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-1 transition hover:opacity-80">
          <img
            src="/logo.png"
            alt="Hifdh Journey"
            className="h-35 w-auto shrink-0"
            style={{ filter: 'brightness(1.15) saturate(1.25) contrast(1.05)' }}
          />
          {/* <span className="hidden sm:inline-block text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">My Hifdh Journey</span> */}
        </Link>

        {/* ── Desktop nav ─────────────────────────────────── */}
        <nav className="hidden lg:flex items-center gap-0.5 text-sm font-medium">
          {NAV_KEYS.map((item) => (
            <Link key={item.href} href={item.href}
              className={`rounded-lg px-3.5 py-2 transition-colors ${
                isActive(item.href)
                  ? 'font-semibold text-slate-900 underline decoration-2 underline-offset-4 decoration-slate-900 dark:text-slate-100 dark:decoration-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t(item.key)}
            </Link>
          ))}

          <div className="mx-2 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <IslamicThemeToggle theme={theme} onToggle={toggleTheme} />

          <LanguageSwitcher current={i18n.language} onChange={changeLanguage} />

          {user ? (
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
          ) : (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="ml-1 rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #d4af6e, #c9a020, #8b6510)' }}
            >
              {signingIn ? t('redirecting') : t('signIn')}
            </button>
          )}
        </nav>

        {/* ── Mobile right controls ────────────────────────── */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <LanguageSwitcher current={i18n.language} onChange={changeLanguage} />

          <IslamicThemeToggle theme={theme} onToggle={toggleTheme} />

          {user ? (
            <Link href="/profile"
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
              </svg>
            </Link>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #d4af6e, #c9a020, #8b6510)' }}
            >
              {signingIn ? '…' : t('signIn')}
            </button>
          )}

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
              {NAV_KEYS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-slate-900 font-semibold dark:text-slate-100 underline decoration-2 underline-offset-4 decoration-slate-900 dark:decoration-slate-100'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'
                  }`}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
