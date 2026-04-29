'use client';

type HeatmapDay = {
  date: string;
  count: number;
  title: string;
};

const colors = [
  'bg-amber-100 dark:bg-amber-900',
  'bg-amber-200 dark:bg-amber-800',
  'bg-amber-300 dark:bg-amber-700',
  'bg-emerald-400 dark:bg-emerald-600',
  'bg-emerald-600 dark:bg-emerald-500',
];

function levelClass(count: number) {
  if (count === 0) return colors[0];
  if (count === 1) return colors[1];
  if (count === 2) return colors[2];
  if (count === 3) return colors[3];
  return colors[4];
}

export function HeatmapGrid({ data }: { data: HeatmapDay[] }) {
  return (
    <div className="grid grid-cols-18 gap-1">
      {data.map((day) => (
        <div
          key={day.date}
          title={day.title}
          className={`h-8 w-full rounded-lg ${levelClass(day.count)} transition-colors duration-200 hover:scale-105 hover:shadow-lg`}
        />
      ))}
    </div>
  );
}
