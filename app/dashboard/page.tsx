'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { IslamicPattern } from '@/components/IslamicPattern';
import { ProgressRing } from '@/components/ProgressRing';
import { RandomVerse } from '@/components/RandomVerse';
import { SurahGrid } from '@/components/SurahGrid';
import { motion } from 'framer-motion';

const dailyTasks = [
  { id: 'sabaq', labelKey: 'sabaq', descriptionKey: 'sabaqDesc' },
  { id: 'sabqi', labelKey: 'sabqi', descriptionKey: 'sabqiDesc' },
  { id: 'manzil', labelKey: 'manzil', descriptionKey: 'manzilDesc' },
];

const hadiths = [
  'The Prophet ﷺ said: "The best of you are those who learn the Quran and teach it."',
  'The Prophet ﷺ said: "Recite the Quran, for it will come as an intercessor for its reciters."',
  'The Prophet ﷺ said: "He is not of us who does not recite the Quran."',
  'The Prophet ﷺ said: "The one who is proficient in the Quran will be with the noble righteous angels."',
  'The Prophet ﷺ said: "The Quran is a proof for you or against you."',
];

type DailyLog = {
  id?: string;
  user_id: string;
  log_date: string;
  sabaq_done: boolean;
  sabqi_done: boolean;
  manzil_done: boolean;
};

