'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGetList, apiPost } from '@/lib/api';
import type { JournalMilestone } from '@/lib/types';
import { optimisticListInsert, optimisticListRemove, restoreLists, snapshotLists, tempId } from './_optimisticList';

const KEY = 'journal-milestones';

export function useJournalMilestones(enabled = true) {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiGetList<JournalMilestone>(`/api/journal-milestones?limit=200`),
    enabled,
  });
}

type CreateInput = Pick<JournalMilestone, 'text' | 'emoji'> & Partial<Pick<JournalMilestone, 'type'>>;

export function useCreateJournalMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInput) => apiPost<JournalMilestone>('/api/journal-milestones', body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<JournalMilestone>(qc, KEY);
      const optimistic: JournalMilestone = {
        id: tempId(),
        text: body.text,
        emoji: body.emoji,
        type: body.type ?? 'manual',
        createdAt: new Date().toISOString(),
      };
      optimisticListInsert(qc, KEY, optimistic);
      return { snapshot };
    },
    onError: (_err, _body, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteJournalMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/journal-milestones/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<JournalMilestone>(qc, KEY);
      optimisticListRemove(qc, KEY, id);
      return { snapshot };
    },
    onError: (_err, _id, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
