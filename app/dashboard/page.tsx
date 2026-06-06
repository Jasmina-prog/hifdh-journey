'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ProgressRing } from '@/components/ProgressRing';
import { DuaCard } from '@/components/DuaCard';
import { HadithCard } from '@/components/HadithCard';
import { LastSessionCard } from '@/components/LastSessionCard';
import { WeeklyIntentionCard } from '@/components/WeeklyIntentionCard';
import { MonthlyTasks } from '@/components/MonthlyTasks';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { JUZ_TO_SURAHS, SURAH_TO_JUZ } from '@/lib/juzData';

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
    return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
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

// Thin divider with gold gradient
function Divider() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #c9943a)' }} />
      <span className="text-sm text-amber-500/70 dark:text-amber-400/60">✦</span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #c9943a)' }} />
    </div>
  );
}

type ProgressRow = { surah_number: number; status: string; last_reviewed: string | null };

// Merge Supabase/dashboard-cache rows with the map page's localStorage cache.
// For each surah, keeps whichever entry has the newer last_reviewed so that
// "Mark as Last Read" changes on the map page are reflected immediately.
function mergeWithMapCache(uid: string, rows: ProgressRow[]): ProgressRow[] {
  try {
    const raw = localStorage.getItem(`hifdh-map-progress-${uid}`);
    if (!raw) return rows;
    const mapCache = JSON.parse(raw) as Record<string, { status: string; last_reviewed: string | null }>;
    const map = new Map<number, ProgressRow>(rows.map((r) => [r.surah_number, r]));
    for (const [key, entry] of Object.entries(mapCache)) {
      const num = Number(key);
      const existing = map.get(num);
      const existingTime = existing?.last_reviewed ? new Date(existing.last_reviewed).getTime() : 0;
      const entryTime = entry.last_reviewed ? new Date(entry.last_reviewed).getTime() : 0;
      if (!existing || entryTime > existingTime) {
        map.set(num, { surah_number: num, status: entry.status, last_reviewed: entry.last_reviewed });
      }
    }
    return [...map.values()];
  } catch {
    return rows;
  }
}

