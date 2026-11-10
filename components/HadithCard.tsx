'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { langOf } from '@/lib/dates';
import { getDailyHadith, hadithSource } from '@/lib/hadiths';

// One hadith a day, the same for everyone, from the checked list in lib/hadiths.ts.
export function HadithCard() {
  const { t, i18n } = useTranslation('common');
  const lang = langOf(i18n.language);
  const hadith = getDailyHadith(new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="flex h-full flex-col rounded-[2rem] border border-amber-200/70 bg-linear-to-br from-amber-50/80 to-orange-50/40 p-7 dark:border-amber-900/40 dark:from-amber-950/40 dark:to-orange-950/20"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg text-amber-500">✦</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
          {t('hadithOfDay')}
        </p>
      </div>

      <p className="mt-5 flex-1 text-lg italic leading-9 text-slate-700 dark:text-slate-300">
        &ldquo;{hadith.text[lang]}&rdquo;
      </p>
      <p className="mt-5 text-xs font-medium text-amber-600 dark:text-amber-500">
        — {hadithSource(hadith, lang)}
      </p>
    </motion.div>
  );
}
