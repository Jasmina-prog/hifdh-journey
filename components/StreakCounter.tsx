'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

type DailyLog = { log_date: string; sabaq_done: boolean; sabqi_done: boolean; manzil_done: boolean };

function calcStreaks(logs: DailyLog[]): { current: number; best: number } {
  const active = new Set(
    logs.filter((l) => l.sabaq_done || l.sabqi_done || l.manzil_done).map((l) => l.log_date)
  );

  // Current streak: walk back from today (if today done) or yesterday (grace period)
  const today = new Date().toISOString().slice(0, 10);
  const cursor = new Date();
  if (!active.has(today)) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!active.has(key)) break;
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Personal best
  const sorted = [...active].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev) {
      const p = new Date(prev);
      p.setDate(p.getDate() + 1);
      run = p.toISOString().slice(0, 10) === d ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = d;
  }

  return { current, best };
}

export function StreakCounter({ logs }: { logs: DailyLog[] }) {
  const { t } = useTranslation('common');
  const { current, best } = useMemo(() => calcStreaks(logs), [logs]);

  return (
    <div className="flex flex-wrap gap-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 rounded-2xl border border-orange-200/70 bg-linear-to-br from-orange-50 to-amber-50/50 px-5 py-4 dark:border-orange-900/30 dark:from-orange-950/40 dark:to-amber-950/20"
      >
        <span className="text-3xl">🔥</span>
        <div>
          <p className="text-3xl font-bold leading-none text-slate-900 dark:text-slate-100">{current}</p>
          <p className="mt-0.5 text-xs font-medium text-orange-500">{t('daysInRow')}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="flex items-center gap-3 rounded-2xl border border-amber-200/70 bg-linear-to-br from-amber-50 to-yellow-50/50 px-5 py-4 dark:border-amber-900/30 dark:from-amber-950/40 dark:to-yellow-950/20"
      >
        <span className="text-3xl">⭐</span>
        <div>
          <p className="text-3xl font-bold leading-none text-slate-900 dark:text-slate-100">{best}</p>
          <p className="mt-0.5 text-xs font-medium text-amber-500">{t('personalBest')}</p>
        </div>
      </motion.div>
    </div>
  );
}
