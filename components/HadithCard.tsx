'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const FALLBACK_HADITHS = [
  { text: 'The best of you are those who learn the Quran and teach it.', ref: 'Sahih al-Bukhari 5027' },
  { text: 'Recite the Quran, for it will come as an intercessor for its companions on the Day of Resurrection.', ref: 'Sahih Muslim 804' },
  { text: 'He who recites the Quran and finds it difficult, doing his best, will have a double reward.', ref: 'Sahih al-Bukhari 4937' },
  { text: 'It will be said to the companion of the Quran: Recite and rise in rank. Your level will be at the last verse you recite.', ref: 'Abu Dawud 1464' },
  { text: 'The one who memorises the Quran — Allah will be with him, and his heart is never in need.', ref: 'Tirmidhi 2913' },
  { text: 'Whoever reads a letter from the Book of Allah will have a reward. And that reward will be multiplied by ten.', ref: 'Tirmidhi 2910' },
  { text: 'The Quran is an intercessor. Whoever puts it in front of him, it will lead him to Paradise.', ref: 'Ibn Hibban' },
];

type VerseResult = { arabic: string; translation: string; verseKey: string };

export function HadithCard() {
  const { t } = useTranslation('common');
  const [verse, setVerse] = useState<VerseResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const todayKey = new Date().toISOString().slice(0, 10);
      const cacheKey = `verse-of-day-${todayKey}`;

      // Serve cached verse for the day — only fetch once per calendar day
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed: VerseResult = JSON.parse(cached);
          if (!cancelled) { setVerse(parsed); setLoading(false); }
          return;
        }
      } catch {}

      // Fresh fetch — store result so it stays the same all day
      try {
        const res = await fetch(
          'https://api.quran.com/api/v4/verses/random?language=en&words=false&translations=131&fields=text_uthmani',
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (!cancelled && json?.verse) {
          const result: VerseResult = {
            arabic: json.verse.text_uthmani ?? '',
            translation: json.verse.translations?.[0]?.text ?? '',
            verseKey: json.verse.verse_key ?? '',
          };
          setVerse(result);
          try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch {}
        }
      } catch {}
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const dailyHadith = FALLBACK_HADITHS[Math.floor(Date.now() / 86400000) % FALLBACK_HADITHS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="flex h-full flex-col rounded-[2rem] border border-amber-200/70 bg-linear-to-br from-amber-50/80 to-orange-50/40 p-7 dark:border-amber-900/40 dark:from-amber-950/40 dark:to-orange-950/20"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-amber-500 text-lg">✦</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
          {loading ? 'Verse of the Day' : verse ? 'Verse of the Day' : t('hadith')}
        </p>
        {verse && <p className="ml-auto text-[11px] text-amber-400 dark:text-amber-600">Quran {verse.verseKey}</p>}
      </div>

      {loading ? (
        <p className="mt-5 animate-pulse text-sm text-amber-400">{t('loadingHadith')}</p>
      ) : verse ? (
        <>
          <p dir="rtl" className="mt-5 font-arabic text-4xl leading-14 text-right text-slate-900 dark:text-slate-100">
            {verse.arabic}
          </p>
          <p className="mt-4 flex-1 text-lg leading-9 italic text-slate-700 dark:text-slate-300">
            &ldquo;{verse.translation}&rdquo;
          </p>
        </>
      ) : (
        <>
          <p className="mt-5 flex-1 text-lg leading-9 text-slate-700 dark:text-slate-300">
            &ldquo;{dailyHadith.text}&rdquo;
          </p>
          <p className="mt-5 text-xs font-medium text-amber-500 dark:text-amber-600">— {dailyHadith.ref}</p>
        </>
      )}

      {verse && (
        <div className="mt-5 border-t border-amber-100/70 pt-4 dark:border-amber-900/30">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-500 mb-2">Hadith</p>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-400">&ldquo;{dailyHadith.text}&rdquo;</p>
          <p className="mt-2 text-[11px] text-amber-400 dark:text-amber-600">— {dailyHadith.ref}</p>
        </div>
      )}
    </motion.div>
  );
}
