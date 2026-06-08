'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

type Method = 'page' | 'ayah' | 'surah';

type ProfileData = {
  fullName: string;
  email: string;
  location: string;
  journeyStart: string;        // YYYY-MM-DD
  ustadh: string;
  method: Method | '';
  niyyah: string;
};

type Stats = {
  memorized: number;
  journalEntries: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function journeyDays(start: string): number {
  if (!start) return 0;
  const diff = Date.now() - new Date(start).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const METHOD_OPTIONS: { value: Method; label: string; desc: string }[] = [
  { value: 'page',  label: 'By Page',  desc: 'Memorise one page at a time' },
  { value: 'ayah',  label: 'By Ayah',  desc: 'Ayah by ayah, building up' },
  { value: 'surah', label: 'By Surah', desc: 'Whole surah at once' },
];

// ─── Reusable field ───────────────────────────────────────────────────────────

function Field({
  label, value, placeholder, onChange, type = 'text', multiline = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  const shared =
    'w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none text-base';
  return (
    <div className="group flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 transition-colors focus-within:border-emerald-400 dark:border-slate-800 dark:bg-slate-900/80 dark:focus-within:border-emerald-600">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </p>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`${shared} resize-none leading-relaxed`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={shared}
        />
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #c9943a)' }} />
      <span className="text-sm text-amber-500/70 dark:text-amber-400/60">✦</span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #c9943a)' }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { loading: authLoading } = useRequireAuth();
  const [, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '', email: '', location: '', journeyStart: '',
    ustadh: '', method: '', niyyah: '',
  });
  const [stats, setStats] = useState<Stats>({ memorized: 0, journalEntries: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ──
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { user } = session;
      setUserId(user.id);
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

      // Set profile from cached session — zero network, instant render
      setProfile({
        fullName:     (meta.full_name as string) || (meta.name as string) || user.email?.split('@')[0].replace(/[._-]+/g, ' ') || '',
        email:        user.email ?? '',
        location:     (meta.location as string) || '',
        journeyStart: (meta.journey_start as string) || '',
        ustadh:       (meta.ustadh as string) || '',
        method:       (meta.memorization_method as Method) || '',
        niyyah:       (meta.niyyah as string) || '',
      });
      setLoading(false); // page renders now — stats update silently below

      const [progressRes, journalRes] = await Promise.all([
        supabase.from('surah_progress').select('surah_number').eq('user_id', user.id).eq('status', 'memorized'),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      setStats({
        memorized:      progressRes.data?.length ?? 0,
        journalEntries: journalRes.count ?? 0,
      });
    }
    load();
  }, []);

  // ── Auto-save on field change ──
  function updateField<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => {
      const next = { ...prev, [key]: value };
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => saveProfile(next), 900);
      return next;
    });
  }

  async function saveProfile(data: ProfileData) {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name:            data.fullName.trim(),
        location:             data.location.trim(),
        journey_start:        data.journeyStart || null,
        ustadh:               data.ustadh.trim(),
        memorization_method:  data.method,
        niyyah:               data.niyyah.trim(),
      },
    });
    if (error) { setSaving(false); return; }
    // Refresh the local JWT so getSession() returns fresh metadata on next load
    await supabase.auth.refreshSession();
    // Keep the dashboard's name cache in sync so it shows the new name immediately
    try { localStorage.setItem('hifdh-last-user-name', data.fullName.trim()); } catch {}
    setSaving(false);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 2500);
  }

  async function signOut() {
    // Cancel any pending auto-save before signing out to avoid a refreshSession
    // race that could restore the session immediately after signOut.
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      console.error('Sign out error:', error);
      return;
    }
    window.location.replace('/');
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-slate-400">Loading…</p>
      </div>
    );
  }

  const days = journeyDays(profile.journeyStart);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="relative mx-auto w-full max-w-2xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >

          {/* ── Header: avatar · name · status ── */}
          <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700 ring-2 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800">
              {initials(profile.fullName) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                {profile.fullName || 'Your Name'}
              </p>
              <p className="truncate text-sm text-slate-400">{profile.email}</p>
            </div>
            <span className={`shrink-0 text-xs transition-opacity ${saving ? 'text-slate-400 opacity-70' : saved ? 'text-emerald-600 opacity-100 dark:text-emerald-400' : 'opacity-0'}`}>
              {saving ? 'Saving…' : '✓ Saved'}
            </span>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={stats.memorized} label="Surahs memorised" />
            <StatCard value={stats.journalEntries} label="Journal entries" />
            <StatCard value={days > 0 ? days : '—'} label="Days on journey" />
          </div>

          <Divider />

          {/* ── 2-column form grid ── */}
          <div className="grid gap-6 md:grid-cols-2">

            {/* Left column: Basic Info + Method */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
                Basic Info
              </p>
              <Field
                label="Name"
                value={profile.fullName}
                placeholder="Your name"
                onChange={(v) => updateField('fullName', v)}
              />
              <Field
                label="City / Country"
                value={profile.location}
                placeholder="e.g. London, UK"
                onChange={(v) => updateField('location', v)}
              />

              <p className="pt-2 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
                Memorisation Method
              </p>
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex flex-wrap gap-2">
                  {METHOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateField('method', opt.value)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                        profile.method === opt.value
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: Hifdh + Niyyah */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
                Your Hifdh
              </p>
              <Field
                label="Journey started"
                value={profile.journeyStart}
                type="date"
                onChange={(v) => updateField('journeyStart', v)}
              />
              <Field
                label="Ustadh (teacher)"
                value={profile.ustadh}
                placeholder="Optional"
                onChange={(v) => updateField('ustadh', v)}
              />

              <p className="pt-2 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
                Your Niyyah
              </p>
              <Field
                label="Why I began"
                value={profile.niyyah}
                placeholder="I began this journey because…"
                onChange={(v) => updateField('niyyah', v)}
                multiline
              />
            </div>
          </div>

          <Divider />

          {/* ── Sign out ── */}
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            Sign Out
          </button>

        </motion.div>
      </div>
    </div>
  );
}
