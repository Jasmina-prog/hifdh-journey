'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { SURAH_TO_JUZ, JUZ_TO_SURAHS } from '@/lib/juzData';

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

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { labelKey: string; dot: string; bg: string; border: string; text: string; activeBg: string }> = {
  memorized:   { labelKey: 'memorised',   dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30',  border: 'border-emerald-200 dark:border-emerald-900', text: 'text-emerald-700 dark:text-emerald-400', activeBg: 'bg-emerald-100 dark:bg-emerald-900/50' },
  in_progress: { labelKey: 'inProgress',  dot: 'bg-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30',     border: 'border-amber-200 dark:border-amber-900',    text: 'text-amber-700 dark:text-amber-400',    activeBg: 'bg-amber-100 dark:bg-amber-900/50' },
  weak:        { labelKey: 'needsReview', dot: 'bg-red-400',     bg: 'bg-red-50 dark:bg-red-950/30',         border: 'border-red-200 dark:border-red-900',        text: 'text-red-600 dark:text-red-400',        activeBg: 'bg-red-100 dark:bg-red-900/50' },
  not_started: { labelKey: 'notStarted',  dot: 'bg-slate-300 dark:bg-slate-600', bg: 'bg-white dark:bg-slate-900/60', border: 'border-slate-200 dark:border-slate-800', text: 'text-slate-500', activeBg: 'bg-slate-100 dark:bg-slate-800' },
};

// ─── localStorage ─────────────────────────────────────────────────────────────

const USER_ID_KEY = 'hifdh-last-user-id';
const progressKey = (uid: string) => `hifdh-map-progress-${uid}`;

function getCachedUserId(): string | null {
  try { return localStorage.getItem(USER_ID_KEY); } catch { return null; }
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

// ─── Robust upsert (works without DB migration / unique constraint) ───────────

async function robustUpsert(
  uid: string,
  surahNumber: number,
  patch: Partial<SurahProgress>,
): Promise<{ ok: boolean }> {
  const { error: e1 } = await supabase
    .from('surah_progress')
    .upsert({ user_id: uid, surah_number: surahNumber, ...patch }, { onConflict: 'user_id,surah_number' });
  if (!e1) return { ok: true };

  const { data: existing } = await supabase
    .from('surah_progress').select('id')
    .eq('user_id', uid).eq('surah_number', surahNumber).maybeSingle();

  const safeBase = { last_reviewed: (patch as { last_reviewed?: string }).last_reviewed ?? new Date().toISOString() };
  const full = { ...safeBase, ...patch };

  if (existing) {
    const { error: e2 } = await supabase.from('surah_progress').update(full).eq('id', (existing as { id: string }).id);
    if (!e2) return { ok: true };
    await supabase.from('surah_progress').update(safeBase).eq('id', (existing as { id: string }).id);
  } else {
    const { error: e2 } = await supabase.from('surah_progress').insert({ user_id: uid, surah_number: surahNumber, ...full });
    if (!e2) return { ok: true };
    await supabase.from('surah_progress').insert({ user_id: uid, surah_number: surahNumber, ...safeBase });
  }
  return { ok: false };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string | null, neverLabel: string): string {
  if (!dateStr) return neverLabel;
  // Compare calendar days in local timezone — avoids UTC-offset "Today" bugs
  const reviewed = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  reviewed.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - reviewed.getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.02 } } };
