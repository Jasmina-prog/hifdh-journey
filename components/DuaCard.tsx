'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getDailyDua } from '@/lib/duas';

export function DuaCard() {
  const { t } = useTranslation('common');
  const dua = useMemo(() => getDailyDua(new Date()), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex h-full flex-col rounded-[2rem] border border-emerald-200/70 bg-linear-to-br from-emerald-50/80 to-teal-50/50 p-7 dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-teal-950/30"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-emerald-500 text-lg">☽</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t('duaOfDay')}</p>
      </div>
      <p dir="rtl" className="mt-5 font-arabic text-4xl leading-14 text-right text-slate-900 dark:text-slate-100">
        {dua.arabic}
      </p>
      <p className="mt-4 text-sm italic text-slate-500 dark:text-slate-400 leading-relaxed">{dua.transliteration}</p>
      <p className="mt-4 flex-1 text-base leading-8 text-slate-700 dark:text-slate-300">{dua.translation}</p>
      <p className="mt-5 text-xs font-medium text-emerald-600 dark:text-emerald-500">— {dua.source}</p>
    </motion.div>
  );
}
