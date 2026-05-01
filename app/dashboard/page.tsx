'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { IslamicPattern } from '@/components/IslamicPattern';
import { ProgressRing } from '@/components/ProgressRing';
import { DuaCard } from '@/components/DuaCard';
import { HadithCard } from '@/components/HadithCard';
import { LastSessionCard } from '@/components/LastSessionCard';
import { WeeklyIntentionCard } from '@/components/WeeklyIntentionCard';
import { MonthlyTasks } from '@/components/MonthlyTasks';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { CalendarView } from '@/components/CalendarView';
import { StreakCounter } from '@/components/StreakCounter';
import { getCurrentJuz, getSurahsInJuz } from '@/lib/juzData';

type DailyLog = {
  id?: string;
  user_id: string;
  log_date: string;
  sabaq_done: boolean;
  sabqi_done: boolean;
  manzil_done: boolean;
};

function getDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatGregorian(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
}

function formatHijri(d: Date) {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(d);
  } catch { return ''; }
}

// Reusable section heading
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
      {children}
    </p>
  );
}

// Toggle switch
function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      {label && <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
          on ? 'bg-slate-800 dark:bg-slate-200' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

// Thin divider
function Divider() {
  return (
    <div className="flex items-center gap-4">
      <hr className="flex-1 border-slate-100 dark:border-slate-800/60" />
      <span className="text-xs text-slate-300 dark:text-slate-700">✦</span>
      <hr className="flex-1 border-slate-100 dark:border-slate-800/60" />
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation('common');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [completedSurahs, setCompletedSurahs] = useState<number[]>([]);
  const [showHijri, setShowHijri] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Ring 3 state from weekly intentions
  const [intentionsDone, setIntentionsDone] = useState(0);
  const [intentionsTotal, setIntentionsTotal] = useState(0);

  const today = useMemo(() => new Date(), []);
  const todayKey = getDateKey(today);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      setUserId(user.id);
      setUserName(
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split('@')[0].replace(/[._\-]+/g, ' ') ||
        ''
      );

      const [logsRes, progressRes] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('id,user_id,log_date,sabaq_done,sabqi_done,manzil_done')
          .eq('user_id', user.id)
          .order('log_date', { ascending: true }),
        supabase
          .from('surah_progress')
          .select('surah_number')
          .eq('user_id', user.id),
      ]);

      if (logsRes.data) {
        setLogs(
          [...logsRes.data].sort((a, b) => a.log_date.localeCompare(b.log_date)) as DailyLog[]
        );
      }
      if (progressRes.data) {
        setCompletedSurahs(
          progressRes.data.map((r: { surah_number: number }) => r.surah_number).sort((a: number, b: number) => a - b)
        );
      }
    }
    load();
  }, [todayKey]);

  // Ring calculations
  const ring1 = Math.min(100, Math.round((completedSurahs.length / 114) * 100));

  const currentJuz = getCurrentJuz(completedSurahs);
  const juzSurahs = getSurahsInJuz(currentJuz);
  const juzDone = juzSurahs.filter((s) => completedSurahs.includes(s)).length;
  const ring2 = juzSurahs.length ? Math.round((juzDone / juzSurahs.length) * 100) : 0;

  const ring3 = intentionsTotal > 0 ? Math.round((intentionsDone / intentionsTotal) * 100) : 0;

  const dateString = showHijri ? formatHijri(today) : formatGregorian(today);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <IslamicPattern />

      <div className="relative mx-auto w-full max-w-400 px-6 py-10 lg:px-16 lg:py-14">
        <div className="space-y-12">

          {/* ── 1. Greeting ──────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="mb-4 text-center">
              <p dir="rtl" className="font-arabic text-3xl leading-12 text-emerald-700 dark:text-emerald-400">
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </p>
            </div>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
              {t('greeting')}{userName ? `, ${userName}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-4">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
                {dateString || formatGregorian(today)}
              </h1>
              <Switch
                on={showHijri}
                onChange={() => setShowHijri((v) => !v)}
                label={showHijri ? t('hijri') : t('gregorian')}
              />
            </div>
          </motion.section>

          <Divider />

          {/* ── 2. Dua / Hadith ──────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
          >
            <SectionLabel>{t('todaysReflection')}</SectionLabel>
            <div className="grid gap-4 md:grid-cols-2">
              <DuaCard />
              <HadithCard />
            </div>
          </motion.section>

          <Divider />

          {/* ── 3. Last session / Weekly intentions ──────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="grid gap-10 lg:grid-cols-2"
          >
            <LastSessionCard userId={userId} />
            <WeeklyIntentionCard
              userId={userId}
              onStatsChange={(done, total) => {
                setIntentionsDone(done);
                setIntentionsTotal(total);
              }}
            />
          </motion.section>

          <Divider />

          {/* ── 3b. Streak counter ────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.13 }}
          >
            <SectionLabel>{t('streakCounter')}</SectionLabel>
            <StreakCounter logs={logs} />
          </motion.section>

          <Divider />

          {/* ── 4. Progress rings ─────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 }}
          >
            <SectionLabel>{t('progress')}</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-3">
              <ProgressRing
                label={t('overallQuran')}
                value={ring1}
                subtitle={`${completedSurahs.length} ${t('of')} 114 ${t('surahs')}`}
                detail={`${114 - completedSurahs.length} ${t('surahsRemaining')}`}
              />
              <ProgressRing
                label={`${t('currentJuz')} ${currentJuz}`}
                value={ring2}
                subtitle={`${juzDone} ${t('of')} ${juzSurahs.length} ${t('surahs')}`}
                detail={t('currentJuzProgress')}
              />
              <ProgressRing
                label={t('weeklyIntentionsRing')}
                value={ring3}
                subtitle={`${intentionsDone} ${t('of')} ${intentionsTotal}`}
                detail={intentionsTotal === 0 ? t('addIntentionsAbove') : `${intentionsTotal - intentionsDone} ${t('remainingThisWeek')}`}
              />
            </div>
          </motion.section>

          <Divider />

          {/* ── 5. Monthly goals ──────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
          >
            <MonthlyTasks userId={userId} />
          </motion.section>

          <Divider />

          {/* ── 6. Activity ───────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <SectionLabel>{t('activity')}</SectionLabel>
                <h2 className="-mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {new Date().getFullYear()} {t('atAGlance')}
                </h2>
              </div>
              <Switch
                on={showCalendar}
                onChange={() => setShowCalendar((v) => !v)}
                label={t('calendar')}
              />
            </div>

            {showCalendar ? (
              <div className="rounded-2xl border border-slate-100 bg-white/60 p-6 dark:border-slate-800/60 dark:bg-slate-900/40">
                <CalendarView logs={logs} />
              </div>
            ) : (
              <ActivityHeatmap logs={logs} />
            )}
          </motion.section>

        </div>
      </div>
    </div>
  );
}
