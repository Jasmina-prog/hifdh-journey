'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGetList, apiPatch, apiPost } from '@/lib/api';
import type { WeeklyIntention } from '@/lib/types';
import { optimisticListInsert, optimisticListRemove, optimisticListUpdate, restoreLists, snapshotLists, tempId } from './_optimisticList';

const KEY = 'weekly-intentions';

export function useWeeklyIntentions(week: string, enabled = true) {
  return useQuery({
    queryKey: [KEY, week],
    queryFn: () => apiGetList<WeeklyIntention>(`/api/weekly-intentions?week=${encodeURIComponent(week)}&limit=200`),
    enabled,
  });
}

export function useCreateWeeklyIntention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Pick<WeeklyIntention, 'week' | 'text'>) => apiPost<WeeklyIntention>('/api/weekly-intentions', body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<WeeklyIntention>(qc, KEY);
      const optimistic: WeeklyIntention = { id: tempId(), week: body.week, text: body.text, done: false, createdAt: new Date().toISOString() };
      optimisticListInsert(qc, KEY, optimistic, false);
      return { snapshot };
    },
    onError: (_err, _body, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateWeeklyIntention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<WeeklyIntention, 'text' | 'done'>> }) =>
      apiPatch<WeeklyIntention>(`/api/weekly-intentions/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<WeeklyIntention>(qc, KEY);
      optimisticListUpdate<WeeklyIntention>(qc, KEY, id, patch);
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteWeeklyIntention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/weekly-intentions/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<WeeklyIntention>(qc, KEY);
      optimisticListRemove(qc, KEY, id);
      return { snapshot };
    },
    onError: (_err, _id, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
