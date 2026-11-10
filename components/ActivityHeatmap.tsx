'use client';

import { useTranslation } from 'react-i18next';
import { localDateKey, monthShort, weekdayShort } from '@/lib/dates';

type ProgressRow = {
  lastReviewed: string | null;
};

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-slate-200 dark:bg-slate-700',
  1: 'bg-emerald-300 dark:bg-emerald-800',
  2: 'bg-emerald-500 dark:bg-emerald-600',
  3: 'bg-emerald-600 dark:bg-emerald-500',
  4: 'bg-emerald-700 dark:bg-emerald-400',
};

function getLevel(count: number, isFuture: boolean): 0 | 1 | 2 | 3 | 4 {
  if (isFuture || count <= 0) return 0;
  return Math.min(count, 4) as 1 | 2 | 3 | 4;
}

const WEEKS = 53;
// Rows are Sunday first, like GitHub's. Only Monday, Wednesday and Friday are labelled.
const LABELLED_WEEKDAYS: (number | null)[] = [null, 1, null, 3, null, 5, null];

/**
 * A year of activity, one square per day. A day counts every surah reviewed that day plus
 * anything else in `activity` (journal entries, memorization sessions), given as ISO
 * strings or millisecond timestamps. Days are the user's own calendar days, not UTC.
 */
export function ActivityHeatmap({ progressRows = [], activity = [] }: {
  progressRows?: ProgressRow[];
  activity?: (string | number)[];
}) {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;

  const today = new Date();
  const todayStr = localDateKey(today);

  const activityMap = new Map<string, number>();
  function count(when: string | number | null) {
    if (when == null) return;
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) return;
    const key = localDateKey(date);
    activityMap.set(key, (activityMap.get(key) ?? 0) + 1);
  }
  for (const row of progressRows) count(row.lastReviewed);
  for (const when of activity) count(when);

  // The last column is the current week, so it starts 52 Sundays after the first column.
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (WEEKS - 1) * 7);

  // grid[dayOfWeek][weekIndex]
  const grid: { date: string; level: 0 | 1 | 2 | 3 | 4 }[][] = Array.from({ length: 7 }, () => []);
  const monthLabels: { month: number; col: number }[] = [];

  const cursor = new Date(startDate);
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const key = localDateKey(cursor);
      if (d === 0 && cursor.getDate() <= 7) {
        monthLabels.push({ month: cursor.getMonth(), col: w });
      }
      grid[d].push({ date: key, level: getLevel(activityMap.get(key) ?? 0, key > todayStr) });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const thisYear = today.getFullYear().toString();
  const totalDone = Array.from(activityMap.keys()).filter((d) => d.startsWith(thisYear)).length;

  return (
    <div className="w-full">
      {/* Month labels row */}
      <div
        className="mb-1 grid text-[10px] text-slate-400 dark:text-slate-500"
        style={{ gridTemplateColumns: `28px repeat(${WEEKS}, 1fr)` }}
      >
        <span />
        {Array.from({ length: WEEKS }, (_, i) => {
          const label = monthLabels.find((m) => m.col === i);
          return (
            <span key={i}>
              {label ? monthShort(label.month, locale) : ''}
            </span>
          );
        })}
      </div>

      {/* Heatmap: weekday labels + 7 rows of cells */}
      <div className="flex gap-1.5">
        {/* Weekday labels */}
        <div className="flex w-7 shrink-0 flex-col" style={{ gap: 3 }}>
          {LABELLED_WEEKDAYS.map((day, i) => (
            <div
              key={i}
              className="flex items-center text-[9px] leading-none text-slate-400 dark:text-slate-500"
              style={{ height: 0, flexGrow: 1 }}
            >
              {day !== null ? weekdayShort(day, locale) : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          className="grid flex-1"
          style={{
            gridTemplateRows: `repeat(7, 1fr)`,
            gridTemplateColumns: `repeat(${WEEKS}, 1fr)`,
            gridAutoFlow: 'column',
            gap: 3,
          }}
        >
          {Array.from({ length: WEEKS }, (_, w) =>
            Array.from({ length: 7 }, (_, d) => {
              const cell = grid[d][w];
              const count = activityMap.get(cell.date) ?? 0;
              const tooltip = count > 0
                ? t('heatmapTooltip', { count, date: cell.date })
                : cell.date;
              return (
                <div
                  key={`${d}-${w}`}
                  title={tooltip}
                  className={`rounded-xs ${LEVEL_CLASSES[cell.level]}`}
                  style={{ aspectRatio: '1 / 1' }}
                />
              );
            })
          ).flat()}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>{t('heatmapActiveDays', { count: totalDone })}</span>
        <div className="flex items-center gap-1.5">
          <span>{t('heatmapLess')}</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <div key={l} className={`h-3 w-3 rounded-xs ${LEVEL_CLASSES[l]}`} />
          ))}
          <span>{t('heatmapMore')}</span>
        </div>
      </div>
    </div>
  );
}
