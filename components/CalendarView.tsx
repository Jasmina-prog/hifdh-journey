'use client';

import { useState } from 'react';

type DailyLog = {
  log_date: string;
  sabaq_done: boolean;
  sabqi_done: boolean;
  manzil_done: boolean;
};

function toHijriDay(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic', { day: 'numeric' }).format(date);
  } catch {
    return String(date.getDate());
  }
}

function monthHeader(year: number, month: number, hijri: boolean): string {
  const mid = new Date(year, month, 15);
  try {
    if (hijri) return new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'long', year: 'numeric' }).format(mid);
  } catch {}
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(mid);
}

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
          on ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

export function CalendarView({ logs }: { logs: DailyLog[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [hijri, setHijri] = useState(false);

  const activeSet = new Set(
    logs.filter((l) => l.sabaq_done || l.sabqi_done || l.manzil_done).map((l) => l.log_date)
  );

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {monthHeader(year, month, hijri)}
          </h3>
          <Switch on={hijri} onChange={() => setHijri((h) => !h)} label="Hijri" />
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={prevMonth} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">←</button>
          <button type="button" onClick={nextMonth} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">→</button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekdays.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-9" />;
          const dateObj = new Date(year, month, day);
          const dateKey = dateObj.toISOString().slice(0, 10);
          const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
          const isActive = activeSet.has(dateKey);
          const label = hijri ? toHijriDay(dateObj) : String(day);

          return (
            <div
              key={i}
              title={dateKey}
              className={`relative flex h-9 items-center justify-center rounded-lg text-[11px] font-medium transition-colors ${
                isToday
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : isActive
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
              }`}
            >
              {label}
              {isActive && !isToday && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
