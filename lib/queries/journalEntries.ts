'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGetList, apiPatch, apiPost } from '@/lib/api';
import type { JournalEntry } from '@/lib/types';
import {
  optimisticListInsert,
  optimisticListRemove,
  optimisticListUpdate,
  restoreLists,
  snapshotLists,
  tempId,
  type ListResult,
} from './_optimisticList';

const KEY = 'journal-entries';

export type JournalEntryFilters = { surahNumber?: number; pinned?: boolean; tag?: string };

function buildQuery(filters: JournalEntryFilters): string {
  const params = new URLSearchParams({ limit: '200' });
  if (filters.surahNumber != null) params.set('surahNumber', String(filters.surahNumber));
  if (filters.pinned != null) params.set('pinned', String(filters.pinned));
  if (filters.tag) params.set('tag', filters.tag);
  return params.toString();
}

export function useJournalEntries(filters: JournalEntryFilters = {}, enabled = true) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () => apiGetList<JournalEntry>(`/api/journal-entries?${buildQuery(filters)}`),
    enabled,
  });
}

type CreateInput = Pick<JournalEntry, 'content' | 'tag'> & Partial<Pick<JournalEntry, 'surahNumber' | 'ayahNumber'>>;

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInput) => apiPost<JournalEntry>('/api/journal-entries', body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<JournalEntry>(qc, KEY);
      const optimistic: JournalEntry = {
        id: tempId(),
        content: body.content,
        tag: body.tag,
        surahNumber: body.surahNumber ?? null,
        ayahNumber: body.ayahNumber ?? null,
        pinned: false,
        createdAt: new Date().toISOString(),
      };
      optimisticListInsert(qc, KEY, optimistic);
      return { snapshot };
    },
    onError: (_err, _body, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<JournalEntry> }) =>
      apiPatch<JournalEntry>(`/api/journal-entries/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<JournalEntry>(qc, KEY);
      optimisticListUpdate<JournalEntry>(qc, KEY, id, patch);
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/journal-entries/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<JournalEntry>(qc, KEY);
      optimisticListRemove(qc, KEY, id);
      return { snapshot };
    },
    onError: (_err, _id, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export type { ListResult };
