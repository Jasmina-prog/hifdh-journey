'use client';

type ProgressRingProps = {
  label: string;
  value: number;
  subtitle: string;
  detail?: string;
  active?: boolean;
  complete?: boolean;
  onClick?: () => void;
};

const radius = 52;
const circumference = 2 * Math.PI * radius;

export function ProgressRing({ label, value, subtitle, detail, active, complete, onClick }: ProgressRingProps) {
  const offset     = circumference - (value / 100) * circumference;
  const isComplete = complete ?? value === 100;

  const ringStroke = isComplete ? '#10b981' : 'currentColor';
  const cardClass  = isComplete
    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
    : active
      ? 'border-slate-900 bg-slate-100 dark:border-slate-200 dark:bg-slate-900/70'
      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[2rem] border p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md ${cardClass}`}
    >
      <div className="flex items-center gap-5">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 140 140" className="h-full w-full">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="12" />
            <circle
              cx="70" cy="70" r={radius} fill="none"
              stroke={ringStroke}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              className="origin-center translate-x-0.5 -rotate-90 transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className={`text-2xl font-semibold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {isComplete ? '✓' : `${value}%`}
              </p>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">done</p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-3 text-xl font-semibold ${isComplete ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}>
            {subtitle}
          </p>
        </div>
      </div>
      <div className={`pointer-events-none mt-5 rounded-3xl border px-4 py-3 text-base ${
        isComplete
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
      }`}>
        {isComplete ? '🎉 Completed — well done!' : (detail ?? 'Tap for details')}
      </div>
    </button>
  );
}
