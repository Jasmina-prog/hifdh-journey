// Web adapter for the companion's "ears", built on the Web Speech API.

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } };
type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  abort(): void;
};
type RecognitionConstructor = new () => RecognitionInstance;

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export const isSpeechRecognitionSupported = () => getRecognitionConstructor() !== null;

export type EarsCallbacks = {
  onTranscript: (transcript: { final?: string; interim: string }) => void;
  onListeningChange: (listening: boolean) => void;
  onRestart: () => void;
  onError: (error: string, fatal: boolean) => void;
};

const RESTART_DELAY_MS = 250;
const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported']);

export function createWebSpeechEars(callbacks: EarsCallbacks) {
  const Recognition = getRecognitionConstructor();
  if (!Recognition) throw new Error('Speech recognition is not supported in this browser');

  const recognition = new Recognition();
  recognition.lang = 'ar-SA';
  recognition.continuous = true;
  recognition.interimResults = true;

  let wanted = false;
  let sessionFinal = '';
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  function begin() {
    sessionFinal = '';
    try {
      recognition.start();
    } catch {
      // Already running or still shutting down. onend restarts it if needed.
    }
  }

  // Android Chrome repeats earlier text inside each new result, so only the
  // part after what we already have counts as new.
  function withoutRepeat(text: string): string {
    return sessionFinal && text.startsWith(sessionFinal) ? text.slice(sessionFinal.length) : text;
  }

  recognition.onstart = () => callbacks.onListeningChange(true);

  recognition.onresult = (event) => {
    if (!wanted) return;
    let final = '';
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript.trim();
      if (result.isFinal) {
        final += ` ${withoutRepeat(text)}`;
        sessionFinal = text.startsWith(sessionFinal) ? text : `${sessionFinal} ${text}`.trim();
      } else {
        interim += ` ${withoutRepeat(text)}`;
      }
    }
    callbacks.onTranscript({ final: final.trim() || undefined, interim: interim.trim() });
  };

  recognition.onerror = (event) => {
    if (event.error === 'aborted') return;
    const fatal = FATAL_ERRORS.has(event.error);
    if (fatal) wanted = false;
    callbacks.onError(event.error, fatal);
  };

  // Continuous recognition stops by itself after a while, so restart it.
  recognition.onend = () => {
    callbacks.onListeningChange(false);
    if (!wanted) return;
    callbacks.onRestart();
    restartTimer = setTimeout(begin, RESTART_DELAY_MS);
  };

  return {
    start() {
      wanted = true;
      begin();
    },
    /** Stops listening and discards anything in flight, so a hint can't be heard as recitation. */
    stop() {
      wanted = false;
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = null;
      recognition.abort();
    },
  };
}

export type WebSpeechEars = ReturnType<typeof createWebSpeechEars>;
