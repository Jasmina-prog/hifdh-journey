'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

type VerseResult  = { arabic: string; translation: string; verseKey: string };
type HadithResult = { text: string; ref: string };

const DAILY_HADITHS: HadithResult[] = [
  { text: 'The best of you are those who learn the Quran and teach it.', ref: 'Sahih al-Bukhari 5027' },
  { text: 'Recite the Quran, for it will come as an intercessor for its companions on the Day of Resurrection.', ref: 'Sahih Muslim 804' },
  { text: 'He who recites the Quran and finds it difficult, doing his best, will have a double reward.', ref: 'Sahih al-Bukhari 4937' },
  { text: 'It will be said to the companion of the Quran: Recite and rise in rank. Your level will be at the last verse you recite.', ref: 'Abu Dawud 1464' },
  { text: 'The one who memorises the Quran and acts upon it, Allah will crown his parents on the Day of Resurrection with a light brighter than the sun.', ref: 'Abu Dawud 1453' },
  { text: 'Whoever reads a letter from the Book of Allah will have a reward. And that reward will be multiplied by ten.', ref: 'Tirmidhi 2910' },
  { text: 'The Quran is an intercessor and its intercession is accepted, and whoever puts it in front of him, it will lead him to Paradise.', ref: 'Ibn Hibban' },
  { text: 'Envy is not permitted except in two cases: a man whom Allah has taught the Quran and he recites it night and day; and a man whom Allah has given wealth and he spends it night and day.', ref: 'Sahih al-Bukhari 5026' },
  { text: 'The one who is proficient in the recitation of the Quran will be with the honourable and obedient scribes (angels), and he who recites the Quran and finds it difficult will have a double reward.', ref: 'Sahih Muslim 798' },
  { text: 'Keep refreshing your knowledge of the Quran, for by the One in Whose Hand is my soul, it is more liable to escape than camels from their hobbles.', ref: 'Sahih al-Bukhari 5033' },
  { text: 'Whoever recites ten ayat in qiyam will not be recorded as one of the forgetful.', ref: 'Abu Dawud 1398' },
  { text: 'It is not allowed for a person to aspire to be better than another except in two cases: a man Allah has given the Quran, and he recites it day and night.', ref: 'Sahih al-Bukhari 73' },
  { text: 'The heart that has no Quran in it is like a ruined house.', ref: 'Tirmidhi 2913' },
  { text: 'Adorn the Quran with your voices.', ref: 'Abu Dawud 1468' },
  { text: 'Whoever recites the Quran, memorises it, and regards its lawful as lawful and its prohibited as prohibited, Allah will admit him to Paradise.', ref: 'Tirmidhi 2905' },
  { text: 'The best worship of my ummah is the recitation of the Quran.', ref: 'Bayhaqi, Shu\'ab al-Iman' },
  { text: 'Do not wish to be like anyone except in two cases: a person whom Allah has given wealth and he spends it righteously; and a person whom Allah has given wisdom and he acts according to it and teaches it to others.', ref: 'Sahih al-Bukhari 73' },
  { text: 'Indeed, Allah elevates some people with this Quran and abases others with it.', ref: 'Sahih Muslim 817' },
  { text: 'Whoever recites Ayat al-Kursi after every obligatory prayer, nothing will prevent him from entering Paradise except death.', ref: 'Nasa\'i, al-Kubra' },
  { text: 'Make your homes into places of prayer and do not make them into graves. Verily, the shaytan flees from a house in which Surat al-Baqarah is recited.', ref: 'Sahih Muslim 780' },
];


function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function cacheGet<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}

function cacheSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function HadithCard() {
  const { t } = useTranslation('common');

  const [verse,        setVerse]        = useState<VerseResult | null>(null);
  const [hadith,       setHadith]       = useState<HadithResult | null>(null);
  const [verseLoading, setVerseLoading] = useState(true);
  const [hadithLoading,setHadithLoading]= useState(true);

  // ── Verse of the day ─────────────────────────────────────────────────────────
  useEffect(() => {
    const key = `verse-of-day-${todayKey()}`;
    const cached = cacheGet<VerseResult>(key);
    if (cached) { setVerse(cached); setVerseLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          'https://api.quran.com/api/v4/verses/random?language=en&words=false&translations=131&fields=text_uthmani',
          { cache: 'no-store' },
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled && json?.verse) {
          const result: VerseResult = {
            arabic:      json.verse.text_uthmani ?? '',
            translation: json.verse.translations?.[0]?.text ?? '',
            verseKey:    json.verse.verse_key ?? '',
          };
          setVerse(result);
          cacheSet(key, result);
        }
      } catch {}
      if (!cancelled) setVerseLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Hadith of the day — picked from local list, rotates daily ────────────────
  useEffect(() => {
    const dayIndex = Math.floor(Date.now() / 86400000);
    setHadith(DAILY_HADITHS[dayIndex % DAILY_HADITHS.length]);
    setHadithLoading(false);
  }, []);

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
        <p className="mt-5 flex-1 text-sm italic text-amber-400">
          {t('verseLoadError')}
        </p>
      )}

      {/* ── Hadith of the Day ── */}
      <div className="mt-5 border-t border-amber-100/70 pt-4 dark:border-amber-900/30">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-500 mb-2">
          {t('hadithOfDay')}
        </p>
        {hadithLoading ? (
          <p className="animate-pulse text-sm text-amber-400">{t('loadingHadith')}</p>
        ) : hadith ? (
          <>
            <p className="text-base leading-7 text-slate-600 dark:text-slate-400">
              &ldquo;{hadith.text}&rdquo;
            </p>
            <p className="mt-2 text-[11px] text-amber-400 dark:text-amber-600">
              — {hadith.ref}
            </p>
          </>
        ) : null}
      </div>
    </motion.div>
  );
}
