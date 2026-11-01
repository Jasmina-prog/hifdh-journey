'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthProvider';
import { PickerSelect, type PickerOption } from '@/components/PickerSelect';
import { SURAH_NAMES } from '@/lib/surahNames';
import {
  createCompanion,
  type Companion,
  type CompanionSnapshot,
  type CompanionWord,
  type HintRequest,
} from '@/lib/companion/companion';
import { ayahAudioUrl, fetchSurahWords, RECITERS, type ReciterId } from '@/lib/companion/quranWords';
import { coveragePercent, summarizeSession, type SessionResult } from '@/lib/companion/sessionResult';
import { createWebAudioMouth, type WebAudioMouth } from '@/lib/companion/webAudio';
import { loadResults, saveResult, type SavedResults } from '@/lib/companion/webResultStore';
import { createWebSpeechEars, isSpeechRecognitionSupported, type WebSpeechEars } from '@/lib/companion/webSpeech';

type Phase = 'setup' | 'loading' | 'running' | 'stopped';
type SessionInfo = { surah: number; startAyah: number; reciter: ReciterId };
type Diagnostics = { restarts: number; errors: string[]; wrongHints: number; hintDelaysMs: number[]; startedAt: number; endedAt: number | null };

const TICK_MS = 200;
const RESUME_AFTER_HINT_MS = 300;
const PRELOAD_WORDS = 8;
const AYAHS_BEHIND = 2;
const AYAHS_AHEAD = 4;
const PREVIEW_AYAHS = 6;
const USABLE_COVERAGE = 50;

// Crystal glass: the background pattern shows through, with a bright rim and a diagonal
// sheen. Children sit above the sheen so it never washes out the text.
const GLASS_CARD = [
  'relative overflow-hidden rounded-xl border border-white/80 *:relative',
  'bg-linear-to-br from-white/50 via-white/15 to-white/5 backdrop-blur-[2px] backdrop-saturate-150',
  'shadow-[0_8px_28px_rgba(120,100,60,0.12),inset_0_1px_0_rgba(255,255,255,0.95),inset_1px_0_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(255,255,255,0.3)]',
  'before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(125deg,rgba(255,255,255,0.6)_0%,transparent_32%,rgba(255,255,255,0.22)_52%,transparent_68%)]',
  'dark:border-white/15 dark:from-white/10 dark:via-white/5 dark:to-transparent dark:shadow-[0_8px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] dark:before:opacity-25',
].join(' ');

const now = () => Date.now();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SURAH_OPTIONS: PickerOption[] = SURAH_NAMES.map((name, i) => ({ value: String(i + 1), label: name, badge: String(i + 1) }));
const RECITER_OPTIONS: PickerOption[] = RECITERS.map(({ id, name }) => ({ value: id, label: name }));

const wordsCache = new Map<number, Promise<CompanionWord[]>>();

function loadWords(surah: number): Promise<CompanionWord[]> {
  let words = wordsCache.get(surah);
  if (!words) {
    words = fetchSurahWords(surah).catch((cause) => {
      wordsCache.delete(surah);
      throw cause;
    });
    wordsCache.set(surah, words);
  }
  return words;
}

function buildReport({ surah, startAyah, reciter }: SessionInfo, snapshot: CompanionSnapshot, words: CompanionWord[], diagnostics: Diagnostics) {
  const hintEvents = snapshot.events.filter((event) => event.type === 'hint');
  return {
    surah: `${surah} ${SURAH_NAMES[surah - 1]}`,
    startAyah,
    reciter,
    reachedVerse: words[Math.min(snapshot.frontier, words.length - 1)]?.verseKey,
    browser: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    durationSeconds: Math.round(((diagnostics.endedAt ?? now()) - diagnostics.startedAt) / 1000),
    wordsPassed: snapshot.frontier - snapshot.startIndex,
    wordsRecognizedPercent: coveragePercent(snapshot),
    hints: hintEvents.length,
    hintsMarkedWrong: diagnostics.wrongHints,
    hintDelaysMs: diagnostics.hintDelaysMs,
    jumps: snapshot.jumps,
    recognizerRestarts: diagnostics.restarts,
    errors: diagnostics.errors,
    peeks: snapshot.peeks.map(({ verseKey, position, kind }) => ({ verseKey, position, kind })),
    events: snapshot.events.map((event) => ({ ...event, at: event.at - diagnostics.startedAt })),
  };
}

