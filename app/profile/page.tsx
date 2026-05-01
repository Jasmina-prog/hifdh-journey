'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { IslamicPattern } from '@/components/IslamicPattern';

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) { setLoading(false); return; }
      setEmail(user.email ?? '');
      const name =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split('@')[0].replace(/[._\-]+/g, ' ') ||
        '';
      setDisplayName(name);
      setEditName(name);
      setLoading(false);
    });
  }, []);

  async function saveName() {
    setSaving(true);
    await supabase.auth.updateUser({ data: { full_name: editName.trim() } });
    setDisplayName(editName.trim());
    setEditing(false);
    setSaving(false);
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

  if (!email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500">Please sign in to view your profile.</p>
        <Link href="/" className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <IslamicPattern />
      <div className="relative mx-auto w-full max-w-lg px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
        >
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-emerald-600 dark:text-emerald-400">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
              </svg>
            </div>

            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false); }}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-center text-lg font-semibold text-slate-900 outline-none focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                <button onClick={saveName} disabled={saving || !editName.trim()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
                  {saving ? t('saving') : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:text-slate-600">✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setEditName(displayName); setEditing(true); }}
                className="group flex items-center gap-1.5 text-xl font-semibold text-slate-900 hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-400"
              >
                {displayName}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 opacity-0 transition group-hover:opacity-60">
                  <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                </svg>
              </button>
            )}
            <p className="text-sm text-slate-400">{email}</p>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          <div className="mt-6">
            <button
              onClick={signOut}
              className="w-full rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/20"
            >
              {t('signOut')}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
