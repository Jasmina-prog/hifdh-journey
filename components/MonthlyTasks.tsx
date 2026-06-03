'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Task = { id: string; title: string; completed: boolean; month: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function currentYear()    { return new Date().getFullYear(); }
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthKeyOf(year: number, idx: number) {
  return `${year}-${String(idx + 1).padStart(2, '0')}`;
}
function isPast(key: string)    { return key < currentMonthKey(); }
function isCurrent(key: string) { return key === currentMonthKey(); }

// ─── Cell colour config ───────────────────────────────────────────────────────

function cellStyle(tasks: Task[], key: string) {
  const total = tasks.length;
  const done  = tasks.filter((t) => t.completed).length;
  const cur   = isCurrent(key);
  const past  = isPast(key);

  if (cur) {
    if (total === 0 || done < total)
      return { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-400 dark:border-amber-500', bar: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' };
    return { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-500 dark:border-emerald-400', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (past) {
    if (total === 0)   return { bg: 'bg-slate-50 dark:bg-slate-900/40',   border: 'border-slate-200 dark:border-slate-700', bar: 'bg-slate-200 dark:bg-slate-700',  text: 'text-slate-400 dark:text-slate-500' };
    if (done === total) return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-400', text: 'text-emerald-600 dark:text-emerald-500' };
    if (done === 0)    return { bg: 'bg-rose-50 dark:bg-rose-950/20',     border: 'border-rose-200 dark:border-rose-800',   bar: 'bg-rose-400',   text: 'text-rose-500 dark:text-rose-500' };
    return { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800', bar: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-500' };
  }
  // Future — dashed border only, no background fill
  return { bg: 'bg-transparent', border: 'border-dashed border-slate-300 dark:border-slate-600', bar: 'bg-transparent', text: 'text-slate-300 dark:text-slate-600' };
}

// ─── Year Grid ────────────────────────────────────────────────────────────────

function YearGrid({ year, tasksByMonth, viewing, onSelect }: {
  year: number;
  tasksByMonth: Record<string, Task[]>;
  viewing: string;
  onSelect: (key: string) => void;
}) {
  const yearDone  = Object.values(tasksByMonth).reduce((s, ts) => s + ts.filter((t) => t.completed).length, 0);
  const yearTotal = Object.values(tasksByMonth).reduce((s, ts) => s + ts.length, 0);

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {year} at a glance
        </p>
        {yearTotal > 0 && (
          <span className="text-xs tabular-nums font-medium text-slate-400 dark:text-slate-500">
            {yearDone}/{yearTotal} goals
          </span>
        )}
      </div>

      <div className="grid grid-cols-6 gap-2">
        {MONTH_ABBR.map((abbr, idx) => {
          const key    = monthKeyOf(year, idx);
          const tasks  = tasksByMonth[key] ?? [];
          const done   = tasks.filter((t) => t.completed).length;
          const total  = tasks.length;
          const pct    = total > 0 ? (done / total) * 100 : 0;
          const style  = cellStyle(tasks, key);
          const selected = viewing === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-1 py-2.5 text-center transition-all
                ${style.bg}
                ${selected ? 'border-slate-800 dark:border-slate-200 shadow-md scale-[1.05]' : style.border}
                ${'hover:scale-[1.03] hover:shadow-sm cursor-pointer'}
              `}
            >
              <span className={`text-[11px] font-bold tracking-wide leading-none ${style.text}`}>{abbr}</span>

              {/* Thin progress bar */}
              <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(148,163,184,0.2)' }}>
                <div className={`h-full rounded-full transition-all duration-500 ${style.bar}`} style={{ width: `${pct}%` }} />
              </div>

              <span className={`text-[10px] tabular-nums font-medium leading-none ${style.text}`}>
                {total === 0 ? '—' : `${done}/${total}`}
              </span>

              {/* All-done badge */}
              {total > 0 && done === total && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white" style={{ fontSize: 8 }}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, editable, onToggle, onDelete, onEdit }: {
  task: Task;
  editable: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(task.title);

  function commit() {
    const v = draft.trim();
    if (!v) onDelete(); else onEdit(v);
    setEditing(false);
  }

  return (
    <li className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
      task.completed ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/70'
    }`}>
      <button
        type="button"
        onClick={editable ? onToggle : undefined}
        className={`shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-all ${
          task.completed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : editable
              ? 'border-slate-300 hover:border-emerald-400 dark:border-slate-600'
              : 'border-slate-200 dark:border-slate-700 cursor-default'
        }`}
      >
        {task.completed && (
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none border-b border-slate-300 dark:border-slate-600 pb-0.5"
        />
      ) : (
        <span
          onClick={() => editable && !task.completed && setEditing(true)}
          className={`flex-1 text-sm select-none ${
            task.completed
              ? 'line-through text-slate-400 dark:text-slate-500'
              : editable
                ? 'text-slate-800 dark:text-slate-200 cursor-text'
                : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {task.title}
        </span>
      )}

      {editable && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-[11px] text-slate-300 hover:text-red-400 dark:text-slate-700 dark:hover:text-red-500 transition-opacity"
        >
          ✕
        </button>
      )}
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MonthlyTasks({ userId }: { userId: string | null }) {
  const [allTasks,     setAllTasks]     = useState<Task[]>([]);
  const [viewingMonth, setViewingMonth] = useState(currentMonthKey());
  const [input,        setInput]        = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const year   = currentYear();
  const curKey = currentMonthKey();

  // ── Load full year ──────────────────────────────────────────────────────────

  useEffect(() => {
    const cacheKey = `hifdh-monthly-year-${userId ?? 'guest'}-${year}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) setAllTasks(JSON.parse(raw));
    } catch {}

    if (!userId) return;

    supabase
      .from('monthly_tasks')
      .select('id,title,completed,month')
      .eq('user_id', userId)
      .gte('month', `${year}-01`)
      .lte('month', `${year}-12`)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const fetched = data as Task[];
          try { localStorage.setItem(cacheKey, JSON.stringify(fetched)); } catch {}
          setAllTasks((prev) => {
            // Preserve any optimistic (local-*) tasks that are still in-flight
            const pending = prev.filter((t) => t.id.startsWith('local-'));
            return pending.length > 0 ? [...fetched, ...pending] : fetched;
          });
        }
      });
  }, [userId, year]);

  // ── Persist helper ──────────────────────────────────────────────────────────

  function persist(updated: Task[]) {
    setAllTasks(updated);
    try {
      localStorage.setItem(`hifdh-monthly-year-${userId ?? 'guest'}-${year}`, JSON.stringify(updated));
    } catch {}
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async function addTask() {
    const title = input.trim();
    if (!title) return;
    const tempId = `local-${Date.now()}`;
    const newTask: Task = { id: tempId, title, completed: false, month: viewingMonth };
    const cacheKey = `hifdh-monthly-year-${userId ?? 'guest'}-${year}`;

    // Optimistic insert — functional update avoids stale-closure overwrite
    setAllTasks((prev) => {
      const updated = [...prev, newTask];
      try { localStorage.setItem(cacheKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setInput('');
    inputRef.current?.focus();

    if (!userId) return;

    const { data, error } = await supabase
      .from('monthly_tasks')
      .insert({ user_id: userId, month: viewingMonth, title, completed: false })
      .select('id,title,completed,month')
      .single();

    if (error || !data) {
      // Insert failed — roll back the optimistic task
      setAllTasks((prev) => {
        const rolled = prev.filter((t) => t.id !== tempId);
        try { localStorage.setItem(cacheKey, JSON.stringify(rolled)); } catch {}
        return rolled;
      });
      return;
    }

    setAllTasks((prev) => {
      const pending = prev.find((t) => t.id === tempId);
      if (!pending) {
        // Task was deleted while insert was in-flight — undo DB record
        supabase.from('monthly_tasks').delete().eq('id', (data as Task).id).eq('user_id', userId);
        return prev;
      }
      // Preserve any local state changes (e.g. toggle while insert was in-flight)
      const updated = prev.map((t) =>
        t.id === tempId ? { ...(data as Task), completed: pending.completed } : t,
      );
      try { localStorage.setItem(cacheKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  async function toggleTask(task: Task) {
    persist(allTasks.map((t) => t.id === task.id ? { ...t, completed: !t.completed } : t));
    if (userId && !task.id.startsWith('local-')) {
      await supabase.from('monthly_tasks').update({ completed: !task.completed }).eq('id', task.id).eq('user_id', userId);
    }
  }

  async function editTask(task: Task, title: string) {
    persist(allTasks.map((t) => t.id === task.id ? { ...t, title } : t));
    if (userId && !task.id.startsWith('local-')) {
      await supabase.from('monthly_tasks').update({ title }).eq('id', task.id).eq('user_id', userId);
    }
  }

  async function deleteTask(id: string) {
    persist(allTasks.filter((t) => t.id !== id));
    if (userId && !id.startsWith('local-')) {
      await supabase.from('monthly_tasks').delete().eq('id', id).eq('user_id', userId);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const tasksByMonth = allTasks.reduce<Record<string, Task[]>>((acc, t) => {
    (acc[t.month] ??= []).push(t);
    return acc;
  }, {});

  const viewingTasks    = tasksByMonth[viewingMonth] ?? [];
  const viewingDone     = viewingTasks.filter((t) => t.completed).length;
  const isViewingCur    = isCurrent(viewingMonth);
  const isViewingFuture = !isPast(viewingMonth) && !isCurrent(viewingMonth);
  const isEditable      = isViewingCur || isViewingFuture;
  const monthIdx        = parseInt(viewingMonth.slice(5), 10) - 1;
  const monthLabel      = `${MONTH_FULL[monthIdx]} ${year}`;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Monthly Goals</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {MONTH_FULL[new Date().getMonth()]} {year}
          </h2>
        </div>
        {(tasksByMonth[curKey]?.length ?? 0) > 0 && (
          <span className="text-sm tabular-nums text-slate-400 dark:text-slate-500">
            {tasksByMonth[curKey].filter((t) => t.completed).length}/{tasksByMonth[curKey].length} this month
          </span>
        )}
      </div>

      {/* Year grid */}
      <YearGrid
        year={year}
        tasksByMonth={tasksByMonth}
        viewing={viewingMonth}
        onSelect={(key) => setViewingMonth(key)}
      />

      {/* Selected month detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewingMonth}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 flex-col min-h-0"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{monthLabel}</h3>
              {isViewingCur
                ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Current</span>
                : isViewingFuture
                  ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800 dark:text-slate-500">Upcoming</span>
                  : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">Ended</span>
              }
            </div>
            {viewingTasks.length > 0 && (
              <span className="text-xs tabular-nums font-medium text-slate-400 dark:text-slate-500">
                {viewingDone}/{viewingTasks.length} completed
              </span>
            )}
          </div>

          <ul className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
            {viewingTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                editable={isEditable}
                onToggle={() => toggleTask(task)}
                onDelete={() => deleteTask(task.id)}
                onEdit={(title) => editTask(task, title)}
              />
            ))}
            {viewingTasks.length === 0 && (
              <li className="py-8 text-center text-sm text-slate-300 dark:text-slate-700 select-none">
                {isViewingCur ? 'No goals yet — add one below.' : isViewingFuture ? 'Plan ahead — add goals for this month.' : 'No goals were set for this month.'}
              </li>
            )}
          </ul>

          {isEditable && (
            <div className="mt-4 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
                placeholder={isViewingFuture ? `Plan a goal for ${MONTH_FULL[monthIdx]}…` : 'Add a goal for this month…'}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-700 dark:focus:border-slate-600"
              />
              <button
                type="button"
                onClick={addTask}
                disabled={!input.trim()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
              >
                Add
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
