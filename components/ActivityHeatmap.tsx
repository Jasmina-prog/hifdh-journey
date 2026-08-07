'use client';

import { useTranslation } from 'react-i18next';

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
  if (isFuture || count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count >= 3) return 4;
  return 3;
}

// Jan 1 2024 is Monday — use it as a stable reference for weekday formatting
const WEEKDAY_REF = new Date(2024, 0, 1); // Mon
const WEEKDAY_OFFSETS = [null, 0, null, 2, null, 4, null]; // rows 1,3,5 → Mon,Wed,Fri

export function ActivityHeatmap({ progressRows = [] }: { progressRows?: ProgressRow[] }) {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Count surahs reviewed per day
  const activityMap = new Map<string, number>();
  for (const row of progressRows) {
    if (row.lastReviewed) {
      const date = row.lastReviewed.slice(0, 10);
      activityMap.set(date, (activityMap.get(date) ?? 0) + 1);
    }
  }

  // Start from Sunday of the week 52 weeks ago → 53 columns total
  const WEEKS = 53;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startDate.getDay() - 51 * 7);

  // cells[dayOfWeek][weekIndex]
  const grid: { date: string; level: 0 | 1 | 2 | 3 | 4 }[][] = Array.from({ length: 7 }, () => []);
  const monthLabels: { month: number; col: number }[] = [];

  const cursor = new Date(startDate);
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().slice(0, 10);
      if (d === 0 && cursor.getDate() <= 7) {
        monthLabels.push({ month: cursor.getMonth(), col: w });
      }
      grid[d].push({ date: key, level: getLevel(activityMap.get(key) ?? 0, key > todayStr) });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const thisYear = today.getFullYear().toString();
  const totalDone = Array.from(activityMap.keys()).filter((d) => d.startsWith(thisYear)).length;

  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'short' });
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });

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
              {label ? monthFmt.format(new Date(2024, label.month, 1)) : ''}
            </span>
          );
        })}
      </div>

      {/* Heatmap: weekday labels + 7 rows of cells */}
      <div className="flex gap-1.5">
        {/* Weekday labels */}
        <div className="flex w-7 shrink-0 flex-col" style={{ gap: 3 }}>
          {WEEKDAY_OFFSETS.map((offset, i) => (
            <div
              key={i}
              className="flex items-center text-[9px] leading-none text-slate-400 dark:text-slate-500"
              style={{ height: 0, flexGrow: 1 }}
            >
              {offset !== null
                ? weekdayFmt.format(new Date(WEEKDAY_REF.getTime() + offset * 86400000))
                : ''}
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
