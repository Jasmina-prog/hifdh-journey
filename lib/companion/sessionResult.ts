// Turns a finished session into plain data that can be shown and saved. No browser
// APIs, so the app can reuse it unchanged.

import type { CompanionSnapshot, CompanionWord } from './companion.ts';

export type ReviewItem = {
  verseKey: string;
  /** The word needing review. Absent when the qari recited the whole ayah. */
  word?: string;
  hints: number;
};

export type SessionResult = {
  surah: number;
  startAyah: number;
  /** Set when the user practised without the microphone and graded themselves. */
  mode?: 'manual';
  /** Ayah the user had reached, like "67:13". */
  reached: string;
  wordsCovered: number;
  hints: number;
  seconds: number;
  recognizedPercent: number;
  review: ReviewItem[];
  /** Hints needed in each ayah, by verse key like "67:13". Missing in results saved earlier. */
  ayahHints?: Record<string, number>;
  savedAt: number;
};

export function coveragePercent(snapshot: CompanionSnapshot): number {
  const passed = snapshot.frontier - snapshot.startIndex;
  if (passed <= 0) return 0;
  const heard = snapshot.heardIndexes.filter((i) => i >= snapshot.startIndex && i < snapshot.frontier).length;
  return Math.round((heard / passed) * 100);
}

export function summarizeSession(
  snapshot: CompanionSnapshot,
  words: CompanionWord[],
  session: { surah: number; startAyah: number; seconds: number; savedAt: number },
): SessionResult {
  const places = new Map<string, ReviewItem & { index: number }>();
  const ayahHints: Record<string, number> = {};
  for (const peek of snapshot.peeks) {
    ayahHints[peek.verseKey] = (ayahHints[peek.verseKey] ?? 0) + 1;
    const isAyah = peek.kind === 'ayah';
    const key = isAyah ? peek.verseKey : String(peek.index);
    const place = places.get(key) ?? {
      index: peek.index,
      verseKey: peek.verseKey,
      word: isAyah ? undefined : words[peek.index]?.text,
      hints: 0,
    };
    place.hints++;
    places.set(key, place);
  }

  return {
    ...session,
    reached: words[Math.min(snapshot.frontier, words.length - 1)]?.verseKey ?? '',
    wordsCovered: snapshot.frontier - snapshot.startIndex,
    hints: snapshot.peeks.length,
    recognizedPercent: coveragePercent(snapshot),
    ayahHints,
    review: [...places.values()]
      .sort((a, b) => a.index - b.index)
      .map(({ verseKey, word, hints }) => ({ verseKey, word, hints })),
  };
}

/** Ayahs that needed hints, most hints first. Results saved before ayah counts existed are worked out from their review list. */
export function weakAyahs(result: SessionResult): { verseKey: string; hints: number }[] {
  let counts = result.ayahHints;
  if (!counts) {
    counts = {};
    for (const item of result.review) counts[item.verseKey] = (counts[item.verseKey] ?? 0) + item.hints;
  }
  return Object.entries(counts)
    .filter(([, hints]) => hints > 0)
    .map(([verseKey, hints]) => ({ verseKey, hints }))
    .sort((a, b) => b.hints - a.hints || a.verseKey.localeCompare(b.verseKey, undefined, { numeric: true }));
}
