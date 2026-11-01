// Web adapter for the companion's "mouth": plays audio through one element,
// because browsers can restrict playback that doesn't follow a tap.
// Words are downloaded ahead of time. A cold CDN request can take several
// seconds, and a hint that late is useless.

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
// A stalled download must not leave the mic switched off for good.
const WORD_START_TIMEOUT_MS = 8000;
const AYAH_START_TIMEOUT_MS = 20_000;
const PLAYBACK_GRACE_MS = 5000;
const UNKNOWN_DURATION_MS = 5 * 60 * 1000;
const MAX_CACHED_WORDS = 32;

export function createWebAudioMouth() {
  const audio = new Audio();
  const cache = new Map<string, Promise<string>>();
  let warmedAyah: HTMLAudioElement | null = null;
  let playId = 0;
  let finishCurrent: (() => void) | null = null;

  function load(url: string): Promise<string> {
    let source = cache.get(url);
    if (source) return source;

    source = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Audio returned ${response.status}`);
        return response.blob();
      })
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => {
        // Let the next request retry, and try the file directly this time.
        cache.delete(url);
        return url;
      });
    cache.set(url, source);

    if (cache.size > MAX_CACHED_WORDS) {
      const [oldestUrl, oldest] = cache.entries().next().value as [string, Promise<string>];
      cache.delete(oldestUrl);
      oldest.then((objectUrl) => {
        if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
      });
    }
    return source;
  }

  /** Resolves when the audio has finished, with how long it took to start sounding. */
  function playOne(source: Promise<string>, startTimeoutMs: number): Promise<number> {
    const requestedAt = performance.now();
    let startedAfter = startTimeoutMs;

    return new Promise((resolve) => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        audio.onended = null;
        audio.onerror = null;
        audio.onplaying = null;
        finishCurrent = null;
        resolve(startedAfter);
      };
      let timer = setTimeout(done, startTimeoutMs);
      finishCurrent = done;

      source.then((src) => {
        if (finished) return;
        audio.onplaying = () => {
          startedAfter = performance.now() - requestedAt;
          // It may run for minutes now, so the limit becomes the audio's own length.
          clearTimeout(timer);
          const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : UNKNOWN_DURATION_MS;
          timer = setTimeout(done, durationMs + PLAYBACK_GRACE_MS);
        };
        audio.onended = done;
        audio.onerror = done;
        audio.src = src;
        audio.play().catch(done);
      });
    });
  }

  return {
    /** Call from the tap that starts a session. */
    unlock() {
      audio.src = SILENT_WAV;
      audio.play().catch(() => {});
    },
    preloadWords(urls: string[]) {
      urls.forEach(load);
    },
    /** Starts fetching an ayah into the browser's cache so it starts quickly if it's needed. */
    preloadAyah(url: string) {
      if (warmedAyah?.src === url) return;
      warmedAyah = new Audio();
      warmedAyah.preload = 'auto';
      warmedAyah.src = url;
    },
    /** Plays words in order and resolves with the delay before the first one sounded. */
    async playWords(urls: string[]): Promise<number> {
      const id = ++playId;
      let firstDelay = 0;
      for (const [i, url] of urls.entries()) {
        const delay = await playOne(load(url), WORD_START_TIMEOUT_MS);
        // stop() was called, so the remaining words must not play.
        if (id !== playId) break;
        if (i === 0) firstDelay = delay;
      }
      return firstDelay;
    },
    /** Streams an ayah, since a long one could take too long to download first. */
    playAyah(url: string): Promise<number> {
      playId++;
      return playOne(Promise.resolve(url), AYAH_START_TIMEOUT_MS);
    },
    stop() {
      playId++;
      audio.pause();
      finishCurrent?.();
    },
  };
}

export type WebAudioMouth = ReturnType<typeof createWebAudioMouth>;
