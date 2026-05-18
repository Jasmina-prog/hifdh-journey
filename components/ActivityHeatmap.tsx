'use client';

type DailyLog = {
  log_date: string;
  sabaq_done: boolean;
  sabqi_done: boolean;
  manzil_done: boolean;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-slate-100 dark:bg-slate-800/80',
  1: 'bg-emerald-200 dark:bg-emerald-900/70',
  2: 'bg-emerald-400 dark:bg-emerald-700',
  3: 'bg-emerald-500 dark:bg-emerald-500',
  4: 'bg-emerald-600 dark:bg-emerald-400',
};

function getLevel(count: number, isFuture: boolean): 0 | 1 | 2 | 3 | 4 {
  if (isFuture || count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 4;
  return 3;
}

export function ActivityHeatmap({ logs }: { logs: DailyLog[] }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const logMap = new Map<string, number>();
  for (const log of logs) {
    const count = Number(log.sabaq_done) + Number(log.sabqi_done) + Number(log.manzil_done);
    if (count > 0) logMap.set(log.log_date, count);
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
      grid[d].push({ date: key, level: getLevel(logMap.get(key) ?? 0, key > todayStr) });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const totalDone = logs.filter((l) => l.sabaq_done || l.sabqi_done || l.manzil_done).length;

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
          return <span key={i}>{label ? MONTHS[label.month] : ''}</span>;
        })}
      </div>

      {/* Heatmap: weekday labels + 7 rows of cells */}
      <div className="flex gap-1.5">
        {/* Weekday labels */}
        <div className="flex w-7 shrink-0 flex-col" style={{ gap: 3 }}>
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="flex items-center text-[9px] leading-none text-slate-400 dark:text-slate-500"
              style={{ height: 0, flexGrow: 1 }}
            >
              {label}
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
          {grid.flatMap((row, d) =>
            row.map((cell, w) => (
              <div
                key={`${d}-${w}`}
                title={cell.date}
                className={`rounded-xs ${LEVEL_CLASSES[cell.level]}`}
                style={{ aspectRatio: '1 / 1' }}
              />
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>{totalDone} tasks completed this year</span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <div key={l} className={`h-3 w-3 rounded-xs ${LEVEL_CLASSES[l]}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
