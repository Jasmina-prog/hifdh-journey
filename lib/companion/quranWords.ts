import type { CompanionWord } from './companion.ts';
import { hasWaqfMark, normalizeArabic } from './matcher.ts';

const VERSES_URL = 'https://api.quran.com/api/v4/verses/by_chapter';
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

type ApiWord = {
  position: number;
  char_type_name: string;
  audio_url: string | null;
  text_uthmani: string;
  text_imlaei: string;
};
type ApiVerse = { verse_key: string; verse_number: number; words: ApiWord[] };
type ApiResponse = { verses: ApiVerse[]; pagination: { next_page: number | null } };

export async function fetchSurahWords(surah: number): Promise<CompanionWord[]> {
  const words: CompanionWord[] = [];
  let page: number | null = 1;

  while (page !== null) {
    const params = new URLSearchParams({
      words: 'true',
      word_fields: 'text_uthmani,text_imlaei',
      per_page: '50',
      page: String(page),
    });
    const response = await fetch(`${VERSES_URL}/${surah}?${params}`);
    if (!response.ok) throw new Error(`Quran API returned ${response.status}`);
    const data = (await response.json()) as ApiResponse;

    for (const verse of data.verses) {
      for (const word of verse.words) {
        if (word.char_type_name !== 'word' || !word.audio_url) continue;
        words.push({
          verseKey: verse.verse_key,
          ayah: verse.verse_number,
          position: word.position,
          text: word.text_uthmani,
          // Imlaei spelling is closer than Uthmani script to what recognizers write.
          normalized: normalizeArabic(word.text_imlaei),
          audioUrl: AUDIO_BASE + word.audio_url,
          hasWaqfMark: hasWaqfMark(word.text_uthmani),
        });
      }
    }
    page = data.pagination.next_page;
  }
  return words;
}
