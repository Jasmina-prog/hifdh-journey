'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGetList, apiPatch, apiPost } from '@/lib/api';
import type { SurahProgress, SurahStatus } from '@/lib/types';

const KEY = 'surah-progress';

export type SurahProgressFilters = { status?: SurahStatus };

export function useSurahProgress(filters: SurahProgressFilters = {}, enabled = true) {
  const params = new URLSearchParams({ limit: '114' });
  if (filters.status) params.set('status', filters.status);
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () => apiGetList<SurahProgress>(`/api/surah-progress?${params.toString()}`),
    enabled,
  });
}

type UpsertInput = {
  id?: string;
  surahNumber: number;
  patch: Partial<Pick<SurahProgress, 'status' | 'notes' | 'lastReviewed' | 'confidence'>>;
};

// The API has no upsert endpoint — the caller must already know whether a
// row exists for this surah (via useSurahProgress) and pass its id.
export function useUpsertSurahProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, surahNumber, patch }: UpsertInput) =>
      id
        ? apiPatch<SurahProgress>(`/api/surah-progress/${id}`, patch)
        : apiPost<SurahProgress>('/api/surah-progress', { surahNumber, ...patch }),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
