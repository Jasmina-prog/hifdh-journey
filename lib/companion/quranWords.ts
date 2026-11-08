import type { CompanionWord } from './companion.ts';
import { hasWaqfMark, normalizeArabic } from './matcher.ts';

const AUDIO_BASE = 'https://audio.qurancdn.com/';

export const RECITERS = [
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', baseUrl: 'https://mirrors.quranicaudio.com/everyayah/Husary_64kbps/' },
  { id: 'alafasy', name: 'Mishari Rashid Alafasy', baseUrl: 'https://verses.quran.com/Alafasy/mp3/' },
] as const;
export type ReciterId = (typeof RECITERS)[number]['id'];

export function ayahAudioUrl(reciterId: ReciterId, verseKey: string): string {
  const reciter = RECITERS.find(({ id }) => id === reciterId) ?? RECITERS[0];
  const [surah, ayah] = verseKey.split(':');
  return `${reciter.baseUrl}${surah.padStart(3, '0')}${ayah.padStart(3, '0')}.mp3`;
}

// Rows written by scripts/build-quran-data.mjs: [ayah, position, uthmani, imlaei, audio file number].
type Row = [number, number, string, string, number];

const LOAD_TIMEOUT_MS = 15000;

function wordAudioUrl(surah: number, ayah: number, file: number): string {
  const pad = (n: number) => String(n).padStart(3, '0');
  return `${AUDIO_BASE}wbw/${pad(surah)}_${pad(ayah)}_${pad(file)}.mp3`;
}

/** The text is served from this app's own files, so it loads fast, caches for good and works offline. */
export async function fetchSurahWords(surah: number): Promise<CompanionWord[]> {
  const response = await fetch(`/quran/${surah}.json`, { signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Quran text returned ${response.status}`);
  const rows = (await response.json()) as Row[];
  return rows.map(([ayah, position, text, imlaei, file]) => ({
    verseKey: `${surah}:${ayah}`,
    ayah,
    position,
    text,
    // Imlaei spelling is closer than Uthmani script to what recognizers write.
    normalized: normalizeArabic(imlaei),
    audioUrl: wordAudioUrl(surah, ayah, file),
    hasWaqfMark: hasWaqfMark(text),
  }));
}
