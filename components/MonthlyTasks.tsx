'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

type Task = { id: string; title: string; completed: boolean };

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function MonthlyTasks({ userId }: { userId: string | null }) {
  const { t } = useTranslation('common');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const month = getMonthKey();
  const storageKey = `hifdh-monthly-${userId ?? 'guest'}-${month}`;

  // Load: localStorage first (instant), then Supabase (if available)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setTasks(JSON.parse(raw));
    } catch {}

    if (userId) {
      supabase
        .from('monthly_tasks')
        .select('id, title, completed')
        .eq('user_id', userId)
        .eq('month', month)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setTasks(data as Task[]);
            try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
          }
        });
    }
  }, [userId, month, storageKey]);

  function persist(updated: Task[]) {
    setTasks(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
  }

  async function addTask() {
    const title = input.trim();
    if (!title) return;

    const tempId = `local-${Date.now()}`;
    const newTask: Task = { id: tempId, title, completed: false };
    persist([...tasks, newTask]);
    setInput('');
    inputRef.current?.focus();

    if (userId) {
      const { data } = await supabase
        .from('monthly_tasks')
        .insert({ user_id: userId, month, title, completed: false })
        .select('id, title, completed')
        .single();
      if (data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? (data as Task) : t))
        );
      }
    }
  }

  async function toggleTask(task: Task) {
    const updated = tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t));
    persist(updated);
    if (userId && !task.id.startsWith('local-')) {
      await supabase.from('monthly_tasks').update({ completed: !task.completed }).eq('id', task.id);
    }
  }

  async function deleteTask(id: string) {
    persist(tasks.filter((t) => t.id !== id));
    if (userId && !id.startsWith('local-')) {
      await supabase.from('monthly_tasks').delete().eq('id', id);
    }
  }

  function startEdit(task: Task) {
    if (task.completed) return;
    setEditingId(task.id);
    setEditText(task.title);
  }

  async function commitEdit() {
    if (!editingId) return;
    const title = editText.trim();
    if (!title) {
      deleteTask(editingId);
    } else {
      const updated = tasks.map((t) => (t.id === editingId ? { ...t, title } : t));
      persist(updated);
      if (userId && !editingId.startsWith('local-')) {
        await supabase.from('monthly_tasks').update({ title }).eq('id', editingId);
      }
    }
    setEditingId(null);
  }

  const done = tasks.filter((t) => t.completed).length;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('monthlyGoals')}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{monthLabel()}</h2>
        </div>
        {tasks.length > 0 && (
          <span className="text-sm tabular-nums text-slate-400 dark:text-slate-500">{done}/{tasks.length}</span>
        )}
      </div>

      <ul className="space-y-1.5">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
              task.completed
                ? 'bg-emerald-50 dark:bg-emerald-950/20'
                : 'bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/70'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleTask(task)}
              className={`shrink-0 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                task.completed
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-300 hover:border-emerald-400 dark:border-slate-600'
              }`}
            >
              {task.completed && (
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
                  task.completed
                    ? 'text-slate-400 line-through dark:text-slate-500 cursor-default'
                    : 'text-slate-800 dark:text-slate-200 cursor-text'
                }`}
              >
                {task.title}
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
            {t('noGoalsYet')}
          </li>
        )}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
          placeholder={t('addGoalPlaceholder')}
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
