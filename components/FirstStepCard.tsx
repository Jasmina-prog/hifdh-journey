'use client';

import Link from 'next/link';
import { Map as MapIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GOLD = 'linear-gradient(135deg, #d4af6e, #c9a020, #8b6510)';

/** Tells a signed-in user with no progress what to do first, instead of showing a page of zeros. */
export function FirstStepCard({ className = '' }: { className?: string }) {
  const { t } = useTranslation('common');
  return (
    <div
      data-testid="first-step"
      className={`flex flex-col gap-4 rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50 to-[#faf3e0] p-5 shadow-sm dark:border-amber-700/30 dark:from-amber-950/30 dark:to-amber-950/10 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 ${className}`}
    >
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/80 text-amber-700 shadow-sm ring-1 ring-amber-300/70 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-700/50">
          <MapIcon className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-base font-semibold text-amber-950 dark:text-amber-100">{t('firstStepTitle')}</p>
          <p className="mt-0.5 text-sm text-amber-900/80 dark:text-amber-200/80">{t('firstStepText')}</p>
        </div>
      </div>
      <Link
        href="/map"
        className="shrink-0 rounded-xl px-5 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-amber-700/20 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        style={{ background: GOLD }}
      >
        {t('firstStepButton')}
      </Link>
    </div>
  );
}
