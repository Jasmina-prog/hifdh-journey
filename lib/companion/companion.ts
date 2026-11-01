// The memorization companion's brain: tracks position, detects "stuck", and
// decides which hint to give. Pure TypeScript. Time is always passed in, and
// the platform's speech and audio adapters call these methods.

import { findAlignments, isSimilar, MAX_EXPECTED_SKIP, tokenize, type Alignment } from './matcher.ts';

export type CompanionWord = {
  verseKey: string;
  ayah: number;
  position: number;
  text: string;
  normalized: string;
  audioUrl: string;
  /** The mushaf marks a pause after this word. */
  hasWaqfMark: boolean;
};

/** 'ayah' asks the platform to play a qari reciting the whole of `verseKey`. */
export type HintKind = 'auto' | 'tap' | 'ayah';
export type HintRequest = { indexes: number[]; kind: HintKind; verseKey: string };
export type Peek = { index: number; verseKey: string; position: number; kind: HintKind; at: number };
export type CompanionEvent =
  | { type: 'move'; at: number; from: number; to: number; matched: number; heard: string[] }
  | { type: 'hint'; at: number; indexes: number[]; kind: HintKind }
  | { type: 'resync'; at: number; to: number };

export type CompanionSnapshot = {
  /** Index of the next expected word. */
  pointer: number;
  /** Furthest next-expected index reached this session. */
  frontier: number;
  startIndex: number;
  hinting: boolean;
  finished: boolean;
  /** Set when hints ran out or the user went ahead: this ayah must be finished first. */
  waitingOnAyah: string | null;
  stuckAfterMs: number;
  heard: string[];
  heardIndexes: number[];
  hintedIndexes: number[];
  peeks: Peek[];
  events: CompanionEvent[];
  jumps: number;
};

const TAIL_WORDS = 16;
const BACK_WINDOW = 40;
const FORWARD_WINDOW = 30;
// Further than this from the pointer counts as a jump and needs stronger evidence.
const NEAR_FORWARD = 8;
const MIN_BACK_JUMP = 3;
const MIN_MATCHES = 2;
const MIN_MATCHES_JUMP = 3;
const MIN_MATCHES_ANYWHERE = 4;
const MIN_ANYWHERE_LEAD = 1;
const DISTANCE_PENALTY = 0.1;

const DEFAULT_STUCK_MS = 3000;
const MIN_STUCK_MS = 3000;
const MAX_STUCK_MS = 6000;
const PACE_MULTIPLIER = 2.5;
const PACE_SAMPLES = 12;
const MIN_PACE_SAMPLES = 3;
const MAX_PACE_GAP_MS = 8000;
// Silence may just be a breath, while wrong words mean the user is really searching.
const SILENT_STUCK_MS = 5000;
// After a waqf sign or an ayah's end, a long silence is normal.
const WAQF_STUCK_MS = 8000;
const NOT_NEEDED_BONUS_MS = 1500;
const MAX_BONUS_MS = 6000;
// Before the first recited word, speech may be the basmala or ta'awwudh, not the surah.
const AFTER_OPENING_STUCK_MS = 5000;
const NOTHING_SAID_STUCK_MS = 10_000;
// The mic needs a moment to come back, and the user a moment to begin.
const AFTER_HINT_STUCK_MS = 5000;
const BASMALA = ['بسم', 'الله', 'الرحمن', 'الرحيم'];

const MAX_WORD_HINTS = 3;

