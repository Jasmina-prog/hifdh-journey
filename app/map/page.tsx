'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { SURAH_TO_JUZ, getSurahsInJuz } from '@/lib/juzData';

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'memorized' | 'in_progress' | 'weak' | 'not_started';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type SurahMeta = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
};

type SurahProgress = {
  surah_number: number;
  status: Status;
  notes: string;
  last_reviewed: string | null;
  confidence: number;
};

type ProgressMap = Map<number, SurahProgress>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { label: string; labelKey: string; dot: string; bg: string; border: string; text: string }> = {
  memorized:   { label: 'Memorised',    labelKey: 'memorised',   dot: 'bg-emerald-500',                  bg: 'bg-emerald-50 dark:bg-emerald-950/30',    border: 'border-emerald-300 dark:border-emerald-800',  text: 'text-emerald-700 dark:text-emerald-400' },
  in_progress: { label: 'In Progress',  labelKey: 'inProgress',  dot: 'bg-amber-400',                    bg: 'bg-amber-50 dark:bg-amber-950/30',         border: 'border-amber-300 dark:border-amber-800',      text: 'text-amber-700 dark:text-amber-400' },
  weak:        { label: 'Needs Review', labelKey: 'needsReview', dot: 'bg-red-400',                      bg: 'bg-red-50 dark:bg-red-950/30',             border: 'border-red-300 dark:border-red-800',          text: 'text-red-700 dark:text-red-400' },
  not_started: { label: 'Not Started',  labelKey: 'notStarted',  dot: 'bg-slate-300 dark:bg-slate-600',  bg: 'bg-slate-50 dark:bg-slate-900/40',         border: 'border-slate-200 dark:border-slate-800',      text: 'text-slate-500 dark:text-slate-400' },
};

function daysAgo(dateStr: string | null, neverLabel: string): string {
  if (!dateStr) return neverLabel;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const USER_ID_CACHE_KEY = 'hifdh-last-user-id';
const progressKey = (uid: string) => `hifdh-map-progress-${uid}`;

function getCachedUserId(): string | null {
  try { return localStorage.getItem(USER_ID_CACHE_KEY); } catch { return null; }
}

function loadLocalProgress(uid: string): ProgressMap {
  try {
    const raw = localStorage.getItem(progressKey(uid));
    if (!raw) return new Map();
    const obj: Record<string, SurahProgress> = JSON.parse(raw);
    return new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));
  } catch { return new Map(); }
}

function saveLocalProgress(uid: string, map: ProgressMap) {
  try {
    const obj: Record<string, SurahProgress> = {};
    map.forEach((v, k) => { obj[String(k)] = v; });
    localStorage.setItem(progressKey(uid), JSON.stringify(obj));
  } catch {}
}

// ─── Robust upsert (works with and without the DB migration) ──────────────────

async function robustUpsert(
  uid: string,
  surahNumber: number,
  patch: { status?: Status; notes?: string; last_reviewed?: string; confidence?: number },
): Promise<{ error: string | null }> {
  // Try the full upsert (requires migration + unique constraint)
  const { error: e1 } = await supabase
    .from('surah_progress')
    .upsert(
      { user_id: uid, surah_number: surahNumber, ...patch },
      { onConflict: 'user_id,surah_number' },
    );
  if (!e1) return { error: null };

  // Fallback: manual select → update or insert (no unique constraint needed)
  const { data: existing } = await supabase
    .from('surah_progress')
    .select('id')
    .eq('user_id', uid)
    .eq('surah_number', surahNumber)
    .maybeSingle();

  // Determine which columns actually exist (minimal safe set if migration not done)
  const safeBase = { last_reviewed: patch.last_reviewed ?? new Date().toISOString() };
  const fullPatch = { ...safeBase, ...patch };

  if (existing) {
    const { error: e2 } = await supabase
      .from('surah_progress')
      .update(fullPatch)
      .eq('id', (existing as { id: string }).id);
    if (!e2) return { error: null };
    // Last resort: only update last_reviewed (original column that always exists)
    const { error: e3 } = await supabase
      .from('surah_progress')
      .update(safeBase)
      .eq('id', (existing as { id: string }).id);
    return { error: e3?.message ?? null };
  } else {
    const { error: e2 } = await supabase
      .from('surah_progress')
      .insert({ user_id: uid, surah_number: surahNumber, ...fullPatch });
    if (!e2) return { error: null };
    // Last resort: insert with only original columns
    const { error: e3 } = await supabase
      .from('surah_progress')
      .insert({ user_id: uid, surah_number: surahNumber, ...safeBase });
    return { error: e3?.message ?? null };
  }
}

