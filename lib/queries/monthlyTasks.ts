'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiDelete, apiGetList, apiPatch, apiPost } from '@/lib/api';
import type { MonthlyTask } from '@/lib/types';
import { tempId } from './_optimisticList';

const KEY = 'monthly-tasks';

// The API only filters `month` by exact equality (no range/gte-lte), so a
// "whole year" view is built by fetching each month in parallel and merging.
export function useMonthlyTasksYear(year: number, enabled = true) {
  return useQuery({
    queryKey: [KEY, 'year', year],
    queryFn: async () => {
      const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
      const results = await Promise.all(
        months.map((m) => apiGetList<MonthlyTask>(`/api/monthly-tasks?month=${m}&limit=200`)),
      );
      return results.flatMap((r) => r.data);
    },
    enabled,
  });
}

function patchAllYears(qc: QueryClient, updater: (tasks: MonthlyTask[]) => MonthlyTask[]) {
  qc.setQueriesData<MonthlyTask[]>({ queryKey: [KEY, 'year'] }, (old) => (old ? updater(old) : old));
}

function snapshotYears(qc: QueryClient) {
  return qc.getQueriesData<MonthlyTask[]>({ queryKey: [KEY, 'year'] });
}

function restoreYears(qc: QueryClient, snapshot: ReturnType<typeof snapshotYears>) {
  snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
}

export function useCreateMonthlyTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Pick<MonthlyTask, 'month' | 'title'>) => apiPost<MonthlyTask>('/api/monthly-tasks', body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotYears(qc);
      const optimistic: MonthlyTask = { id: tempId(), month: body.month, title: body.title, completed: false, createdAt: new Date().toISOString() };
      patchAllYears(qc, (tasks) => [...tasks, optimistic]);
      return { snapshot };
    },
    onError: (_err, _body, ctx) => ctx && restoreYears(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateMonthlyTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<MonthlyTask, 'title' | 'completed'>> }) =>
      apiPatch<MonthlyTask>(`/api/monthly-tasks/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotYears(qc);
      patchAllYears(qc, (tasks) => tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => ctx && restoreYears(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteMonthlyTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/monthly-tasks/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotYears(qc);
      patchAllYears(qc, (tasks) => tasks.filter((t) => t.id !== id));
      return { snapshot };
    },
    onError: (_err, _id, ctx) => ctx && restoreYears(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
