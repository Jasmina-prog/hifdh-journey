'use client';

// Practice for browsers that can't listen (Firefox, unreliable on iOS Safari).
// The user recites aloud and grades themselves: the ayah stays hidden, a word can
// be revealed when they're stuck, and every reveal counts as a hint just like it
// does when the app is listening.

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CompanionWord } from '@/lib/companion/companion';
import { ayahAudioUrl, type ReciterId } from '@/lib/companion/quranWords';
import type { ReviewItem, SessionResult } from '@/lib/companion/sessionResult';
import { createWebAudioMouth, type WebAudioMouth } from '@/lib/companion/webAudio';

export function ManualPractice({ words, surah, startAyah, reciter, onFinish }: {
  words: CompanionWord[];
  surah: number;
  startAyah: number;
  reciter: ReciterId;
  /** Called with the result, or null when nothing was finished. */
  onFinish: (result: SessionResult | null) => void;
}) {
  const { t } = useTranslation();
  const ayahs = [...new Set(words.filter((word) => word.ayah >= startAyah).map((word) => word.ayah))];
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [startedAt] = useState(() => Date.now());
  // Everything below is about ayahs already finished, plus the one in progress.
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [ayahHints, setAyahHints] = useState<Record<string, number>>({});
  const mouthRef = useRef<WebAudioMouth | null>(null);

  useEffect(() => () => mouthRef.current?.stop(), []);

  const ayah = ayahs[position];
  const ayahWords = words.filter((word) => word.ayah === ayah);
  const verseKey = ayahWords[0]?.verseKey ?? '';

  // Created inside a tap, so the browser lets it play.
  function mouth(): WebAudioMouth {
    if (!mouthRef.current) {
      mouthRef.current = createWebAudioMouth();
      mouthRef.current.unlock();
    }
    return mouthRef.current;
  }

  function recordHint(item: ReviewItem) {
    setAyahHints((hints) => ({ ...hints, [item.verseKey]: (hints[item.verseKey] ?? 0) + 1 }));
    setReview((items) => {
      const existing = items.find((entry) => entry.verseKey === item.verseKey && entry.word === item.word);
      if (existing) return items.map((entry) => (entry === existing ? { ...entry, hints: entry.hints + 1 } : entry));
      return [...items, item];
    });
  }

  function showNextWord() {
    const word = ayahWords[revealed];
    if (!word) return;
    setRevealed(revealed + 1);
    recordHint({ verseKey, word: word.text, hints: 1 });
    void mouth().playWords([word.audioUrl]);
  }

  function hearAyah() {
    setRevealed(ayahWords.length);
    recordHint({ verseKey, hints: 1 });
    void mouth().playAyah(ayahAudioUrl(reciter, verseKey));
  }

  function finish(completedAyahs: number) {
    mouthRef.current?.stop();
    if (completedAyahs === 0) {
      onFinish(null);
      return;
    }
    const done = ayahs.slice(0, completedAyahs);
    const doneKeys = new Set(done.map((number) => `${surah}:${number}`));
    // A hint on the ayah being left unfinished doesn't belong in the result.
    const kept = review.filter((item) => doneKeys.has(item.verseKey));
    const keptHints = Object.fromEntries(Object.entries(ayahHints).filter(([key]) => doneKeys.has(key)));
    const savedAt = Date.now();
    onFinish({
      surah,
      startAyah,
      mode: 'manual',
      reached: `${surah}:${done[done.length - 1]}`,
      wordsCovered: words.filter((word) => done.includes(word.ayah)).length,
      hints: Object.values(keptHints).reduce((sum, n) => sum + n, 0),
      seconds: Math.round((savedAt - startedAt) / 1000),
      recognizedPercent: 0,
      ayahHints: keptHints,
      review: kept,
      savedAt,
    });
  }

  function recited() {
    if (position + 1 >= ayahs.length) {
      finish(ayahs.length);
      return;
    }
    mouthRef.current?.stop();
    setPosition(position + 1);
    setRevealed(0);
  }

  const hintsHere = ayahHints[verseKey] ?? 0;
  const allRevealed = revealed >= ayahWords.length;

  return (
    <section data-testid="manual-practice" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">{t('companionManualProgress', { ayah, done: position, total: ayahs.length })}</span>
        <span className="text-slate-500 dark:text-slate-400">{t('companionHints')}: {hintsHere}</span>
      </div>

      <div dir="rtl" data-testid="manual-ayah" className="font-arabic text-2xl leading-[2.4] sm:text-3xl lg:text-4xl lg:leading-[2.2]">
        {ayahWords.map((word, index) => (
          <span
            key={word.position}
            className={`inline-block ${index < revealed ? 'rounded bg-amber-200 px-1 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200' : 'select-none blur-sm'}`}
          >
            {word.text}{' '}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={showNextWord}
          disabled={allRevealed}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {t('companionManualShowNext')}
        </button>
        <button
          type="button"
          onClick={hearAyah}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {t('companionManualHearAyah')}
        </button>
        <button
          type="button"
          onClick={recited}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          {t('companionManualRecited')}
        </button>
        <button
          type="button"
          onClick={() => finish(position)}
          className="ml-auto rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {t('companionManualFinish')}
        </button>
      </div>
    </section>
  );
}
