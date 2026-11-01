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
  /** Ayah the user had reached, like "67:13". */
  reached: string;
  wordsCovered: number;
  hints: number;
  seconds: number;
  recognizedPercent: number;
  review: ReviewItem[];
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
  for (const peek of snapshot.peeks) {
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
    review: [...places.values()]
      .sort((a, b) => a.index - b.index)
      .map(({ verseKey, word, hints }) => ({ verseKey, word, hints })),
  };
}
