'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { SURAH_TO_JUZ } from '@/lib/juzData';

const SURAH_NAMES = [
  'Al-Fatihah','Al-Baqarah','Ali \'Imran','An-Nisa\'','Al-Ma\'idah','Al-An\'am','Al-A\'raf','Al-Anfal','At-Tawbah','Yunus',
  'Hud','Yusuf','Ar-Ra\'d','Ibrahim','Al-Hijr','An-Nahl','Al-Isra\'','Al-Kahf','Maryam','Ta-Ha',
  'Al-Anbiya\'','Al-Hajj','Al-Mu\'minun','An-Nur','Al-Furqan','Ash-Shu\'ara\'','An-Naml','Al-Qasas','Al-\'Ankabut','Ar-Rum',
  'Luqman','As-Sajdah','Al-Ahzab','Saba\'','Fatir','Ya-Sin','As-Saffat','Sad','Az-Zumar','Ghafir',
  'Fussilat','Ash-Shura','Az-Zukhruf','Ad-Dukhan','Al-Jathiyah','Al-Ahqaf','Muhammad','Al-Fath','Al-Hujurat','Qaf',
  'Adh-Dhariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahman','Al-Waqi\'ah','Al-Hadid','Al-Mujadilah','Al-Hashr','Al-Mumtahanah',
  'As-Saff','Al-Jumu\'ah','Al-Munafiqun','At-Taghabun','At-Talaq','At-Tahrim','Al-Mulk','Al-Qalam','Al-Haqqah','Al-Ma\'arij',
  'Nuh','Al-Jinn','Al-Muzzammil','Al-Muddaththir','Al-Qiyamah','Al-Insan','Al-Mursalat','An-Naba\'','An-Nazi\'at','Abasa',
  'At-Takwir','Al-Infitar','Al-Mutaffifin','Al-Inshiqaq','Al-Buruj','At-Tariq','Al-A\'la','Al-Ghashiyah','Al-Fajr','Al-Balad',
  'Ash-Shams','Al-Lail','Ad-Duha','Ash-Sharh','At-Tin','Al-\'Alaq','Al-Qadr','Al-Bayyinah','Az-Zalzalah','Al-\'Adiyat',
  'Al-Qari\'ah','At-Takathur','Al-\'Asr','Al-Humazah','Al-Fil','Quraysh','Al-Ma\'un','Al-Kawthar','Al-Kafirun','An-Nasr',
  'Al-Masad','Al-Ikhlas','Al-Falaq','An-Nas',
];

function daysAgo(dateStr: string, t: (k: string) => string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return t('today');
  if (diff === 1) return t('yesterday');
  return `${diff} ${t('daysAgo')}`;
}

type ProgressRow = { surah_number: number; status: string; last_reviewed: string | null };

export function LastSessionCard({
  progressRows,
  lastSession,
}: {
  progressRows: ProgressRow[];
  lastSession?: { surahNumber: number; at: string } | null;
}) {
  const { t } = useTranslation('common');

  // Use the explicitly bookmarked surah first; fall back to most recently
  // touched surah with a non-default status.
  const surahNumber: number | null = lastSession?.surahNumber ?? (
    [...progressRows]
      .filter((r) => r.status !== 'not_started')
      .sort((a, b) => {
        if (!a.last_reviewed && !b.last_reviewed) return 0;
        if (!a.last_reviewed) return 1;
        if (!b.last_reviewed) return -1;
        return new Date(b.last_reviewed).getTime() - new Date(a.last_reviewed).getTime();
      })[0]?.surah_number ?? null
  );

  const lastReviewed: string | null = lastSession?.at ??
    progressRows.find((r) => r.surah_number === surahNumber)?.last_reviewed ?? null;
  const surahName = surahNumber ? SURAH_NAMES[surahNumber - 1] : null;
  const juz = surahNumber ? SURAH_TO_JUZ[surahNumber] : null;

  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t('whereILeftOff')}</p>

      {surahName ? (
        <div className="mt-4 flex flex-1 flex-col gap-1">
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{surahName}</p>
          <p className="text-base text-slate-500 dark:text-slate-400">
            Surah {surahNumber} · Juz {juz}
          </p>
          {lastReviewed && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {daysAgo(lastReviewed, t)}
            </p>
          )}
          <div className="mt-auto pt-4">
            <Link
              href={`/map?surah=${surahNumber}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {t('goToMushaMap')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-3">
          <p className="text-base text-slate-400">{t('noSessionsYet')}</p>
          <div className="mt-auto">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {t('goToMushaMap')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