/**
 * Reports which surah the page's link asks for: ?surah=N, or Al-Fatihah with the plain link.
 * It renders nothing and sits in its own boundary, so the page itself hydrates as normal.
 */
function LinkedSurah({ onChange }: { onChange: (surah: number) => void }) {
  const requested = Number(useSearchParams().get('surah'));
  const surah = requested >= 1 && requested <= SURAH_NAMES.length ? requested : 1;
  useEffect(() => {
    onChange(surah);
    // Only a change of link matters, not the page re-rendering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah]);
  return null;
}

export default function CompanionTestPage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [phase, setPhase] = useState<Phase>('setup');
  const [surah, setSurah] = useState(1);
  // Null until the user picks one: until then a surah resumes from its saved starting ayah.
  const [chosenStartAyah, setChosenStartAyah] = useState<number | null>(null);
  const [savedResults, setSavedResults] = useState<SavedResults>({});
  const [reciter, setReciter] = useState<ReciterId>(RECITERS[0].id);
  const [supported, setSupported] = useState(true);
  const [loaded, setLoaded] = useState<{ surah: number; words: CompanionWord[] } | null>(null);
  const [failedSurah, setFailedSurah] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [snapshot, setSnapshot] = useState<CompanionSnapshot | null>(null);
  const [liveText, setLiveText] = useState('');
  const [listening, setListening] = useState(false);
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({
    restarts: 0, errors: [], wrongHints: 0, hintDelaysMs: [], startedAt: 0, endedAt: null,
  });

  const savedResult: SessionResult | undefined = savedResults[surah];
  const startAyah = chosenStartAyah ?? savedResult?.startAyah ?? 1;

  // Read during render so a newly chosen surah never shows the previous surah's words.
  const words = useMemo(() => (loaded?.surah === surah ? loaded.words : []), [loaded, surah]);

  const companionRef = useRef<Companion | null>(null);
  const allWordsRef = useRef<CompanionWord[]>([]);
  // Current values for stop(), which the running session's timer holds from when it began.
  const runningSessionRef = useRef<{ surah: number; startAyah: number; startedAt: number } | null>(null);
  const userIdRef = useRef<string | null>(null);
  const earsRef = useRef<WebSpeechEars | null>(null);
  const mouthRef = useRef<WebAudioMouth | null>(null);
  const wakeLockRef = useRef<{ release(): Promise<void> } | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Bumped by every start and stop, so a hint still playing from an old session can't touch the new one.
  const sessionRef = useRef(0);

  function sync() {
    if (companionRef.current) setSnapshot(companionRef.current.snapshot());
  }

  function shutDown() {
    sessionRef.current++;
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = null;
    earsRef.current?.stop();
    mouthRef.current?.stop();
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }

  function saveFinishedSession() {
    const running = runningSessionRef.current;
    const companion = companionRef.current;
    if (!running || !companion) return;
    runningSessionRef.current = null;
    const finished = companion.snapshot();
    // A session stopped before reciting anything shouldn't replace a real result.
    if (finished.frontier === finished.startIndex) return;
    const savedAt = now();
    const result = summarizeSession(finished, allWordsRef.current, {
      surah: running.surah,
      startAyah: running.startAyah,
      seconds: Math.round((savedAt - running.startedAt) / 1000),
      savedAt,
    });
    setSavedResults(saveResult(userIdRef.current, result));
  }

  useEffect(() => {
    // Support depends on the browser, which the server can't know while rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(isSpeechRecognitionSupported());
    return () => {
      // Leaving the page mid-recitation still keeps what was recited.
      saveFinishedSession();
      shutDown();
    };
  }, []);

  // The plain link opens Al-Fatihah even when this page is already open on another surah.
  function openLinkedSurah(linked: number) {
    shutDown();
    saveFinishedSession();
    clearFinishedSession();
    setFailedSurah(null);
    setSurah(linked);
    setChosenStartAyah(null);
  }

  useEffect(() => {
    userIdRef.current = userId;
    if (authLoading) return;
    // Saved results live in browser storage, which the server can't read while rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedResults(loadResults(userId));
  }, [userId, authLoading]);

  useEffect(() => {
    let ignore = false;
    loadWords(surah).then(
      (surahWords) => {
        if (!ignore) setLoaded({ surah, words: surahWords });
      },
      () => {
        if (!ignore) setFailedSurah(surah);
      },
    );
    return () => {
      ignore = true;
    };
  }, [surah, reloadKey]);

  // A different selection means a new session, so the finished one's results go away.
  function clearFinishedSession() {
    companionRef.current = null;
    setSnapshot(null);
    setSessionInfo(null);
    setPhase('setup');
    setLiveText('');
    setError('');
    setShowText(false);
    setCopyState('idle');
  }

  function chooseSurah(value: string) {
    clearFinishedSession();
    setFailedSurah(null);
    setSurah(Number(value));
    setChosenStartAyah(null);
  }

  function chooseStartAyah(ayah: number) {
    clearFinishedSession();
    setChosenStartAyah(ayah);
  }

  function retryLoading() {
    setFailedSurah(null);
    setReloadKey((key) => key + 1);
  }

  async function playHint(hint: HintRequest, allWords: CompanionWord[]) {
    const session = sessionRef.current;
    earsRef.current?.stop();
    sync();
    const mouth = mouthRef.current;
    const ayahUrl = ayahAudioUrl(reciter, hint.verseKey);
    let delay: number | undefined;
    if (hint.kind === 'ayah') {
      delay = await mouth?.playAyah(ayahUrl);
    } else {
      // Word hints may escalate to the qari, so have the ayah ready by then.
      mouth?.preloadAyah(ayahUrl);
      delay = await mouth?.playWords(hint.indexes.map((index) => allWords[index].audioUrl));
    }
    await wait(RESUME_AFTER_HINT_MS);
    if (session !== sessionRef.current) return;
    if (delay !== undefined) setDiagnostics((d) => ({ ...d, hintDelaysMs: [...d.hintDelaysMs, Math.round(delay)] }));
    companionRef.current?.hintFinished(now());
    earsRef.current?.start();
    sync();
  }

  function preloadAhead(allWords: CompanionWord[], pointer: number) {
    mouthRef.current?.preloadWords(allWords.slice(pointer, pointer + PRELOAD_WORDS).map((word) => word.audioUrl));
  }

  async function start() {
    shutDown();
    const session = sessionRef.current;
    setPhase('loading');
    setError('');
    setCopyState('idle');
    setLiveText('');
    setSnapshot(null);
    setShowText(false);
    setSessionInfo({ surah, startAyah, reciter });
    runningSessionRef.current = { surah, startAyah, startedAt: now() };
    companionRef.current = null;
    setDiagnostics({ restarts: 0, errors: [], wrongHints: 0, hintDelaysMs: [], startedAt: now(), endedAt: null });

    // Audio and the mic both need to start inside the tap, before any await.
    const mouth = mouthRef.current ?? createWebAudioMouth();
    mouthRef.current = mouth;
    mouth.unlock();

    const ears = createWebSpeechEars({
      onTranscript: ({ final, interim }) => {
        setLiveText(interim || final || '');
        const companion = companionRef.current;
        if (!companion) return;
        const before = companion.snapshot().pointer;
        companion.hear({ final, interim }, now());
        const after = companion.snapshot();
        setSnapshot(after);
        if (after.pointer !== before) preloadAhead(allWordsRef.current, after.pointer);
      },
      onListeningChange: setListening,
      onRestart: () => setDiagnostics((d) => ({ ...d, restarts: d.restarts + 1 })),
      onError: (code, fatal) => {
        setDiagnostics((d) => ({ ...d, errors: [...d.errors, code] }));
        if (fatal) {
          setError(t('companionMicError', { code }));
          stop();
        }
      },
    });
    earsRef.current = ears;
    ears.start();

    try {
      const allWords = await loadWords(surah);
      if (session !== sessionRef.current) return;
      const startIndex = allWords.findIndex((word) => word.ayah === startAyah);
      if (startIndex === -1) throw new Error(`${SURAH_NAMES[surah - 1]} has no ayah ${startAyah}`);

      allWordsRef.current = allWords;
      setLoaded({ surah, words: allWords });
      const companion = createCompanion(allWords, startIndex);
      companion.start(now());
      companionRef.current = companion;
      preloadAhead(allWords, startIndex);
      sync();
      setPhase('running');

      const wakeLock = (navigator as unknown as { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock;
      wakeLock?.request('screen').then((lock) => {
        if (session === sessionRef.current) wakeLockRef.current = lock;
        else lock.release().catch(() => {});
      }).catch(() => {});

      tickerRef.current = setInterval(() => {
        const current = companionRef.current;
        if (!current) return;
        const hint = current.tick(now());
        if (hint) {
          playHint(hint, allWords);
        } else if (current.snapshot().finished) {
          stop();
        }
      }, TICK_MS);
    } catch (cause) {
      if (session !== sessionRef.current) return;
      shutDown();
      console.error('Could not start the session:', cause);
      setError(t('companionLoadError'));
      setPhase('setup');
    }
  }

  function stop() {
    shutDown();
    saveFinishedSession();
    sync();
    setListening(false);
    setDiagnostics((d) => ({ ...d, endedAt: now() }));
    setPhase('stopped');
  }

  function tapForWord() {
    const hint = companionRef.current?.tap(now());
    if (hint) playHint(hint, words);
  }

  function resyncToAyah(ayah: number) {
    const index = words.findIndex((word) => word.ayah === ayah);
    const companion = companionRef.current;
    if (index === -1 || !companion || snapshot?.hinting) return;
    // Restart so an interim guess from the old position can't undo the resync.
    earsRef.current?.stop();
    companion.resync(index, now());
    earsRef.current?.start();
    setLiveText('');
    sync();
    preloadAhead(words, index);
  }

  function markHintNotNeeded() {
    companionRef.current?.hintNotNeeded();
    sync();
    setDiagnostics((d) => ({ ...d, wrongHints: d.wrongHints + 1 }));
  }

  async function copyReport() {
    if (!sessionInfo || !snapshot) return;
    try {
      const report = buildReport(sessionInfo, snapshot, words, diagnostics);
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  const coverage = snapshot ? coveragePercent(snapshot) : 0;
  const passed = snapshot ? snapshot.frontier - snapshot.startIndex : 0;
  const hintCount = snapshot ? snapshot.events.filter((event) => event.type === 'hint').length : 0;
  const pointerWord = snapshot ? words[Math.min(snapshot.pointer, words.length - 1)] : undefined;
  const ayahCount = words.length > 0 ? words[words.length - 1].ayah : 0;
  const ayahOptions = useMemo<PickerOption[]>(
    () => Array.from({ length: ayahCount || startAyah }, (_, i) => ({ value: String(i + 1), label: t('companionAyah', { number: i + 1 }) })),
    [ayahCount, startAyah, t],
  );
  const heardSet = useMemo(() => new Set(snapshot?.heardIndexes), [snapshot]);
  const hintedSet = useMemo(() => new Set(snapshot?.hintedIndexes), [snapshot]);

  const visibleAyahs = useMemo(() => {
    const firstAyah = pointerWord ? pointerWord.ayah - AYAHS_BEHIND : startAyah;
    const lastAyah = pointerWord ? pointerWord.ayah + AYAHS_AHEAD : startAyah + PREVIEW_AYAHS - 1;
    const ayahs = new Map<number, { word: CompanionWord; index: number }[]>();
    words.forEach((word, index) => {
      if (word.ayah < firstAyah || word.ayah > lastAyah) return;
      ayahs.set(word.ayah, [...(ayahs.get(word.ayah) ?? []), { word, index }]);
    });
    return [...ayahs.entries()];
  }, [words, pointerWord, startAyah]);

  // Text stays hidden until the session ends, unless the user chooses to show it.
  const hideText = phase !== 'stopped' && !showText;

  function wordClass(index: number): string {
    if (!snapshot) return hideText ? 'select-none blur-sm' : '';
    if (hintedSet.has(index) && index >= snapshot.pointer) return 'rounded bg-amber-200 px-1 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200';
    if (index === snapshot.pointer) return `rounded border-b-2 border-emerald-500 ${hideText ? 'blur-sm' : ''}`;
    if (index < snapshot.pointer) return heardSet.has(index) ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500';
    // Hidden words keep their normal colour, so they look just like the preview did.
    return hideText ? 'select-none blur-sm' : 'text-slate-500 dark:text-slate-400';
  }

  const hasSession = (phase === 'running' || phase === 'stopped') && snapshot !== null;
  const canStartAgain = hasSession || savedResult?.startAyah === startAyah;
  const selectionLocked = phase === 'loading' || phase === 'running';

  const ayahText = (
    <div dir="rtl" data-testid="ayah-text" className="font-arabic text-2xl leading-[2.4] sm:text-3xl lg:text-4xl lg:leading-[2.2]">
      {visibleAyahs.map(([ayah, ayahWords]) => (
        <span key={ayah}>
          {ayahWords.map(({ word, index }) => (
            <span key={index} data-word-index={index} className={`mx-0.5 inline-block transition-colors ${wordClass(index)}`}>
              {word.text}
            </span>
          ))}
          {phase === 'stopped' && hasSession ? (
            <span className="mx-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 align-middle font-sans text-xs text-slate-400 dark:border-slate-800">
              {ayah}
            </span>
          ) : (
            <button
              type="button"
              aria-label={t(phase === 'running' ? 'companionImAtAyah' : 'companionStartFromAyah', { number: ayah })}
              disabled={phase === 'loading'}
              onClick={(event) => {
                event.stopPropagation();
                if (phase === 'running') resyncToAyah(ayah);
                else chooseStartAyah(ayah);
              }}
              className={`mx-1 inline-flex h-8 w-8 items-center justify-center rounded-full border align-middle font-sans text-xs transition ${
                phase !== 'running' && ayah === startAyah
                  ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {ayah}
            </button>
          )}
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative mx-auto w-full max-w-400 px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={null}>
        <LinkedSurah onChange={openLinkedSurah} />
      </Suspense>
      <h1 className="text-2xl font-bold">{t('companionTitle')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('companionIntro')}</p>

      {!supported && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {t('companionUnsupported')}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}

      <form
        className="mt-6 grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto]"
        onSubmit={(event) => { event.preventDefault(); start(); }}
      >
        <PickerSelect
          label={t('companionSurah')}
          value={String(surah)}
          options={SURAH_OPTIONS}
          onChange={chooseSurah}
          disabled={selectionLocked}
          searchPlaceholder={t('companionSearchSurah')}
          emptyText={t('companionNoSurah')}
        />
        <PickerSelect
          label={t('companionStartAyah')}
          value={String(startAyah)}
          options={ayahOptions}
          onChange={(value) => chooseStartAyah(Number(value))}
          disabled={selectionLocked || ayahCount === 0}
          searchPlaceholder={t('companionAyahNumber')}
          emptyText={t('companionNoAyah')}
        />
        <PickerSelect
          label={t('companionQari')}
          value={reciter}
          options={RECITER_OPTIONS}
          onChange={(value) => setReciter(value as ReciterId)}
          disabled={selectionLocked}
        />
        {phase === 'running' ? (
          <button
            key="stop"
            type="button"
            onClick={stop}
            className="h-11 rounded-xl bg-slate-800 px-6 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white sm:col-span-2 lg:col-span-1"
          >
            {t('companionStop')}
          </button>
        ) : (
          <button
            key="start"
            type="submit"
            disabled={!supported || phase === 'loading'}
            className="h-11 rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 sm:col-span-2 lg:col-span-1"
          >
            {phase === 'loading' ? t('companionLoading') : canStartAgain ? t('companionStartAgain') : t('companionStart')}
          </button>
        )}
      </form>

      {!hasSession && (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lg font-semibold">{surah}. {SURAH_NAMES[surah - 1]}</h2>
            {ayahCount > 0 && (
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('companionPreviewNote', { total: ayahCount })}</p>
                <button type="button" onClick={() => setShowText((v) => !v)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
                  {showText ? t('companionHideText') : t('companionShowText')}
                </button>
              </div>
            )}
          </div>
          {failedSurah === surah ? (
            <div role="alert" className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <p>{t('companionLoadError')}</p>
              <button type="button" onClick={retryLoading} className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                {t('companionTryAgain')}
              </button>
            </div>
          ) : words.length === 0 ? (
            <p aria-live="polite" className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('companionLoadingSurah', { name: SURAH_NAMES[surah - 1] })}</p>
          ) : ayahText}
        </section>
      )}

      {!hasSession && savedResult && <SessionResultCard result={savedResult} title={t('companionLastResult')} />}

      {hasSession && snapshot && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
              {phase === 'running' && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="mr-auto flex items-center gap-2 text-sm font-medium" aria-live="polite">
                    <span className={`h-2.5 w-2.5 rounded-full ${snapshot.hinting ? 'bg-amber-400' : listening ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
                    {t(snapshot.hinting ? 'companionPlayingHint' : listening ? 'companionListening' : 'companionMicOff')}
                  </span>
                  <button type="button" onClick={() => setShowText((v) => !v)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
                    {showText ? t('companionHideText') : t('companionShowText')}
                  </button>
                  <button
                    type="button"
                    disabled={hintCount === 0}
                    onClick={markHintNotNeeded}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-700"
                  >
                    {t('companionHintNotNeeded')}
                  </button>
                </div>
              )}

              <div
                onClick={phase === 'running' ? tapForWord : undefined}
                className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 ${phase === 'running' ? 'cursor-pointer' : ''}`}
              >
                {phase === 'running' && (
                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('companionTapHint')}</p>
                )}
                {phase === 'running' && snapshot.waitingOnAyah && !snapshot.hinting && (
                  <p data-testid="finish-ayah" role="status" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                    {t('companionFinishAyah', { verseKey: snapshot.waitingOnAyah })}
                  </p>
                )}
                {ayahText}
              </div>
              {phase === 'stopped' && savedResult && (
                snapshot.frontier > snapshot.startIndex ? (
                  <SessionResultCard
                    result={savedResult}
                    title={t('companionResult')}
                    copyState={copyState}
                    onCopy={copyReport}
                  />
                ) : (
                  // Nothing was recited this time, so what's saved is still the earlier session.
                  <SessionResultCard result={savedResult} title={t('companionLastResult')} />
                )
              )}
          </div>
          <div className="min-w-0">
              <dl className="grid grid-cols-2 gap-3">
                <Stat label={t('companionPosition')} value={pointerWord ? `${pointerWord.verseKey} · ${pointerWord.position}` : '—'} />
                <Stat label={t('companionWordsRecognized')} value={passed ? `${coverage}%` : '—'} />
                <Stat label={t('companionHints')} value={`${hintCount}${diagnostics.wrongHints ? ` (${t('companionHintsNotNeeded', { n: diagnostics.wrongHints })})` : ''}`} />
                <Stat label={t('companionHintAfter')} value={t('companionSeconds', { value: (snapshot.stuckAfterMs / 1000).toFixed(1) })} />
              </dl>
              <section className={`mt-3 p-4 text-sm ${GLASS_CARD}`}>
                <h2 className="font-semibold">{t('companionHeardTitle')}</h2>
                <p dir="rtl" data-testid="live-text" className="mt-2 min-h-7 font-arabic text-lg">{liveText || snapshot.heard.join(' ')}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {t('companionRestarts', { n: diagnostics.restarts })}
                  {diagnostics.hintDelaysMs.length > 0 && ` · ${t('companionHintDelay', { ms: diagnostics.hintDelaysMs[diagnostics.hintDelaysMs.length - 1] })}`}
                  {diagnostics.errors.length > 0 && ` · ${t('companionErrors', { list: diagnostics.errors.join(', ') })}`}
                </p>
              </section>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionResultCard({ result, title, copyState = 'idle', onCopy }: {
  result: SessionResult;
  title: string;
  copyState?: 'idle' | 'copied' | 'failed';
  /** Only a session just finished has the details behind the technical report. */
  onCopy?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const time = `${Math.floor(result.seconds / 60)}:${String(result.seconds % 60).padStart(2, '0')}`;
  const savedOn = new Date(result.savedAt).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });

  const recognition = result.wordsCovered < 20
    ? t('companionTooFewWords')
    : result.recognizedPercent >= USABLE_COVERAGE
      ? t('companionRecognitionGood', { percent: result.recognizedPercent })
      : t('companionRecognitionLow', { percent: result.recognizedPercent, needed: USABLE_COVERAGE });

  return (
    <section data-testid="session-result" className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p data-testid="saved-on" className="text-xs text-slate-500 dark:text-slate-400">{t('companionSavedOn', { date: savedOn })}</p>
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          <InlineStat label={t('companionReached')} value={result.reached || '—'} />
          <InlineStat label={t('companionWords')} value={String(result.wordsCovered)} />
          <InlineStat label={t('companionHints')} value={String(result.hints)} />
          <InlineStat label={t('companionTime')} value={time} />
        </dl>
      </div>

      {result.review.length === 0 ? (
        <p className="mt-3 text-slate-600 dark:text-slate-300">{t('companionNoHintsNeeded')}</p>
      ) : (
        <div className="mt-3">
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('companionToReview')}</h3>
          <ul data-testid="review-list" dir="rtl" className="mt-2 flex flex-wrap gap-2">
            {result.review.map((item, index) => (
              <li
                key={index}
                title={item.verseKey}
                className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-0.5 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
              >
                {item.word
                  ? <span className="font-arabic text-2xl leading-normal">{item.word}</span>
                  : <span dir="ltr" className="py-1 text-xs font-medium">{t('companionWholeAyah', { verseKey: item.verseKey })}</span>}
                {item.hints > 1 && <span dir="ltr" className="text-xs font-semibold">{item.hints}×</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p data-testid="verdict" className="mr-auto">{recognition}</p>
        <span aria-live="polite">
          {copyState === 'copied' && t('companionCopied')}
          {copyState === 'failed' && t('companionCopyFailed')}
        </span>
        {onCopy && (
          <button type="button" onClick={onCopy} className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            {t('companionCopyReport')}
          </button>
        )}
      </div>
    </section>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`p-3 ${GLASS_CARD}`}>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}
