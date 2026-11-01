// Keeps each surah's latest session result in this browser, separately per user.

import type { SessionResult } from './sessionResult.ts';

export type SavedResults = Record<number, SessionResult>;

const resultsKey = (userId: string | null) => `hifdh-companion-results-${userId ?? 'guest'}`;

export function loadResults(userId: string | null): SavedResults {
  try {
    const raw = localStorage.getItem(resultsKey(userId));
    return raw ? (JSON.parse(raw) as SavedResults) : {};
  } catch {
    return {};
  }
}

/** Returns the updated results, which still include this one if storage is unavailable. */
export function saveResult(userId: string | null, result: SessionResult): SavedResults {
  const results = { ...loadResults(userId), [result.surah]: result };
  try {
    localStorage.setItem(resultsKey(userId), JSON.stringify(results));
  } catch {
    // Storage is full or blocked. The result still shows for this visit.
  }
  return results;
}
