'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useWeeklyIntentions,
  useCreateWeeklyIntention,
  useUpdateWeeklyIntention,
  useDeleteWeeklyIntention,
} from '@/lib/queries/weeklyIntentions';
import type { WeeklyIntention } from '@/lib/types';

type Task = WeeklyIntention;

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
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const onStatsRef = useRef(onStatsChange);
  onStatsRef.current = onStatsChange;

  const week = getWeekKey();
  const { data } = useWeeklyIntentions(week, !!userId);
  const tasks = data?.data ?? [];

  const createMutation = useCreateWeeklyIntention();
  const updateMutation = useUpdateWeeklyIntention();
  const deleteMutation = useDeleteWeeklyIntention();

  useEffect(() => {
    onStatsRef.current?.(tasks.filter((t) => t.done).length, tasks.length);
  }, [tasks]);

  async function addTask() {
    const text = input.trim();
    if (!text || !userId) return;
    setInput('');
    inputRef.current?.focus();
    try {
      await createMutation.mutateAsync({ week, text });
    } catch {}
  }

  async function toggleDone(task: Task) {
    if (!userId || task.id.startsWith('temp-')) return;
    try {
      await updateMutation.mutateAsync({ id: task.id, patch: { done: !task.done } });
    } catch {}
  }

  async function deleteTask(id: string) {
    if (!userId || id.startsWith('temp-')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {}
  }

  function startEdit(task: Task) {
    if (task.done) return;
    setEditingId(task.id);
    setEditText(task.text);
  }

  async function commitEdit() {
    if (!editingId) return;
    const id = editingId;
    const text = editText.trim();
    setEditingId(null); // clear immediately so UI unblocks before any await

    if (!userId || id.startsWith('temp-')) return;

    try {
      if (!text) {
        await deleteMutation.mutateAsync(id);
      } else {
        await updateMutation.mutateAsync({ id, patch: { text } });
      }
    } catch {}
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

      <ul className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
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
          <li className="py-8 text-center select-none space-y-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mx-auto h-7 w-7 text-amber-400/70 dark:text-amber-400/40">
              <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('intentionEmptyMsg')}
            </p>
            <p className="text-xs text-slate-300 dark:text-slate-600">
              {t('intentionEmptyHint')}
            </p>
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
