'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

type Task = { id: string; text: string; done: boolean };

function getWeekKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

type Props = {
  userId: string | null;
  onStatsChange?: (done: number, total: number) => void;
};

export function WeeklyIntentionCard({ userId, onStatsChange }: Props) {
  const { t } = useTranslation('common');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const onStatsRef = useRef(onStatsChange);
  onStatsRef.current = onStatsChange;

  const week = getWeekKey();
  const storageKey = `hifdh-intentions-${userId ?? 'guest'}-${week}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const loaded: Task[] = JSON.parse(raw);
        setTasks(loaded);
        onStatsRef.current?.(loaded.filter((t) => t.done).length, loaded.length);
      }
    } catch {}

    if (userId) {
      supabase
        .from('weekly_intentions')
        .select('id, text, done')
        .eq('user_id', userId)
        .eq('week', week)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const loaded = data as Task[];
            setTasks(loaded);
            try { localStorage.setItem(storageKey, JSON.stringify(loaded)); } catch {}
            onStatsRef.current?.(loaded.filter((t) => t.done).length, loaded.length);
          }
        });
    }
  }, [userId, week, storageKey]);

  function persist(updated: Task[]) {
    setTasks(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
    onStatsRef.current?.(updated.filter((t) => t.done).length, updated.length);
  }

  async function addTask() {
    const text = input.trim();
    if (!text) return;

    const tempId = `local-${Date.now()}`;
    persist([...tasks, { id: tempId, text, done: false }]);
    setInput('');
    inputRef.current?.focus();

    if (userId) {
      const { data } = await supabase
        .from('weekly_intentions')
        .insert({ user_id: userId, week, text, done: false })
        .select('id, text, done')
        .single();
      if (data) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? (data as Task) : t)));
      }
    }
  }

  async function toggleDone(task: Task) {
    const updated = tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t));
    persist(updated);
    if (userId && !task.id.startsWith('local-')) {
      await supabase.from('weekly_intentions').update({ done: !task.done }).eq('id', task.id);
    }
  }

  async function deleteTask(id: string) {
    persist(tasks.filter((t) => t.id !== id));
    if (userId && !id.startsWith('local-')) {
      await supabase.from('weekly_intentions').delete().eq('id', id);
    }
  }

  function startEdit(task: Task) {
    if (task.done) return;
    setEditingId(task.id);
    setEditText(task.text);
  }

  async function commitEdit() {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) {
      deleteTask(editingId);
    } else {
      persist(tasks.map((t) => (t.id === editingId ? { ...t, text } : t)));
      if (userId && !editingId.startsWith('local-')) {
        await supabase.from('weekly_intentions').update({ text }).eq('id', editingId);
      }
    }
    setEditingId(null);
  }

  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('weeklyIntentions')}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{t('thisWeek')}</h2>
        </div>
        {tasks.length > 0 && (
          <span className="text-sm tabular-nums text-slate-400 dark:text-slate-500">{done}/{tasks.length}</span>
        )}
      </div>

      <ul className="space-y-1.5 flex-1">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
              task.done
                ? 'bg-emerald-50 dark:bg-emerald-950/20'
                : 'bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/70'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleDone(task)}
              className={`shrink-0 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                task.done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-300 hover:border-emerald-400 dark:border-slate-600'
              }`}
            >
              {task.done && (
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {editingId === task.id ? (
              <input
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 bg-transparent text-base text-slate-900 dark:text-slate-100 outline-none border-b border-slate-300 dark:border-slate-600 pb-0.5"
              />
            ) : (
              <span
                onClick={() => startEdit(task)}
                className={`flex-1 text-base select-none ${
                  task.done
                    ? 'text-slate-400 line-through dark:text-slate-500 cursor-default'
                    : 'text-slate-800 dark:text-slate-200 cursor-text'
                }`}
              >
                {task.text}
              </span>
            )}

            <button
              type="button"
              onClick={() => deleteTask(task.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-[11px] text-slate-300 hover:text-red-400 dark:text-slate-700 dark:hover:text-red-500 transition-opacity"
            >
              ✕
            </button>
          </li>
        ))}

        {tasks.length === 0 && (
          <li className="py-8 text-center text-base text-slate-300 dark:text-slate-700 select-none">
            {t('noIntentionsYet')}
          </li>
        )}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
          placeholder={t('addIntention')}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-300 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-700 dark:focus:border-slate-600"
        />
        <button
          type="button"
          onClick={addTask}
          disabled={!input.trim()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
        >
          {t('add')}
        </button>
      </div>
    </div>
  );
}