type SurahProgress = {
  surah_number: number;
};

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatGregorian(date: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatHijri(date: Date) {
  try {
    return new Intl.DateTimeFormat('en-US-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export default function DashboardPage() {
  const { t } = useTranslation('common');
  const [userName, setUserName] = useState('Friend');
  const [userId, setUserId] = useState<string | null>(null);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [progressCount, setProgressCount] = useState(0);
  const [completedSurahs, setCompletedSurahs] = useState<number[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [homework, setHomework] = useState('');
  const [homeworkSaved, setHomeworkSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeRing, setActiveRing] = useState<'overall' | 'juz' | 'week'>('overall');
  const [hadithIndex, setHadithIndex] = useState(0);

  const today = useMemo(() => new Date(), []);
  const todayKey = getDateKey(today);

  useEffect(() => {
    setHadithIndex(Math.floor(Date.now() / 86400000) % hadiths.length);
  }, []);
  const hadith = hadiths[hadithIndex];
  const hijriDate = formatHijri(today);
  const gregorianDate = formatGregorian(today);

  const taskState = useMemo(
    () => ({
      sabaq: log?.sabaq_done ?? false,
      sabqi: log?.sabqi_done ?? false,
      manzil: log?.manzil_done ?? false,
    }),
    [log]
  );

  const completionCount = Object.values(taskState).filter(Boolean).length;

  useEffect(() => {
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        setUserId(user.id);
        setUserName(
          (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string) ||
            user.email?.split('@')[0].replace(/\W+/g, ' ') ||
            'Friend'
        );

        const { data: logsData } = await supabase
          .from('daily_logs')
          .select('id,user_id,log_date,sabaq_done,sabqi_done,manzil_done')
          .eq('user_id', user.id)
          .order('log_date', { ascending: true });

        if (logsData) {
          const sortedLogs = [...logsData].sort((a, b) => a.log_date.localeCompare(b.log_date));
          setLogs(sortedLogs as DailyLog[]);
          const todayLog = sortedLogs.find((entry) => entry.log_date === todayKey);
          if (todayLog) setLog(todayLog as DailyLog);
        }

        const { data: progressData, error: progressError } = await supabase.from('surah_progress').select('surah_number');
        if (!progressError && progressData) {
          const surahs = (progressData as SurahProgress[]).map((entry) => entry.surah_number).sort((a, b) => a - b);
          setCompletedSurahs(surahs);
          setProgressCount(surahs.length);
          setSelectedSurah(surahs[0] ?? 1);
        }

        try {
          const { data: noteData } = await supabase
            .from('journal_entries')
            .select('note')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (noteData?.note) {
            setHomework(noteData.note);
          }
        } catch {
          const stored = window.localStorage.getItem(`hifdh-homework-${user.id}`);
          if (stored) setHomework(stored);
        }
      } catch (error) {
        console.error('Dashboard load error:', error);
      }
    }

    load();
  }, [todayKey]);

  const weeklyCompletion = useMemo(() => {
    const thisWeek = logs.filter((entry) => {
      const date = new Date(entry.log_date);
      const diff = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff < 7;
    });
    const totalDone = thisWeek.reduce((sum, entry) => sum + Number(entry.sabaq_done) + Number(entry.sabqi_done) + Number(entry.manzil_done), 0);
    return Math.round((totalDone / (7 * 3)) * 100);
  }, [logs, today]);

  const streak = useMemo(() => {
    if (!logs.length) return 0;
    const completedDates = new Set(logs.filter((entry) => entry.sabaq_done && entry.sabqi_done && entry.manzil_done).map((entry) => entry.log_date));
    let count = 0;
    const cursor = new Date(today);
    while (true) {
      const key = getDateKey(cursor);
      if (!completedDates.has(key)) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [logs, today]);

  const personalBest = useMemo(() => {
    if (!logs.length) return 0;
    const completedDates = logs
      .filter((entry) => entry.sabaq_done && entry.sabqi_done && entry.manzil_done)
      .map((entry) => entry.log_date)
      .sort();
    let best = 0;
    let current = 0;
    let previous: Date | null = null;
    for (const dateString of completedDates) {
      const date = new Date(dateString);
      if (!previous) {
        current = 1;
      } else {
        const diff = Math.round((date.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
        current = diff === 1 ? current + 1 : 1;
      }
      best = Math.max(best, current);
      previous = date;
    }
    return best;
  }, [logs]);

  const todaySummary = `${completionCount}/3 ${t('today').toLowerCase()}`;


  const saveLog = async (updated: DailyLog) => {
    if (!userId) return;
    setSaving(true);
    const row = {
      user_id: userId,
      log_date: todayKey,
      sabaq_done: updated.sabaq_done,
      sabqi_done: updated.sabqi_done,
      manzil_done: updated.manzil_done,
    };
    try {
      const { data: existing, error: selectError } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('log_date', todayKey)
        .maybeSingle();
      if (selectError) throw selectError;
      if (existing?.id) {
        await supabase.from('daily_logs').update(row).eq('id', existing.id);
      } else {
        await supabase.from('daily_logs').insert(row);
      }
    } catch (error) {
      console.error('Daily log save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (taskId: 'sabaq' | 'sabqi' | 'manzil') => {
    const updated: DailyLog = {
      user_id: userId ?? '',
      log_date: todayKey,
      sabaq_done: taskState.sabaq,
      sabqi_done: taskState.sabqi,
      manzil_done: taskState.manzil,
      ...(log ?? {}),
    };
    updated[`${taskId}_done` as 'sabaq_done' | 'sabqi_done' | 'manzil_done'] = !taskState[taskId];
    setLog(updated);
    setLogs((current) => {
      const existing = current.find((entry) => entry.log_date === todayKey);
      if (!existing) return [...current, updated];
      return current.map((entry) => (entry.log_date === todayKey ? updated : entry));
    });
    await saveLog(updated);
  };

  const toggleSurahCompletion = async (surahNumber: number) => {
    if (!userId) return;
    const isComplete = completedSurahs.includes(surahNumber);
    setCompletedSurahs((current) =>
      isComplete ? current.filter((entry) => entry !== surahNumber) : [...current, surahNumber].sort((a, b) => a - b)
    );

    try {
      if (isComplete) {
        await supabase.from('surah_progress').delete().match({ user_id: userId, surah_number: surahNumber });
      } else {
        await supabase.from('surah_progress').insert({ user_id: userId, surah_number: surahNumber });
      }
    } catch (error) {
      console.error('Surah save error:', error);
    }
  };

  const saveHomework = async (text: string) => {
    setHomework(text);
    setHomeworkSaved(true);
    window.localStorage.setItem(`hifdh-homework-${userId ?? 'guest'}`, text);
    if (!userId) return;

    try {
      await supabase.from('journal_entries').upsert(
        { user_id: userId, entry_date: todayKey, note: text },
        { onConflict: 'user_id,entry_date' }
      );
    } catch (error) {
      console.error('Homework save error:', error);
    }
  };

  const overallPercent = Math.min(100, Math.round((completedSurahs.length / 114) * 100));
  const currentJuzPercent = overallPercent;
  const selectedSurahProgress = completedSurahs.includes(selectedSurah);
  const estimatedCompletionDate = useMemo(() => {
    const remain = 114 - progressCount;
    const pace = Math.max(1, Math.round((streak || 1) / 2));
    const date = new Date(today);
    date.setDate(date.getDate() + Math.ceil(remain / pace));
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [progressCount, streak, today]);

  const ringDetails = {
    overall: `${completedSurahs.length} of 114 surahs memorized`,
    juz: `Today’s pace keeps you on track to finish by ${estimatedCompletionDate}`,
    week: `${weeklyCompletion}% of weekly review tasks complete`,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <IslamicPattern />
      <div className="mx-auto w-full max-w-[1800px] px-6 py-8 lg:px-12 lg:py-12">
        <motion.section
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/90"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t('greeting')}, {userName}</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-5xl">
                {hijriDate} · {gregorianDate}
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">{hadith}</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-6 py-5 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t('today')}</p>
              <p className="mt-4 text-3xl font-semibold text-slate-950 dark:text-slate-100">{todaySummary}</p>
              {saving && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('saving')}</p>}
            </div>
          </div>
          <div className="mt-8">
            <RandomVerse />
          </div>
        </motion.section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.8fr_1fr]">
          <motion.article
            initial={{ x: -20 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.30em] text-slate-500 dark:text-slate-400">{t('streakCounter')}</p>
                <h2 className="text-3xl font-semibold text-slate-950 dark:text-slate-100">{t('keepChain')}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-slate-50 p-5 text-center text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t('daysInRow')}</p>
                  <motion.p
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 280, delay: 0.4 }}
                    className="mt-3 text-5xl font-semibold text-slate-950 dark:text-slate-100"
                  >
                    {streak}
                  </motion.p>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 p-5 text-center text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t('personalBest')}</p>
                  <motion.p
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 280, delay: 0.6 }}
                    className="mt-3 text-5xl font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    {personalBest}
                  </motion.p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <ProgressRing
                label={t('overallQuran')}
                value={overallPercent}
                subtitle={`${overallPercent}% ${t('complete')}`}
                detail={ringDetails.overall}
                active={activeRing === 'overall'}
                onClick={() => setActiveRing('overall')}
              />
              <ProgressRing
                label={t('currentJuz')}
                value={currentJuzPercent}
                subtitle={`${currentJuzPercent}% ${t('estimated')}`}
                detail={ringDetails.juz}
                active={activeRing === 'juz'}
                onClick={() => setActiveRing('juz')}
              />
              <ProgressRing
                label={t('weeklyGoal')}
                value={weeklyCompletion}
                subtitle={`${weeklyCompletion}% ${t('complete')}`}
                detail={ringDetails.week}
                active={activeRing === 'week'}
                onClick={() => setActiveRing('week')}
              />
            </div>

            <div className="mt-10 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950 dark:text-slate-100">Surah Memorization Grid</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Tap a Surah to mark it memorized or paused. Completed Surahs glow with a calm finish color.
                  </p>
                </div>
                <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                  <p>{completedSurahs.length} / 114</p>
                  <p>{114 - completedSurahs.length} remaining</p>
                </div>
              </div>
              <div className="mt-6">
                <SurahGrid
                  completedSurahs={completedSurahs}
                  selectedSurah={selectedSurah}
                  onSelect={(surah) => setSelectedSurah(surah)}
                />
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Surah Focus</p>
                    <h4 className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-100">Surah {selectedSurah}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSurahCompletion(selectedSurah)}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    {selectedSurahProgress ? 'Mark Review' : 'Mark Memorized'}
                  </button>
                </div>
              </div>
            </div>
          </motion.article>

          <aside className="space-y-6">
            <motion.div
              initial={{ x: 20 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Daily Checklist</p>
                    <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-100">{t('todayTasks')}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                    {completionCount}/3
                  </span>
                </div>

                {dailyTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleTask(task.id as 'sabaq' | 'sabqi' | 'manzil')}
                    className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${taskState[task.id as 'sabaq' | 'sabqi' | 'manzil'] ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-100' : 'border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{t(task.labelKey)}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{t(task.descriptionKey)}</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                        {taskState[task.id as 'sabaq' | 'sabqi' | 'manzil'] ? 'Done' : 'Pending'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Homework</p>
                  <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-100">Plan your review</h2>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">{homeworkSaved ? 'Saved' : 'Draft'}</span>
              </div>
              <textarea
                value={homework}
                onChange={(event) => { setHomework(event.target.value); setHomeworkSaved(false); }}
                rows={6}
                className="mt-5 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-950 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                placeholder="Write your next review target, verses to repeat, or who to share your progress with."
              />
              <button
                type="button"
                onClick={() => saveHomework(homework)}
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Save homework note
              </button>
            </motion.div>
          </aside>
        </section>
      </div>
    </div>
  );
}
