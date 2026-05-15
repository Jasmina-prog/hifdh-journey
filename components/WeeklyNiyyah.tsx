'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function getWeekKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function WeeklyNiyyah({ userId }: { userId: string | null }) {
  const week = getWeekKey();
  const storageKey = `hifdh-niyyah-${userId ?? 'guest'}-${week}`;

  const [niyyah, setNiyyah] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [dbId, setDbId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setNiyyah(raw);
    } catch {}

    if (userId) {
      supabase
        .from('weekly_niyyah')
        .select('id, text')
        .eq('user_id', userId)
        .eq('week', week)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setNiyyah(data.text);
            setDbId(data.id);
            try { localStorage.setItem(storageKey, data.text); } catch {}
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function startEdit() {
    setDraft(niyyah);
    setEditing(true);
  }

  async function save() {
    const text = draft.trim();
    setNiyyah(text);
    setEditing(false);
    try { localStorage.setItem(storageKey, text); } catch {}

    if (!userId) return;

    if (dbId) {
      await supabase.from('weekly_niyyah').update({ text }).eq('id', dbId);
    } else {
      const { data } = await supabase
        .from('weekly_niyyah')
        .insert({ user_id: userId, week, text })
        .select('id')
        .single();
      if (data) setDbId(data.id);
    }
  }

  function cancel() {
    setEditing(false);
    setDraft('');
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
        This week&apos;s intention
      </p>

      {editing ? (
        <div className="flex items-start gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') cancel();
            }}
            placeholder="I memorise to…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-300 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-500"
          />
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancel}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-400 transition hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:hover:border-slate-500"
          >
            ✕
          </button>
        </div>
      ) : niyyah ? (
        <button
          type="button"
          onClick={startEdit}
          className="group flex items-baseline gap-2 text-left"
          title="Click to edit this week's intention"
        >
          <span className="text-base font-medium text-slate-800 dark:text-slate-200">
            &ldquo;{niyyah}&rdquo;
          </span>
          <span className="text-xs text-slate-300 opacity-0 transition group-hover:opacity-100 dark:text-slate-700">
            Edit
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="text-sm text-slate-300 transition hover:text-slate-500 dark:text-slate-700 dark:hover:text-slate-500"
        >
          Set this week&apos;s intention →
        </button>
      )}
    </div>
  );
}
