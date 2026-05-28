'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { IslamicPattern } from '@/components/IslamicPattern';

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
      <hr className="flex-1 border-slate-100 dark:border-slate-800/60" />
      <span className="text-xs text-slate-300 dark:text-slate-700">✦</span>
      <hr className="flex-1 border-slate-100 dark:border-slate-800/60" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
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
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      setUserId(user.id);
      const meta = user.user_metadata ?? {};

      setProfile({
        fullName:     (meta.full_name as string) || (meta.name as string) || user.email?.split('@')[0].replace(/[._-]+/g, ' ') || '',
        email:        user.email ?? '',
        location:     (meta.location as string) || '',
        journeyStart: (meta.journey_start as string) || '',
        ustadh:       (meta.ustadh as string) || '',
        method:       (meta.memorization_method as Method) || '',
        niyyah:       (meta.niyyah as string) || '',
      });

      // Stats
      const [progressRes, journalRes] = await Promise.all([
        supabase.from('surah_progress').select('surah_number').eq('user_id', user.id).eq('status', 'memorized'),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      setStats({
        memorized:     progressRes.data?.length ?? 0,
        journalEntries: journalRes.count ?? 0,
      });

      setLoading(false);
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
    await supabase.auth.updateUser({
      data: {
        full_name:            data.fullName.trim(),
        location:             data.location.trim(),
        journey_start:        data.journeyStart,
        ustadh:               data.ustadh.trim(),
        memorization_method:  data.method,
        niyyah:               data.niyyah.trim(),
      },
    });
    setSaving(false);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 2500);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="animate-pulse text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!profile.email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500">Please sign in to view your profile.</p>
        <Link href="/" className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
          Go to Home
        </Link>
      </div>
    );
  }

  const days = journeyDays(profile.journeyStart);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <IslamicPattern />

      <div className="relative mx-auto w-full max-w-lg px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          {/* ── Avatar + name ── */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {initials(profile.fullName) || '?'}
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {profile.fullName || 'Your Name'}
              </p>
              <p className="text-sm text-slate-400">{profile.email}</p>
            </div>
            {/* Save indicator */}
            <p className={`text-xs transition-opacity ${saving ? 'opacity-60' : saved ? 'text-emerald-600 opacity-100' : 'opacity-0'}`}>
              {saving ? 'Saving…' : 'Saved'}
            </p>
          </div>

          <Divider />

          {/* ── Basic info ── */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
              Basic Info
            </p>
            <div className="space-y-3">
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
            </div>
          </div>

          <Divider />

          {/* ── Hifdh info ── */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
              Your Hifdh
            </p>
            <div className="space-y-3">
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
            </div>

            {/* Method */}
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Memorisation Method
              </p>
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

          <Divider />

          {/* ── Niyyah ── */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
              Your Niyyah
            </p>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Why did you begin? Write it once — read it on hard days.
            </p>
            <Field
              label="My intention"
              value={profile.niyyah}
              placeholder="I began this journey because…"
              onChange={(v) => updateField('niyyah', v)}
              multiline
            />
          </div>

          <Divider />

          {/* ── Stats ── */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
              Your Journey
            </p>
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={stats.memorized} label="Surahs memorised" />
              <StatCard value={stats.journalEntries} label="Journal entries" />
              <StatCard value={days > 0 ? days : '—'} label="Days on this journey" />
            </div>
          </div>

          <Divider />

          {/* ── Sign out ── */}
          <button
            onClick={signOut}
            className="w-full rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    </div>
  );
}
