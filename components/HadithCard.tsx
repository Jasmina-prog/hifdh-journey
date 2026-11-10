'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { langOf, localDateKey } from '@/lib/dates';
import { getDailyHadith, hadithSource } from '@/lib/hadiths';
import { fetchTranslation, loadDailyVerse } from '@/lib/dailyVerse';

type VerseResult  = { arabic: string; translation: string; verseKey: string };

function todayKey() {
  return localDateKey(new Date());
}

function cacheGet<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}

function cacheSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function HadithCard() {
  const { t, i18n } = useTranslation('common');

  const [verse,        setVerse]        = useState<VerseResult | null>(null);
  const [verseLoading, setVerseLoading] = useState(true);

  // ── Verse of the day ─────────────────────────────────────────────────────────
  // The Arabic comes from this app's own files and shows at once. The translation
  // arrives later if the outside service answers, and the card works without it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const daily = await loadDailyVerse(new Date());
        if (cancelled) return;
        const verseKey = `${daily.surah}:${daily.ayah}`;
        const cacheKey = `verse-translation-${todayKey()}-${verseKey}-${i18n.language}`;
        const cached = cacheGet<string>(cacheKey);
        setVerse({ arabic: daily.arabic, translation: cached ?? '', verseKey });
        setVerseLoading(false);
        if (cached) return;
        const translation = await fetchTranslation(daily.surah, daily.ayah, i18n.language);
        if (cancelled || !translation) return;
        cacheSet(cacheKey, translation);
        setVerse({ arabic: daily.arabic, translation, verseKey });
      } catch {
        if (!cancelled) setVerseLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [i18n.language]);

  // ── Hadith of the day: from lib/hadiths.ts, one per day for everyone ───────
  const lang = langOf(i18n.language);
  const hadith = getDailyHadith(new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="flex h-full flex-col rounded-[2rem] border border-amber-200/70 bg-linear-to-br from-amber-50/80 to-orange-50/40 p-7 dark:border-amber-900/40 dark:from-amber-950/40 dark:to-orange-950/20"
    >
      {/* ── Verse of the Day ── */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-amber-500 text-lg">✦</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
          {t('verseOfDay')}
        </p>
        {verse && (
          <p className="ml-auto text-[11px] text-amber-400 dark:text-amber-600">
            Quran {verse.verseKey}
          </p>
        )}
      </div>

      {verseLoading ? (
        <p className="mt-5 animate-pulse text-sm text-amber-400">{t('loadingVerse')}</p>
      ) : verse ? (
        <>
          <p dir="rtl" className="mt-5 font-arabic text-4xl leading-14 text-right text-slate-900 dark:text-slate-100">
            {verse.arabic}
          </p>
          {verse.translation ? (
            <p className="mt-4 flex-1 text-lg leading-9 italic text-slate-700 dark:text-slate-300">
              &ldquo;{verse.translation}&rdquo;
            </p>
          ) : (
            <div className="flex-1" />
          )}
        </>
      ) : (
        <p className="mt-5 flex-1 text-sm italic text-amber-400">
          {t('verseLoadError')}
        </p>
      )}

      {/* ── Hadith of the Day ── */}
      <div className="mt-5 border-t border-amber-100/70 pt-4 dark:border-amber-900/30">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-500 mb-2">
          {t('hadithOfDay')}
        </p>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-400">
          &ldquo;{hadith.text[lang]}&rdquo;
        </p>
        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-500">
          — {hadithSource(hadith, lang)}
        </p>
      </div>
    </motion.div>
  );
}