// ─── Motion variants ──────────────────────────────────────────────────────────

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } };

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const { t } = useTranslation('common');

  // Pre-seed userId from cache so progress loads on first render without waiting for auth
  const [userId, setUserId] = useState<string | null>(() => getCachedUserId());
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [progress, setProgress] = useState<ProgressMap>(() => {
    const cached = getCachedUserId();
    return cached ? loadLocalProgress(cached) : new Map();
  });
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [view, setView] = useState<'grid' | 'juz'>('grid');
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [panelNotes, setPanelNotes] = useState('');
  const [panelStatus, setPanelStatus] = useState<Status>('not_started');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth: confirm session, update cache ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      if (uid && uid !== userId) {
        setUserId(uid);
        try { localStorage.setItem(USER_ID_CACHE_KEY, uid); } catch {}
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Surah metadata ──
  useEffect(() => {
    async function loadMeta() {
      try {
        const cached = localStorage.getItem('surah-meta-v1');
        if (cached) { setSurahs(JSON.parse(cached)); setLoadingMeta(false); return; }
      } catch {}
      try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
        if (!res.ok) throw new Error();
        const json = await res.json();
        const data: SurahMeta[] = (json.data ?? []).map((s: Record<string, unknown>) => ({
          number: s.number as number, name: s.name as string,
          englishName: s.englishName as string,
          englishNameTranslation: s.englishNameTranslation as string,
          numberOfAyahs: s.numberOfAyahs as number, revelationType: s.revelationType as string,
        }));
        setSurahs(data);
        try { localStorage.setItem('surah-meta-v1', JSON.stringify(data)); } catch {}
      } catch {
        setSurahs(Array.from({ length: 114 }, (_, i) => ({
          number: i + 1, name: '', englishName: `Surah ${i + 1}`,
          englishNameTranslation: '', numberOfAyahs: 0, revelationType: '',
        })));
      }
      setLoadingMeta(false);
    }
    loadMeta();
  }, []);

  // ── Supabase progress sync (background refresh) ──
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('surah_progress')
      .select('surah_number, status, notes, last_reviewed, confidence')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const map = new Map<number, SurahProgress>();
        for (const row of data) map.set(row.surah_number, row as SurahProgress);
        setProgress(map);
        saveLocalProgress(userId, map);
      });
  }, [userId]);

  // ── Panel sync when surah selected ──
  useEffect(() => {
    if (selectedSurah === null) return;
    const p = progress.get(selectedSurah);
    setPanelStatus(p?.status ?? 'not_started');
    setPanelNotes(p?.notes ?? '');
    setSaveState('idle');
  }, [selectedSurah]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateProgress(surahNumber: number, patch: Partial<SurahProgress>) {
    setProgress((prev) => {
      const current = prev.get(surahNumber) ?? {
        surah_number: surahNumber, status: 'not_started' as Status, notes: '', last_reviewed: null, confidence: 0,
      };
      const next = new Map(prev);
      next.set(surahNumber, { ...current, ...patch });
      if (userId) saveLocalProgress(userId, next);
      return next;
    });
  }

  // ── Mark as last read ──
  async function markAsLastRead(surahNumber: number) {
    if (!userId) return;
    setSaveState('saving');
    const now = new Date().toISOString();
    updateProgress(surahNumber, { status: panelStatus, notes: panelNotes, last_reviewed: now });

    const { error } = await robustUpsert(userId, surahNumber, {
      status: panelStatus, notes: panelNotes, last_reviewed: now,
    });

    if (error) {
      setSaveState('error');
      return;
    }
    setSaveState('saved');
    if (savedResetTimeout.current) clearTimeout(savedResetTimeout.current);
    savedResetTimeout.current = setTimeout(() => setSaveState('idle'), 2500);
  }

  // ── Auto-save on status/notes change ──
  async function savePanel(surahNumber: number, status: Status, notes: string) {
    if (!userId) return;
    updateProgress(surahNumber, { status, notes });
    await robustUpsert(userId, surahNumber, { status, notes });
  }

  function handleStatusChange(status: Status) {
    setPanelStatus(status);
    if (selectedSurah) void savePanel(selectedSurah, status, panelNotes);
  }

  function handleNotesChange(notes: string) {
    setPanelNotes(notes);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(() => {
      if (selectedSurah) void savePanel(selectedSurah, panelStatus, notes);
    }, 800);
  }

  // ── Derived data ──
  const progressVals = [...progress.values()];
  const stats = {
    memorized:   progressVals.filter((p) => p.status === 'memorized').length,
    in_progress: progressVals.filter((p) => p.status === 'in_progress').length,
    weak:        progressVals.filter((p) => p.status === 'weak').length,
    not_started: 114 - progressVals.filter((p) => p.status !== 'not_started').length,
  };

  const recentlyReviewed = [...progress.entries()]
    .filter(([, p]) => p.last_reviewed)
    .sort((a, b) => new Date(b[1].last_reviewed!).getTime() - new Date(a[1].last_reviewed!).getTime())
    .slice(0, 5).map(([num]) => num);

  const weakAlerts = [...progress.entries()]
    .filter(([, p]) => p.status === 'weak' && (!p.last_reviewed || Date.now() - new Date(p.last_reviewed).getTime() > 3 * 86400000))
    .map(([num]) => num);

  const isFriday = new Date().getDay() === 5;
  const fridaySuggestions = isFriday
    ? [...progress.entries()]
        .filter(([, p]) => p.status === 'memorized' || p.status === 'in_progress')
        .sort((a, b) => (a[1].last_reviewed ? new Date(a[1].last_reviewed).getTime() : 0) - (b[1].last_reviewed ? new Date(b[1].last_reviewed).getTime() : 0))
        .slice(0, 3).map(([num]) => num)
    : [];

  const getStatus = (num: number): Status => progress.get(num)?.status ?? 'not_started';
  const filteredSurahs = surahs.filter((s) => filter === 'all' || getStatus(s.number) === filter);
  const selectedMeta = selectedSurah ? surahs.find((s) => s.number === selectedSurah) : null;
  const selectedProgress = selectedSurah ? progress.get(selectedSurah) : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="mx-auto w-full max-w-400 px-6 py-10 lg:px-16 lg:py-14">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">{t('mushafMap')}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">{t('yourJourney')}</h1>
        </motion.div>

        {/* Friday Banner */}
        <AnimatePresence>
          {isFriday && fridaySuggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-teal-50 p-5 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/30"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-2xl leading-none">🌙</span>
                <div>
                  <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">{t('fridaySuggestion')}</p>
                  <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-400">{t('fridaySuggestionDesc')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fridaySuggestions.map((num) => {
                      const meta = surahs.find((s) => s.number === num);
                      return (
                        <button key={num} onClick={() => setSelectedSurah(num)}
                          className="rounded-full bg-emerald-100 px-3.5 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-200 transition-colors dark:bg-emerald-900/50 dark:text-emerald-300"
                        >
                          {meta?.englishName ?? `Surah ${num}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {(['memorized', 'in_progress', 'weak', 'not_started'] as Status[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const active = filter === s;
            return (
              <button key={s} onClick={() => setFilter(active ? 'all' : s)}
                className={`rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${active ? `${cfg.bg} ${cfg.border}` : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(cfg.labelKey)}</p>
                </div>
                <p className={`mt-1.5 text-3xl font-bold tabular-nums ${active ? cfg.text : 'text-slate-900 dark:text-slate-100'}`}>{stats[s]}</p>
                <p className="text-xs text-slate-400 dark:text-slate-600">{t('ofSurahs')}</p>
              </button>
            );
          })}
        </motion.div>

        {/* Weak Alerts */}
        <AnimatePresence>
          {weakAlerts.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
            >
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                ⚠ {weakAlerts.length} surah{weakAlerts.length > 1 ? 's' : ''} {t('needsReview').toLowerCase()} — 3+ days overdue
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {weakAlerts.map((num) => {
                  const meta = surahs.find((s) => s.number === num);
                  return (
                    <button key={num} onClick={() => setSelectedSurah(num)}
                      className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200 transition-colors dark:bg-red-900/40 dark:text-red-300"
                    >
                      {meta?.englishName ?? `Surah ${num}`}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recently Reviewed */}
        {recentlyReviewed.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('recentlyReviewed')}</p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentlyReviewed.map((num) => {
                const meta = surahs.find((s) => s.number === num);
                const p = progress.get(num);
                const cfg = STATUS_CONFIG[p?.status ?? 'not_started'];
                return (
                  <button key={num} onClick={() => setSelectedSurah(num)}
                    className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition-all hover:shadow-sm ${cfg.bg} ${cfg.border} ${selectedSurah === num ? 'ring-2 ring-emerald-400' : ''}`}
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400">#{num}</p>
                    <p className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100">{meta?.englishName ?? `Surah ${num}`}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{daysAgo(p?.last_reviewed ?? null, t('never'))}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Filter + View Toggle */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.12 }}
          className="mb-5 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'memorized', 'in_progress', 'weak', 'not_started'] as const).map((key) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {key === 'all' ? t('all') : t(STATUS_CONFIG[key].labelKey)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            {(['grid', 'juz'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {v === 'grid' ? t('surahGrid') : t('juzView')}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid + Panel */}
        <div className="flex gap-6 items-start">
          <div className="min-w-0 flex-1">
            {loadingMeta ? (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
                {Array.from({ length: 27 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                ))}
              </div>
            ) : view === 'grid' ? (
              <SurahGrid surahs={filteredSurahs} progress={progress} selected={selectedSurah} onSelect={setSelectedSurah} tNever={t('never')} />
            ) : (
              <JuzGrid surahs={surahs} progress={progress} onSelect={setSelectedSurah} selected={selectedSurah} />
            )}
          </div>

          {/* Desktop side panel */}
          <AnimatePresence>
            {selectedSurah !== null && selectedMeta && (
              <motion.aside key="panel"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-80 shrink-0 hidden lg:block"
              >
                <div className="sticky top-6 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t('surahLabel')} {selectedSurah}</p>
                      {selectedMeta.name && (
                        <p dir="rtl" className="mt-2 font-arabic text-5xl leading-tight text-slate-900 dark:text-slate-100">{selectedMeta.name}</p>
                      )}
                      <p className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-slate-100">{selectedMeta.englishName}</p>
                      {selectedMeta.englishNameTranslation && (
                        <p className="text-base italic text-slate-500 dark:text-slate-400">{selectedMeta.englishNameTranslation}</p>
                      )}
                    </div>
                    <button onClick={() => setSelectedSurah(null)}
                      className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:hover:bg-slate-800"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedMeta.numberOfAyahs > 0 && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {selectedMeta.numberOfAyahs} {t('ayahs')}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Juz {SURAH_TO_JUZ[selectedSurah]}
                    </span>
                    {selectedMeta.revelationType && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {selectedMeta.revelationType}
                      </span>
                    )}
                  </div>

                  {selectedProgress?.last_reviewed && (
                    <p className="mt-2 text-sm text-slate-400">{t('lastReviewed')}: {daysAgo(selectedProgress.last_reviewed, t('never'))}</p>
                  )}

                  <hr className="my-4 border-slate-100 dark:border-slate-800" />

                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('statusLabel')}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button key={s} onClick={() => handleStatusChange(s)}
                          className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all ${
                            panelStatus === s
                              ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400'
                          }`}
                        >
                          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
                          {t(cfg.labelKey)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('notesLabel')}</p>
                    <textarea
                      value={panelNotes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder={t('notesPlaceholder')}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-300 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-600"
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <motion.button
                      onClick={() => void markAsLastRead(selectedSurah)}
                      disabled={!userId || saveState === 'saving'}
                      whileTap={{ scale: 0.97 }}
                      animate={saveState === 'saved' ? { scale: [1, 1.04, 1] } : {}}
                      transition={{ duration: 0.25 }}
                      className={`w-full rounded-xl px-4 py-3 text-base font-semibold text-white transition-all disabled:opacity-50 ${
                        saveState === 'saved' ? 'bg-emerald-500 dark:bg-emerald-600'
                        : saveState === 'error' ? 'bg-red-500'
                        : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600'
                      }`}
                    >
                      {saveState === 'saving' ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          {t('saving')}
                        </span>
                      ) : saveState === 'saved' ? t('markedLastRead')
                        : saveState === 'error' ? '⚠ ' + t('saveError')
                        : t('markAsLastRead')}
                    </motion.button>
                    <a href={`https://quran.com/${selectedSurah}`} target="_blank" rel="noopener noreferrer"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      {t('openInQuranCom')}
                    </a>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile bottom sheet */}
        <AnimatePresence>
          {selectedSurah !== null && selectedMeta && (
            <motion.div key="mobile-panel"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-slate-200 bg-white px-6 pb-8 pt-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 lg:hidden"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  {selectedMeta.name && (
                    <p dir="rtl" className="font-arabic text-4xl leading-tight text-slate-900 dark:text-slate-100">{selectedMeta.name}</p>
                  )}
                  <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedMeta.englishName}</p>
                  <div className="mt-1.5 flex gap-2 flex-wrap">
                    {selectedMeta.numberOfAyahs > 0 && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {selectedMeta.numberOfAyahs} {t('ayahs')}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Juz {SURAH_TO_JUZ[selectedSurah]}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedSurah(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => void markAsLastRead(selectedSurah)}
                  disabled={!userId || saveState === 'saving'}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 rounded-xl px-4 py-3 text-base font-semibold text-white transition-all ${
                    saveState === 'saved' ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {saveState === 'saving' ? t('saving') : saveState === 'saved' ? t('markedLastRead') : t('markAsLastRead')}
                </motion.button>
                <a href={`https://quran.com/${selectedSurah}`} target="_blank" rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400"
                >
                  Quran.com ↗
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Surah Grid ───────────────────────────────────────────────────────────────

function SurahGrid({ surahs, progress, selected, onSelect, tNever }: {
  surahs: SurahMeta[]; progress: ProgressMap; selected: number | null;
  onSelect: (n: number) => void; tNever: string;
}) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show"
      className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9"
    >
      {surahs.map((s) => {
        const status: Status = progress.get(s.number)?.status ?? 'not_started';
        const cfg = STATUS_CONFIG[status];
        const isSelected = selected === s.number;
        const p = progress.get(s.number);
        return (
          <motion.button key={s.number} variants={itemVariants} onClick={() => onSelect(s.number)}
            className={`group flex flex-col rounded-2xl border p-3 text-left transition-all hover:shadow-md ${
              isSelected
                ? 'border-emerald-400 bg-emerald-50 shadow-md dark:border-emerald-600 dark:bg-emerald-950/40'
                : `${cfg.bg} ${cfg.border}`
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-600">{s.number}</span>
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            </div>
            {s.name ? (
              <p dir="rtl" className="mt-1.5 font-arabic text-lg leading-snug text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 line-clamp-2">
                {s.name}
              </p>
            ) : null}
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-500 leading-tight">{s.englishName}</p>
            {p?.last_reviewed && (
              <p className="mt-0.5 text-[10px] text-slate-300 dark:text-slate-700 leading-tight">{daysAgo(p.last_reviewed, tNever)}</p>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ─── Juz Grid ─────────────────────────────────────────────────────────────────

function JuzGrid({ surahs, progress, onSelect, selected }: {
  surahs: SurahMeta[]; progress: ProgressMap; onSelect: (n: number) => void; selected: number | null;
}) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
        const surahNums = getSurahsInJuz(juz);
        const total = surahNums.length;
        const memorized = surahNums.filter((n) => progress.get(n)?.status === 'memorized').length;
        const inProgress = surahNums.filter((n) => progress.get(n)?.status === 'in_progress').length;
        const weak = surahNums.filter((n) => progress.get(n)?.status === 'weak').length;
        const pct = total > 0 ? Math.round((memorized / total) * 100) : 0;
        return (
          <motion.div key={juz} variants={itemVariants}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Juz {juz}</p>
              <p className="text-sm tabular-nums text-slate-400">{memorized}/{total}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-500"
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
            </div>
            <div className="mt-2 flex gap-3 text-xs">
              {memorized > 0 && <span className="text-emerald-600 dark:text-emerald-500">{memorized} memorised</span>}
              {inProgress > 0 && <span className="text-amber-600 dark:text-amber-500">{inProgress} in progress</span>}
              {weak > 0 && <span className="text-red-500">{weak} weak</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {surahNums.map((num) => {
                const meta = surahs.find((s) => s.number === num);
                const status: Status = progress.get(num)?.status ?? 'not_started';
                const cfg = STATUS_CONFIG[status];
                return (
                  <button key={num} onClick={() => onSelect(num)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all hover:shadow-sm ${cfg.bg} ${cfg.border} ${cfg.text} ${selected === num ? 'ring-1 ring-emerald-400' : ''}`}
                  >
                    {meta?.englishName ?? `S${num}`}
                  </button>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
