import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { ListMeta } from '@/lib/api';

export type ListResult<T> = { data: T[]; meta: ListMeta };

export function snapshotLists<T>(qc: QueryClient, keyPrefix: string) {
  return qc.getQueriesData<ListResult<T>>({ queryKey: [keyPrefix] });
}

export function restoreLists<T>(qc: QueryClient, snapshots: [QueryKey, ListResult<T> | undefined][]) {
  snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
}

export function optimisticListInsert<T>(qc: QueryClient, keyPrefix: string, item: T, prepend = true) {
  qc.setQueriesData<ListResult<T>>({ queryKey: [keyPrefix] }, (old) => {
    if (!old) return old;
    return { ...old, data: prepend ? [item, ...old.data] : [...old.data, item] };
  });
}

export function optimisticListUpdate<T extends { id: string }>(
  qc: QueryClient,
  keyPrefix: string,
  id: string,
  patch: Partial<T>,
) {
  qc.setQueriesData<ListResult<T>>({ queryKey: [keyPrefix] }, (old) => {
    if (!old) return old;
    return { ...old, data: old.data.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
  });
}

export function optimisticListRemove<T extends { id: string }>(qc: QueryClient, keyPrefix: string, id: string) {
  qc.setQueriesData<ListResult<T>>({ queryKey: [keyPrefix] }, (old) => {
    if (!old) return old;
    return { ...old, data: old.data.filter((x) => x.id !== id) };
  });
}

export function tempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
