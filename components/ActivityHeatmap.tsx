'use client';

import { ActivityCalendar } from 'react-activity-calendar';
import { useEffect, useRef, useState } from 'react';

type DailyLog = {
  log_date: string;
  sabaq_done: boolean;
  sabqi_done: boolean;
  manzil_done: boolean;
};

export function ActivityHeatmap({ logs }: { logs: DailyLog[] }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const startStr = `${today.getFullYear()}-01-01`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [blockSize, setBlockSize] = useState(14);
  const blockMargin = 4;

  useEffect(() => {
    function calcSize() {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const weekCount = 53;
      const size = Math.floor((w - blockMargin * (weekCount - 1)) / weekCount);
      setBlockSize(Math.max(10, Math.min(22, size)));
    }
    calcSize();
    const ro = new ResizeObserver(calcSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const logMap = new Map<string, number>();
  for (const log of logs) {
    const count = Number(log.sabaq_done) + Number(log.sabqi_done) + Number(log.manzil_done);
    if (count > 0) logMap.set(log.log_date, count);
  }

  const data: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  const cursor = new Date(startStr);
  const end = new Date(todayStr);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const count = logMap.get(key) ?? 0;
    const level = (count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 4 : 3) as 0 | 1 | 2 | 3 | 4;
    data.push({ date: key, count, level });
    cursor.setDate(cursor.getDate() + 1);
  }

  return (
    <div ref={containerRef} className="w-full">
      <ActivityCalendar
        data={data}
        blockSize={blockSize}
        blockMargin={blockMargin}
        fontSize={15}
        theme={{
          light: ['#f1f5f9', '#bbf7d0', '#4ade80', '#16a34a', '#14532d'],
          dark: ['#1e293b', '#052e16', '#166534', '#16a34a', '#4ade80'],
        }}
        labels={{
          legend: { less: 'Less', more: 'More' },
          months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          totalCount: '{{count}} tasks completed so far this year',
        }}
        showWeekdayLabels
      />
    </div>
  );
}