export default function DashboardPage() {
  const { t } = useTranslation('common');
  const [userName, setUserName] = useState(() => {
    try { return localStorage.getItem('hifdh-last-user-name') ?? ''; } catch { return ''; }
  });
  const [userId, setUserId] = useState<string | null>(() => {
    try { return localStorage.getItem('hifdh-last-user-id'); } catch { return null; }
  });
  const [progressRows, setProgressRows] = useState<{ surah_number: number; status: string; last_reviewed: string | null }[]>([]);
  const [lastSession, setLastSession] = useState<{ surahNumber: number; at: string } | null>(() => {
    try {
      const uid = localStorage.getItem('hifdh-last-user-id');
      if (!uid) return null;
      return JSON.parse(localStorage.getItem(`hifdh-last-session-${uid}`) || 'null');
    } catch { return null; }
  });
  const [showHijri, setShowHijri] = useState(false);
  const [manualJuz, setManualJuz] = useState<number | null>(null);

  // Ring 3 state from weekly intentions
  const [intentionsDone, setIntentionsDone] = useState(0);
  const [intentionsTotal, setIntentionsTotal] = useState(0);

  const today = useMemo(() => new Date(), []);
  const todayKey = getDateKey(today);

  useEffect(() => {
    // Restore manual juz selection from localStorage
    try {
      const saved = localStorage.getItem('hifdh-target-juz');
      if (saved) setManualJuz(parseInt(saved));
    } catch {}

    // Load cached data synchronously before any network call so rings appear instantly.
    // Also merge with the map page's localStorage cache so recent "mark as last read"
    // changes appear even before the Supabase fetch completes.
    try {
      const cachedUid = localStorage.getItem('hifdh-last-user-id');
      if (cachedUid) {
        const cached = JSON.parse(localStorage.getItem(`hifdh-dash-${cachedUid}`) || 'null');
        if (cached?.progressRows?.length) {
          setProgressRows(mergeWithMapCache(cachedUid, cached.progressRows));
        }
      }
    } catch {}

    function extractName(user: { user_metadata?: Record<string, unknown>; email?: string }) {
      return (
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split('@')[0].replace(/[._\-]+/g, ' ') ||
        ''
      );
    }

    async function load() {
      // getSession() reads from local storage — no network round-trip
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        try { localStorage.setItem('hifdh-last-user-id', session.user.id); } catch {}
        const name = extractName(session.user);
        if (name) {
          setUserName(name);
          try { localStorage.setItem('hifdh-last-user-name', name); } catch {}
        }
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      setUserId(user.id);
      try {
        localStorage.setItem('hifdh-last-user-id', user.id);
        const session = JSON.parse(localStorage.getItem(`hifdh-last-session-${user.id}`) || 'null');
        if (session) setLastSession(session);
      } catch {}
      const name = extractName(user);
      setUserName(name);
      try { if (name) localStorage.setItem('hifdh-last-user-name', name); } catch {}

      const { data: progressData } = await supabase
        .from('surah_progress')
        .select('surah_number,status,last_reviewed')
        .eq('user_id', user.id);

      const newProgress = progressData as { surah_number: number; status: string; last_reviewed: string | null }[] | null;

      if (newProgress) {
        // Merge Supabase result with map page's localStorage so local changes win
        // when Supabase hasn't received them yet.
        const merged = mergeWithMapCache(user.id, newProgress);
        setProgressRows(merged);
        try {
          localStorage.setItem(`hifdh-dash-${user.id}`, JSON.stringify({ progressRows: merged }));
        } catch {}
      }
    }
    load();
  }, [todayKey]);

  // Ring calculations
  const memorizedSurahs = progressRows.filter((r) => r.status === 'memorized').map((r) => r.surah_number);
  const ring1 = Math.min(100, Math.round((memorizedSurahs.length / 114) * 100));

  const mostRecent = [...progressRows]
    .filter((r) => r.last_reviewed)
    .sort((a, b) => new Date(b.last_reviewed!).getTime() - new Date(a.last_reviewed!).getTime())[0];
  const autoJuz = mostRecent ? (SURAH_TO_JUZ[mostRecent.surah_number] ?? 1) : 1;
  const currentJuz = manualJuz ?? autoJuz;
  const juzSurahs = JUZ_TO_SURAHS[currentJuz] ?? [];
  const memorizedSet = new Set(memorizedSurahs);
  const juzDone = juzSurahs.filter((s: number) => memorizedSet.has(s)).length;
  const ring2 = juzSurahs.length ? Math.round((juzDone / juzSurahs.length) * 100) : 0;

  const ring3 = intentionsTotal > 0 ? Math.round((intentionsDone / intentionsTotal) * 100) : 0;

  function setTargetJuz(juz: number) {
    setManualJuz(juz);
    try { localStorage.setItem('hifdh-target-juz', String(juz)); } catch {}
  }
  function clearTargetJuz() {
    setManualJuz(null);
    try { localStorage.removeItem('hifdh-target-juz'); } catch {}
  }

  const dateString = showHijri ? formatHijri(today) : formatGregorian(today);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="relative mx-auto w-full max-w-400 px-6 py-10 lg:px-16 lg:py-14">
        <div className="space-y-12">

          {/* ── 1. Greeting ──────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="mb-4 text-center">
              <p
                dir="rtl"
                className="font-arabic text-5xl leading-20 select-none"
                style={{
                  background: 'linear-gradient(135deg, #f0d060 0%, #d4a820 30%, #c9943a 60%, #8b6510 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 2px 6px rgba(180,130,10,0.25))',
                }}
              >
                السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ
              </p>
            </div>
            <p className="text-base font-medium text-slate-400 dark:text-slate-500">
              {t('greeting')}{userName ? `, ${userName}` : ''}
            </p>
            <h1 className="mt-2 text-5xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl">
              {dateString || formatGregorian(today)}
            </h1>
            <div className="mt-2">
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

          {/* ── 3. Last session / Activity heatmap ───────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="grid gap-10 lg:grid-cols-2"
          >
            <LastSessionCard progressRows={progressRows} lastSession={lastSession} />
            <div className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div>
                <SectionLabel>{t('activity')}</SectionLabel>
                <p className="-mt-3 mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {new Date().getFullYear()} {t('atAGlance')}
                </p>
              </div>
              <ActivityHeatmap progressRows={progressRows} />
            </div>
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
                subtitle={`${memorizedSurahs.length} ${t('of')} 114 ${t('surahs')}`}
                detail={`${114 - memorizedSurahs.length} ${t('surahsRemaining')}`}
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

            {/* Juz selector */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Studying Juz
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setTargetJuz(j)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                      currentJuz === j
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {j}
                  </button>
                ))}
              </div>
              {manualJuz && (
                <button
                  type="button"
                  onClick={clearTargetJuz}
                  className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  auto-detect
                </button>
              )}
            </div>
          </motion.section>

          <Divider />

          {/* ── 5. Monthly goals + Weekly intentions ─────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="grid items-stretch gap-10 lg:grid-cols-2"
          >
            <MonthlyTasks userId={userId} />
            <WeeklyIntentionCard
              userId={userId}
              onStatsChange={(done, total) => {
                setIntentionsDone(done);
                setIntentionsTotal(total);
              }}
            />
          </motion.section>

        </div>
      </div>
    </div>
  );
}