const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const { t } = useTranslation('common');

  const [userId, setUserId] = useState<string | null>(null);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [progress, setProgress] = useState<ProgressMap>(new Map());
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [view, setView] = useState<'grid' | 'juz'>('grid');
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [panelNotes, setPanelNotes] = useState('');
  const [panelStatus, setPanelStatus] = useState<Status>('not_started');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedReset = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydration-safe localStorage load ──
  useEffect(() => {
    const uid = getCachedUserId();
    if (uid) {
      setUserId(uid);
      const local = loadLocalProgress(uid);
      if (local.size > 0) setProgress(local);
    }
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null;
      if (!id) return;
      try { localStorage.setItem(USER_ID_KEY, id); } catch {}
      if (id !== uid) {
        setUserId(id);
        const local = loadLocalProgress(id);
        if (local.size > 0) setProgress(local);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Surah metadata ──
  useEffect(() => {
    async function load() {
      try {
        const c = localStorage.getItem('surah-meta-v1');
        if (c) { setSurahs(JSON.parse(c)); setLoadingMeta(false); return; }
      } catch {}
      try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
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
    load();
  }, []);

  // ── Supabase sync ──
  useEffect(() => {
    if (!userId) return;
    supabase.from('surah_progress')
      .select('surah_number, status, notes, last_reviewed, confidence')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (!data?.length) return;
        const map = new Map<number, SurahProgress>();
        for (const row of data) map.set(row.surah_number, row as SurahProgress);
        setProgress(map);
        saveLocalProgress(userId, map);
      });
  }, [userId]);

  // ── Panel sync ──
  useEffect(() => {
    if (selectedSurah === null) return;
    const p = progress.get(selectedSurah);
    setPanelStatus(p?.status ?? 'not_started');
    setPanelNotes(p?.notes ?? '');
    setSaveState('idle');
  }, [selectedSurah]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateProgress(num: number, patch: Partial<SurahProgress>) {
    setProgress((prev) => {
      const cur = prev.get(num) ?? { surah_number: num, status: 'not_started' as Status, notes: '', last_reviewed: null, confidence: 0 };
      const next = new Map(prev);
      next.set(num, { ...cur, ...patch });
      if (userId) saveLocalProgress(userId, next);
      return next;
    });
  }

  async function markAsLastRead(num: number) {
    if (!userId) return;
    setSaveState('saving');
    const now = new Date().toISOString();
    updateProgress(num, { status: panelStatus, notes: panelNotes, last_reviewed: now });
    const { ok } = await robustUpsert(userId, num, { status: panelStatus, notes: panelNotes, last_reviewed: now });
    setSaveState(ok ? 'saved' : 'error');
    if (ok) {
      if (savedReset.current) clearTimeout(savedReset.current);
      savedReset.current = setTimeout(() => setSaveState('idle'), 2500);
    }
  }

  async function savePanel(num: number, status: Status, notes: string) {
    if (!userId) return;
    updateProgress(num, { status, notes });
    await robustUpsert(userId, num, { status, notes });
  }

  function handleStatusChange(status: Status) {
    setPanelStatus(status);
    if (!selectedSurah || !userId) return;
    // Changing status counts as a review — reset last_reviewed so the 3-day
    // weak-alert timer starts from NOW, not from some old date.
    const now = new Date().toISOString();
    updateProgress(selectedSurah, { status, last_reviewed: now });
    void robustUpsert(userId, selectedSurah, { status, notes: panelNotes, last_reviewed: now });
  }

  function handleNotesChange(notes: string) {
    setPanelNotes(notes);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(() => {
      if (selectedSurah) void savePanel(selectedSurah, panelStatus, notes);
    }, 800);
  }

  // ── Derived ──
  const pv = [...progress.values()];
  const stats = {
    memorized:   pv.filter((p) => p.status === 'memorized').length,
    in_progress: pv.filter((p) => p.status === 'in_progress').length,
    weak:        pv.filter((p) => p.status === 'weak').length,
    not_started: 114 - pv.filter((p) => p.status !== 'not_started').length,
  };

  const recentlyReviewed = [...progress.entries()]
    .filter(([, p]) => p.last_reviewed)
    .sort((a, b) => new Date(b[1].last_reviewed!).getTime() - new Date(a[1].last_reviewed!).getTime())
    .slice(0, 5).map(([n]) => n);

  const weakAlerts = [...progress.entries()]
    .filter(([, p]) => p.status === 'weak' && (!p.last_reviewed || Date.now() - new Date(p.last_reviewed).getTime() > 3 * 86400000))
    .map(([n]) => n);

  const isFriday = typeof window !== 'undefined' ? new Date().getDay() === 5 : false;
  const fridaySuggestions = isFriday
    ? [...progress.entries()]
        .filter(([, p]) => p.status === 'memorized' || p.status === 'in_progress')
        .sort((a, b) => (a[1].last_reviewed ? new Date(a[1].last_reviewed).getTime() : 0) - (b[1].last_reviewed ? new Date(b[1].last_reviewed).getTime() : 0))
        .slice(0, 3).map(([n]) => n)
    : [];

  const getStatus = (n: number): Status => progress.get(n)?.status ?? 'not_started';
  const filteredSurahs = surahs.filter((s) => filter === 'all' || getStatus(s.number) === filter);
  const selectedMeta = selectedSurah ? surahs.find((s) => s.number === selectedSurah) : null;
  const selectedProgress = selectedSurah ? progress.get(selectedSurah) : null;

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="mx-auto w-full max-w-400 px-4 py-8 sm:px-6 lg:px-16 lg:py-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">{t('mushafMap')}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl lg:text-5xl">{t('yourJourney')}</h1>
        </motion.div>

        {/* Friday Banner */}
        <AnimatePresence>
          {fridaySuggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-teal-50 p-4 sm:p-5 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/30"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xl leading-none">🌙</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 sm:text-base">{t('fridaySuggestion')}</p>
                  <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400 sm:text-sm">{t('fridaySuggestionDesc')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fridaySuggestions.map((num) => (
                      <button key={num} onClick={() => setSelectedSurah(num)}
                        className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-200 sm:text-sm dark:bg-emerald-900/50 dark:text-emerald-300"
                      >
                        {surahs.find((s) => s.number === num)?.englishName ?? `Surah ${num}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3"
        >
          {(['memorized', 'in_progress', 'weak', 'not_started'] as Status[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const active = filter === s;
            return (
              <button key={s} onClick={() => setFilter(active ? 'all' : s)}
                className={`rounded-2xl border p-3 sm:p-4 text-left transition-all hover:shadow-sm ${
                  active ? `${cfg.activeBg} ${cfg.border}` : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">{t(cfg.labelKey)}</p>
                </div>
                <p className={`mt-1.5 text-2xl font-bold tabular-nums sm:text-3xl ${active ? cfg.text : 'text-slate-900 dark:text-slate-100'}`}>{stats[s]}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-600 sm:text-xs">{t('ofSurahs')}</p>
              </button>
            );
          })}
        </motion.div>

        {/* Weak Alerts */}
        <AnimatePresence>
          {weakAlerts.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
            >
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                ⚠ {weakAlerts.length} surah{weakAlerts.length > 1 ? 's' : ''} {t('needsReview').toLowerCase()} — 3+ days
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {weakAlerts.map((num) => (
                  <button key={num} onClick={() => setSelectedSurah(num)}
                    className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 transition hover:bg-red-200 sm:px-3 sm:text-sm dark:bg-red-900/40 dark:text-red-300"
                  >
                    {surahs.find((s) => s.number === num)?.englishName ?? `Surah ${num}`}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recently Reviewed */}
        {recentlyReviewed.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('recentlyReviewed')}</p>
            <div className="flex gap-2.5 overflow-x-auto pb-1 sm:gap-3">
              {recentlyReviewed.map((num) => {
                const meta = surahs.find((s) => s.number === num);
                const p = progress.get(num);
                const cfg = STATUS_CONFIG[p?.status ?? 'not_started'];
                return (
                  <button key={num} onClick={() => setSelectedSurah(num)}
                    className={`shrink-0 rounded-2xl border px-3 py-2.5 text-left transition-all hover:shadow-sm sm:px-4 ${cfg.bg} ${cfg.border} ${selectedSurah === num ? 'ring-2 ring-slate-500 dark:ring-slate-400' : ''}`}
                  >
                    <p className="text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">#{num}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">{meta?.englishName ?? `Surah ${num}`}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">{daysAgo(p?.last_reviewed ?? null, t('never'))}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Filter + View Toggle */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
          className="mb-5 flex flex-wrap items-center justify-between gap-2.5"
        >
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'memorized', 'in_progress', 'weak', 'not_started'] as const).map((key) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
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
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:px-3.5 sm:text-sm ${
                  view === v ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {v === 'grid' ? t('surahGrid') : t('juzView')}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid + Desktop Panel */}
        <div className="flex gap-5 items-start lg:gap-6">
          <div className="min-w-0 flex-1">
            {loadingMeta ? (
              <div className={`grid gap-2 ${selectedSurah !== null ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9'}`}>
                {Array.from({ length: 27 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 sm:h-24" />
                ))}
              </div>
            ) : view === 'grid' ? (
              <SurahGrid surahs={filteredSurahs} progress={progress} selected={selectedSurah} onSelect={setSelectedSurah} tNever={t('never')} panelOpen={selectedSurah !== null} />
            ) : (
              <JuzGrid surahs={surahs} progress={progress} onSelect={setSelectedSurah} selected={selectedSurah} />
            )}
          </div>

          {/* Desktop side panel */}
          <AnimatePresence>
            {selectedSurah !== null && selectedMeta && (
              <motion.aside key="panel"
                initial={{ opacity: 0, x: 40, y: -6 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 40, y: -6 }}
                transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="hidden lg:block w-72 xl:w-80 shrink-0"
              >
                <SidePanel
                  surah={selectedMeta}
                  progress={selectedProgress ?? null}
                  panelStatus={panelStatus}
                  panelNotes={panelNotes}
                  saveState={saveState}
                  userId={userId}
                  t={t}
                  onClose={() => setSelectedSurah(null)}
                  onStatusChange={handleStatusChange}
                  onNotesChange={handleNotesChange}
                  onMarkLastRead={() => void markAsLastRead(selectedSurah)}
                />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile / Tablet bottom sheet */}
      <AnimatePresence>
        {selectedSurah !== null && selectedMeta && (
          <>
            {/* Backdrop */}
            <motion.div key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedSurah(null)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
            />
            <motion.div key="sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 lg:hidden"
            >
              <div className="sticky top-0 flex justify-center pt-3 pb-1 bg-white dark:bg-slate-900">
                <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <SidePanel
                surah={selectedMeta}
                progress={selectedProgress ?? null}
                panelStatus={panelStatus}
                panelNotes={panelNotes}
                saveState={saveState}
                userId={userId}
                t={t}
                onClose={() => setSelectedSurah(null)}
                onStatusChange={handleStatusChange}
                onNotesChange={handleNotesChange}
                onMarkLastRead={() => void markAsLastRead(selectedSurah)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Side Panel (shared between desktop and mobile) ───────────────────────────

function SidePanel({
  surah, progress, panelStatus, panelNotes, saveState, userId, t,
  onClose, onStatusChange, onNotesChange, onMarkLastRead,
}: {
  surah: SurahMeta;
  progress: SurahProgress | null;
  panelStatus: Status;
  panelNotes: string;
  saveState: SaveState;
  userId: string | null;
  t: (k: string) => string;
  onClose: () => void;
  onStatusChange: (s: Status) => void;
  onNotesChange: (n: string) => void;
  onMarkLastRead: () => void;
}) {
  const cfg = STATUS_CONFIG[panelStatus];
  return (
    <div className="px-5 pb-8 pt-4 sm:px-6 lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm lg:dark:border-slate-800 lg:dark:bg-slate-900 lg:pt-6 lg:pb-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{t('surahLabel')} {surah.number}</p>
          {surah.name && (
            <p dir="rtl" className="mt-2 font-arabic text-3xl leading-snug text-slate-900 dark:text-slate-100 sm:text-4xl">{surah.name}</p>
          )}
          <p className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{surah.englishName}</p>
          {surah.englishNameTranslation && (
            <p className="text-sm italic text-slate-400 dark:text-slate-500">{surah.englishNameTranslation}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-1 shrink-0 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
        {surah.numberOfAyahs > 0 && <span>{surah.numberOfAyahs} {t('ayahs')}</span>}
        <span className="text-slate-300 dark:text-slate-700">·</span>
        <span>Juz {SURAH_TO_JUZ[surah.number]}</span>
        {surah.revelationType && (
          <>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>{surah.revelationType}</span>
          </>
        )}
        {progress?.last_reviewed && (
          <>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>{t('lastReviewed')}: <span className={`font-medium ${cfg.text}`}>{daysAgo(progress.last_reviewed, t('never'))}</span></span>
          </>
        )}
      </div>

      <hr className="my-4 border-slate-100 dark:border-slate-800" />

      {/* Status — horizontal chips */}
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-slate-400">{t('statusLabel')}</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => {
          const c = STATUS_CONFIG[s];
          const active = panelStatus === s;
          return (
            <button key={s} onClick={() => onStatusChange(s)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                active
                  ? `${c.activeBg} ${c.border} ${c.text}`
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-200'
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
              {t(c.labelKey)}
            </button>
          );
        })}
      </div>

      <hr className="my-4 border-slate-100 dark:border-slate-800" />

      {/* Notes */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">{t('notesLabel')}</p>
      <textarea
        value={panelNotes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={t('notesPlaceholder')}
        rows={3}
        className="w-full resize-none bg-transparent text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-700"
      />

      <hr className="my-4 border-slate-100 dark:border-slate-800" />

      {/* Actions */}
      <motion.button
        onClick={onMarkLastRead}
        disabled={!userId || saveState === 'saving'}
        whileTap={{ scale: 0.97 }}
        animate={saveState === 'saved' ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 0.2 }}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 ${
          saveState === 'saved'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200'
        }`}
      >
        {saveState === 'saving' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {t('saving')}
          </span>
        ) : saveState === 'saved' ? t('markedLastRead') : t('markAsLastRead')}
      </motion.button>
      <AnimatePresence>
        {saveState === 'error' && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-2 text-center text-xs text-red-400"
          >
            {t('saveError')}
          </motion.p>
        )}
      </AnimatePresence>
      <a href={`https://quran.com/${surah.number}`} target="_blank" rel="noopener noreferrer"
        className="mt-2.5 flex w-full items-center justify-center text-sm text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
      >
        {t('openInQuranCom')}
      </a>
    </div>
  );
}

// ─── Surah Grid ───────────────────────────────────────────────────────────────

function SurahGrid({ surahs, progress, selected, onSelect, tNever, panelOpen }: {
  surahs: SurahMeta[]; progress: ProgressMap; selected: number | null;
  onSelect: (n: number) => void; tNever: string; panelOpen: boolean;
}) {
  return (
    <motion.div variants={containerV} initial="hidden" animate="show"
      className={`grid gap-2 ${panelOpen ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9'}`}
    >
      {surahs.map((s) => {
        const status: Status = progress.get(s.number)?.status ?? 'not_started';
        const cfg = STATUS_CONFIG[status];
        const isSelected = selected === s.number;
        const p = progress.get(s.number);
        return (
          <motion.button key={s.number} variants={itemV} onClick={() => onSelect(s.number)}
            className={`group flex flex-col rounded-2xl border p-2.5 text-left transition-all sm:p-3 ${
              isSelected
                ? `${cfg.bg} border-slate-500 dark:border-slate-400 shadow-lg scale-[1.04] z-10`
                : `${cfg.bg} ${cfg.border} hover:shadow-md hover:scale-[1.02]`
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-600">{s.number}</span>
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            </div>
            {s.name && (
              <p dir="rtl" className="mt-1.5 font-arabic text-xl leading-snug text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 line-clamp-2 sm:text-2xl">
                {s.name}
              </p>
            )}
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-500 sm:text-sm">{s.englishName}</p>
            {p?.last_reviewed && (
              <p className="mt-0.5 text-[10px] text-slate-300 dark:text-slate-700 sm:text-xs">{daysAgo(p.last_reviewed, tNever)}</p>
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
    <motion.div variants={containerV} initial="hidden" animate="show"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
        const surahNums = JUZ_TO_SURAHS[juz] ?? [];
        const total = surahNums.length;
        const memorized = surahNums.filter((n) => progress.get(n)?.status === 'memorized').length;
        const inProg = surahNums.filter((n) => progress.get(n)?.status === 'in_progress').length;
        const weak = surahNums.filter((n) => progress.get(n)?.status === 'weak').length;
        const pct = total > 0 ? Math.round((memorized / total) * 100) : 0;
        return (
          <motion.div key={juz} variants={itemV}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">Juz {juz}</p>
              <p className="text-sm tabular-nums text-slate-400">{memorized}/{total}</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-500"
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
            </div>
            <div className="mt-2 flex gap-3 text-xs sm:text-sm">
              {memorized > 0 && <span className="text-emerald-600 dark:text-emerald-500">{memorized} memorised</span>}
              {inProg > 0 && <span className="text-amber-600 dark:text-amber-500">{inProg} in progress</span>}
              {weak > 0 && <span className="text-red-500">{weak} weak</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {surahNums.map((num) => {
                const meta = surahs.find((s) => s.number === num);
                const status: Status = progress.get(num)?.status ?? 'not_started';
                const cfg = STATUS_CONFIG[status];
                return (
                  <button key={num} onClick={() => onSelect(num)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all hover:shadow-sm ${cfg.bg} ${cfg.border} ${cfg.text} ${selected === num ? 'ring-2 ring-slate-400' : ''}`}
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
