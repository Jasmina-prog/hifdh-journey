'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGetList, apiPost } from '@/lib/api';
import type { VocabWord } from '@/lib/types';
import { optimisticListInsert, optimisticListRemove, restoreLists, snapshotLists, tempId } from './_optimisticList';

const KEY = 'vocab-words';

export function useVocabWords(enabled = true) {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiGetList<VocabWord>(`/api/vocab-words?limit=200`),
    enabled,
  });
}

type CreateInput = Pick<VocabWord, 'word' | 'meaning'> & Partial<Pick<VocabWord, 'root' | 'foundIn'>>;

export function useCreateVocabWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInput) => apiPost<VocabWord>('/api/vocab-words', body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<VocabWord>(qc, KEY);
      const optimistic: VocabWord = {
        id: tempId(),
        word: body.word,
        meaning: body.meaning,
        root: body.root ?? '',
        foundIn: body.foundIn ?? '',
        createdAt: new Date().toISOString(),
      };
      optimisticListInsert(qc, KEY, optimistic);
      return { snapshot };
    },
    onError: (_err, _body, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteVocabWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/vocab-words/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const snapshot = snapshotLists<VocabWord>(qc, KEY);
      optimisticListRemove(qc, KEY, id);
      return { snapshot };
    },
    onError: (_err, _id, ctx) => ctx && restoreLists(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
