'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
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

type SessionInfo = {
  lastDate: string | null;
  currentSurah: number | null;
};

export function LastSessionCard({ userId }: { userId: string | null }) {
  const { t } = useTranslation('common');
  const [info, setInfo] = useState<SessionInfo>({ lastDate: null, currentSurah: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    async function load() {
      const [logsRes, progressRes] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('log_date')
          .eq('user_id', userId)
          .or('sabaq_done.eq.true,sabqi_done.eq.true,manzil_done.eq.true')
          .order('log_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('surah_progress')
          .select('surah_number, last_reviewed')
          .eq('user_id', userId)
          .order('last_reviewed', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setInfo({
        lastDate: logsRes.data?.log_date ?? null,
        currentSurah: progressRes.data?.surah_number ?? null,
      });
      setLoading(false);
    }

    load();
  }, [userId]);

  const surahName = info.currentSurah ? SURAH_NAMES[info.currentSurah - 1] : null;
  const juz = info.currentSurah ? SURAH_TO_JUZ[info.currentSurah] : null;

  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t('whereILeftOff')}</p>

      {loading ? (
        <p className="mt-4 text-base text-slate-400 animate-pulse">{t('loadingSession')}</p>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-3">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('lastSession')}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {info.lastDate ? daysAgo(info.lastDate, t) : t('noSessionsYet')}
            </p>
          </div>

          {surahName && (
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('currentlyOn')}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {surahName} ({info.currentSurah})
              </p>
              {juz && (
                <p className="text-base text-slate-500 dark:text-slate-400">Juz {juz}</p>
              )}
            </div>
          )}

          <div className="mt-auto">
            <Link
              href={surahName ? `/map?surah=${info.currentSurah}` : '/map'}
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
