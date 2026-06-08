'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

function Divider() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #c9943a)' }} />
      <span className="text-sm text-amber-500/70 dark:text-amber-400/60">✦</span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #c9943a)' }} />
    </div>
  );
}

export function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer className="w-full">
      <div className="mx-auto w-full max-w-400 px-6 lg:px-16">
        <Divider />
      </div>

      <div className="mx-auto w-full max-w-400 px-6 py-14 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6 }}
          className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4"
        >

          {/* Brand */}
          <div className="lg:col-span-1">
            <img
              src="/logo.png"
              alt="Hifdh Journey"
              className="h-16 w-auto"
              style={{ filter: 'brightness(1.1) saturate(1.2)' }}
            />
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('footerTagline')}
            </p>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} My Hifdh Journey
            </p>
          </div>

          {/* Sources */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('footerSources')}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  {t('footerQuranTextLabel')}
                </p>
                <a
                  href="https://quran.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors underline-offset-2 hover:underline"
                >
                  Quran.com API
                </a>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('footerSahihInt')}</p>
              </li>
              <li>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  {t('hadith')}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Sahih al-Bukhari · Sahih Muslim
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Abu Dawud · Tirmidhi · Ibn Hibban
                </p>
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('footerDisclaimer')}</h3>
            <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('footerDisclaimerText1')}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('footerDisclaimerText2')}
            </p>
          </div>

          {/* Pages */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('footerPages')}</h3>
            <ul className="mt-4 space-y-2">
              {[
                { href: '/dashboard', key: 'navDashboard' },
                { href: '/map', key: 'mushafMap' },
                { href: '/journal', key: 'navJournal' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors hover:underline underline-offset-2"
                  >
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </motion.div>
      </div>
    </footer>
  );
}