export function createCompanion(words: CompanionWord[], startIndex: number) {
  const expected = words.map((word) => word.normalized);

  let pointer = startIndex;
  let frontier = startIndex;
  let finalWords: string[] = [];
  let interimWords: string[] = [];
  let lastMoveAt = 0;
  let lastForwardAt: number | null = null;
  let hasEngaged = false;
  let hinting = false;
  // How many words past the pointer the next word hint plays.
  let hintOffset = 0;
  // Hints for this pointer position, which decides when to escalate to the qari.
  let hintsGiven = 0;
  let hintsExhausted = false;
  let jumps = 0;
  let heardNoise = false;
  let heardOpening = false;
  let wentAheadOfAyah = false;
  // A hint played at the frontier, so reaching the next ayah takes saying that word.
  let needsHintedWord = false;
  // Leading words of the recognizer's current sentence that were already dealt with.
  let usedInterimWords = 0;
  let interimLength = 0;
  let lastHeard = '';
  let patienceBonus = 0;
  const paceGaps: number[] = [];
  // One word may advance the pointer here: at the very start, nothing precedes
  // it to form a pair, and after a hint, the user is repeating what they heard.
  const singleWordAllowed = new Set<number>([startIndex]);
  const heardIndexes = new Set<number>();
  const hintedIndexes = new Set<number>();
  const peeks: Peek[] = [];
  const events: CompanionEvent[] = [];

  const finished = () => pointer >= words.length;
  const tail = () => [...finalWords, ...interimWords].slice(-TAIL_WORDS);

  function atPausePoint(): boolean {
    if (pointer === 0 || finished()) return false;
    const previous = words[pointer - 1];
    if (expected.slice(pointer - BASMALA.length, pointer).join(' ') === BASMALA.join(' ')) return false;
    return previous.hasWaqfMark || previous.ayah !== words[pointer].ayah;
  }

  function stuckAfterMs(): number {
    if (!hasEngaged) return (heardOpening ? AFTER_OPENING_STUCK_MS : NOTHING_SAID_STUCK_MS) + patienceBonus;

    let paceMs = DEFAULT_STUCK_MS;
    if (paceGaps.length >= MIN_PACE_SAMPLES) {
      const sorted = [...paceGaps].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      paceMs = Math.min(MAX_STUCK_MS, Math.max(MIN_STUCK_MS, median * PACE_MULTIPLIER));
    }

    let ms: number;
    if (hintOffset > 0) {
      // A hint just played, so this silence is no waqf, but they need time to begin.
      ms = heardNoise ? paceMs : Math.max(paceMs, AFTER_HINT_STUCK_MS);
    } else if (atPausePoint()) {
      ms = heardNoise ? Math.max(paceMs, SILENT_STUCK_MS) : WAQF_STUCK_MS;
    } else {
      ms = heardNoise ? paceMs : Math.max(paceMs, SILENT_STUCK_MS);
    }
    return ms + patienceBonus;
  }

  /**
   * The next ayah only opens once this one is finished. The furthest ayah reached is
   * the limit, so earlier ones can be repeated freely. Finishing means the words ran
   * unbroken from the frontier, allowing for what recognizers normally drop. After a
   * hint there's no such allowance: the user was stuck, so they must say the word.
   */
  function passesAyahGate(matched: number[]): boolean {
    if (frontier >= words.length) return true;
    let nextAyahStart = frontier;
    while (nextAyahStart < words.length && words[nextAyahStart].verseKey === words[frontier].verseKey) nextAyahStart++;
    if (matched[matched.length - 1] + 1 < nextAyahStart) return true;
    return needsHintedWord ? matched.includes(frontier) : matched[0] <= frontier + MAX_EXPECTED_SKIP;
  }

  /** Words heard so far have served their purpose and must never match anything later. */
  function discardHeard() {
    finalWords = [];
    interimWords = [];
    usedInterimWords = interimLength;
    lastHeard = '';
  }

  function movePointer(to: number, matched: number[], now: number) {
    const from = pointer;
    pointer = to;
    lastMoveAt = now;
    hintOffset = 0;
    hintsGiven = 0;
    hintsExhausted = false;
    hasEngaged = true;
    heardNoise = false;
    wentAheadOfAyah = false;
    if (to > from) {
      if (lastForwardAt !== null) {
        const gap = (now - lastForwardAt) / (to - from);
        if (gap < MAX_PACE_GAP_MS) {
          paceGaps.push(gap);
          if (paceGaps.length > PACE_SAMPLES) paceGaps.shift();
        }
      }
      lastForwardAt = now;
    } else {
      lastForwardAt = null;
    }
    if (to > from + NEAR_FORWARD || to < from) jumps++;
    if (to > frontier) needsHintedWord = false;
    frontier = Math.max(frontier, pointer);
    matched.forEach((index) => heardIndexes.add(index));
    events.push({ type: 'move', at: now, from, to, matched: matched.length, heard: tail() });
    // Words recited ahead while this ayah was unfinished must not count for the next one.
    if (to > from && !finished() && words[to].verseKey !== words[from].verseKey) {
      discardHeard();
      // Nothing is left to pair the ayah's first word with.
      singleWordAllowed.add(to);
    }
  }

  function chooseAlignment(heard: string[]): Alignment | null {
    let wentAhead = false;
    const near = findAlignments(
      heard,
      expected,
      Math.max(0, pointer - BACK_WINDOW),
      Math.min(words.length, pointer + FORWARD_WINDOW),
    ).filter(({ matched }) => {
      const distance = matched[matched.length - 1] + 1 - pointer;
      if (distance === 0 || (distance > 0 && distance <= NEAR_FORWARD)) return matched.length >= MIN_MATCHES;
      // A small step back is usually the recognizer revising its guess, not a run-up.
      if (distance < 0 && distance > -MIN_BACK_JUMP) return false;
      return matched.length >= MIN_MATCHES_JUMP;
    }).filter(({ matched }) => {
      const allowed = passesAyahGate(matched);
      // Two common words can appear ahead by chance, but three in a row means they went on.
      if (!allowed && matched.length >= MIN_MATCHES_JUMP) wentAhead = true;
      return allowed;
    });
    if (wentAhead && near.length === 0) {
      wentAheadOfAyah = true;
      // These words were recited too early, so finishing this ayah can't bring them back.
      discardHeard();
      return null;
    }
    if (near.length > 0) {
      const rank = ({ matched, score }: Alignment) =>
        score - DISTANCE_PENALTY * Math.abs(matched[matched.length - 1] + 1 - pointer);
      return near.reduce((best, candidate) => (rank(candidate) > rank(best) ? candidate : best));
    }
    // Expected words near the pointer didn't fit. The user may have gone far back.
    // Common phrases repeat across a surah, so only go if one place clearly fits best.
    const [best, runnerUp] = findAlignments(heard, expected, 0, words.length)
      .filter(({ matched }) => matched.length >= MIN_MATCHES_ANYWHERE && passesAyahGate(matched))
      .sort((a, b) => b.score - a.score);
    if (!best) return null;
    return !runnerUp || best.score - runnerUp.score >= MIN_ANYWHERE_LEAD ? best : null;
  }

  function hear(transcript: { final?: string; interim?: string }, now: number) {
    if (hinting || finished()) return;
    const interim = tokenize(transcript.interim ?? '');
    if (transcript.final) {
      // The final text repeats the sentence's interim words, including any already used.
      finalWords = [...finalWords, ...tokenize(transcript.final).slice(usedInterimWords)].slice(-TAIL_WORDS);
      usedInterimWords = 0;
    }
    usedInterimWords = Math.min(usedInterimWords, interim.length);
    interimLength = interim.length;
    interimWords = interim.slice(usedInterimWords);

    const heard = tail();
    if (heard.length === 0) return;
    const isNewSpeech = heard.join(' ') !== lastHeard;
    lastHeard = heard.join(' ');
    if (!hasEngaged && isNewSpeech) {
      heardOpening = true;
      lastMoveAt = now;
    }

    const alignment = chooseAlignment(heard);
    if (alignment) {
      const to = alignment.matched[alignment.matched.length - 1] + 1;
      if (to !== pointer) {
        movePointer(to, alignment.matched, now);
        return;
      }
    }

    if (tail().length === 0) return;
    const newest = heard[heard.length - 1];
    if (singleWordAllowed.has(pointer) && isSimilar(newest, expected[pointer])) {
      singleWordAllowed.delete(pointer);
      movePointer(pointer + 1, [pointer], now);
      return;
    }

    // Words from just behind the pointer, or ones just hinted, mean the user is
    // reciting: usually starting over for momentum. That isn't being stuck.
    const nearby = expected.slice(Math.max(0, pointer - BACK_WINDOW), pointer + hintOffset + 1);
    if (!nearby.some((word) => isSimilar(newest, word))) {
      heardNoise = true;
    } else if (isNewSpeech && hasEngaged) {
      lastMoveAt = now;
      heardNoise = false;
      hintOffset = 0;
      if (hintsExhausted) {
        hintsExhausted = false;
        hintsGiven = 0;
      }
    }
  }

  function requestHint(kind: 'auto' | 'tap', now: number): HintRequest | null {
    if (hintsExhausted) return null;
    const verseKey = words[pointer].verseKey;
    const nextWord = pointer + hintOffset;
    let hint: HintRequest;

    // Hints never reach into the next ayah, because this one has to be finished first.
    if (hintsGiven < MAX_WORD_HINTS && words[nextWord]?.verseKey === verseKey) {
      hint = { indexes: [nextWord], kind, verseKey };
      hintOffset++;
    } else {
      // Single words didn't unlock it, so let a qari recite the ayah being searched for.
      const indexes: number[] = [];
      for (let i = pointer; words[i]?.verseKey === verseKey; i++) indexes.push(i);
      hint = { indexes, kind: 'ayah', verseKey };
      hintsExhausted = true;
    }

    hintsGiven++;
    needsHintedWord = true;
    hinting = true;
    hasEngaged = true;
    hint.indexes.forEach((index) => {
      hintedIndexes.add(index);
      singleWordAllowed.add(index);
    });
    const first = words[hint.indexes[0]];
    peeks.push({ index: hint.indexes[0], verseKey: first.verseKey, position: first.position, kind: hint.kind, at: now });
    events.push({ type: 'hint', at: now, indexes: hint.indexes, kind: hint.kind });
    return hint;
  }

  return {
    start(now: number) {
      lastMoveAt = now;
    },

    hear,

    /** Call regularly. Returns a hint to play when the user is stuck at the frontier. */
    tick(now: number): HintRequest | null {
      if (hinting || finished() || hintsExhausted) return null;
      // Behind the frontier means a run-up to get momentum: stay quiet.
      if (pointer !== frontier) return null;
      if (now - lastMoveAt < stuckAfterMs()) return null;
      return requestHint('auto', now);
    },

    /** The user tapped for the next word. A tap after the hints run out starts them over. */
    tap(now: number): HintRequest | null {
      if (hinting || finished()) return null;
      if (hintsExhausted) {
        hintsExhausted = false;
        hintOffset = 0;
        hintsGiven = 0;
      }
      return requestHint('tap', now);
    },

    /** Call once the hint audio has ended and the mic is about to resume. */
    hintFinished(now: number) {
      hinting = false;
      lastMoveAt = now;
      heardNoise = false;
      // Transcripts from before the hint shouldn't align against what comes after it.
      discardHeard();
      // The mic restarts after a hint, so the next sentence begins fresh.
      usedInterimWords = 0;
      interimLength = 0;
    },

    /** The user says a hint interrupted them, so wait longer for the rest of the session. */
    hintNotNeeded() {
      patienceBonus = Math.min(MAX_BONUS_MS, patienceBonus + NOT_NEEDED_BONUS_MS);
    },

    /** The user said "I'm here", which overrides whatever tracking believed. */
    resync(index: number, now: number) {
      pointer = index;
      frontier = index;
      lastMoveAt = now;
      lastForwardAt = null;
      hintOffset = 0;
      hintsGiven = 0;
      hintsExhausted = false;
      hasEngaged = true;
      heardNoise = false;
      wentAheadOfAyah = false;
      needsHintedWord = false;
      discardHeard();
      usedInterimWords = 0;
      interimLength = 0;
      singleWordAllowed.add(index);
      events.push({ type: 'resync', at: now, to: index });
    },

    snapshot(): CompanionSnapshot {
      return {
        pointer,
        frontier,
        startIndex,
        hinting,
        finished: finished(),
        waitingOnAyah: !finished() && (hintsExhausted || wentAheadOfAyah) ? words[pointer].verseKey : null,
        stuckAfterMs: stuckAfterMs(),
        heard: tail(),
        heardIndexes: [...heardIndexes],
        hintedIndexes: [...hintedIndexes],
        peeks: [...peeks],
        events: [...events],
        jumps,
      };
    },
  };
}

export type Companion = ReturnType<typeof createCompanion>;
