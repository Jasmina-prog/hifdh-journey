// Pure word matching. No browser APIs, so the app can reuse it unchanged.

const MARKS = /[ؐ-ؚـً-ٰٟۖ-ۭ]/g;

/** Strip harakat and unify the letter forms speech recognizers spell inconsistently. */
export function normalizeArabic(text: string): string {
  return text
    .replace(MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئیې]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/ک/g, 'ك')
    .replace(/ء/g, '')
    .replace(/[^ء-ي]/g, '');
}

/** Mushaf pause signs, including the small saktah. */
export function hasWaqfMark(text: string): boolean {
  return /[\u06D6-\u06DC]/.test(text);
}

export function tokenize(text: string): string[] {
  return text.split(/\s+/).map(normalizeArabic).filter(Boolean);
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

const similarCache = new Map<string, boolean>();

/** Short words must match exactly: one wrong letter in a 3-letter word is usually another word. */
export function isSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  const allowedEdits = shorter >= 7 ? 2 : shorter >= 4 ? 1 : 0;
  if (allowedEdits === 0 || Math.abs(a.length - b.length) > allowedEdits) return false;

  const key = `${a}|${b}`;
  let similar = similarCache.get(key);
  if (similar === undefined) {
    similar = editDistance(a, b) <= allowedEdits;
    similarCache.set(key, similar);
  }
  return similar;
}

export type Alignment = {
  /** Expected-word indexes the heard words matched, in order. */
  matched: number[];
  score: number;
};

// Recognizers drop and invent words, so a chain may skip a few on either side.
const MAX_HEARD_SKIP = 2;
export const MAX_EXPECTED_SKIP = 3;
const SKIP_PENALTY = 0.25;
// Words after the chain's end that may be noise, like the tail of an interim guess.
const MAX_TRAILING_NOISE = 2;

type Chain = { heard: number; expected: number; score: number; previous: Chain | null };

/**
 * Finds word chains that run through `expected[from..to)` and end at the most
 * recently heard words. Returns the best chain for each possible end position.
 */
export function findAlignments(heard: string[], expected: string[], from: number, to: number): Alignment[] {
  const chainsByHeard: Chain[][] = [];
  const bestByEnd = new Map<number, Chain>();

  for (let i = 0; i < heard.length; i++) {
    const chains: Chain[] = [];
    for (let j = from; j < to; j++) {
      if (!isSimilar(heard[i], expected[j])) continue;
      const chain: Chain = { heard: i, expected: j, score: 1, previous: null };
      for (let p = Math.max(0, i - 1 - MAX_HEARD_SKIP); p < i; p++) {
        for (const candidate of chainsByHeard[p]) {
          const expectedGap = j - candidate.expected - 1;
          if (expectedGap < 0 || expectedGap > MAX_EXPECTED_SKIP) continue;
          const heardGap = i - p - 1;
          const score = candidate.score + 1 - (heardGap + expectedGap) * SKIP_PENALTY;
          if (score > chain.score) {
            chain.score = score;
            chain.previous = candidate;
          }
        }
      }
      chains.push(chain);
      if (i >= heard.length - 1 - MAX_TRAILING_NOISE) {
        const best = bestByEnd.get(j);
        if (!best || chain.score > best.score) bestByEnd.set(j, chain);
      }
    }
    chainsByHeard.push(chains);
  }

  return [...bestByEnd.values()].map((chain) => {
    const matched: number[] = [];
    for (let link: Chain | null = chain; link; link = link.previous) matched.unshift(link.expected);
    return { matched, score: chain.score };
  });
}
