import { langOf } from './dates.ts';

// Ayahs per surah, in order. They add up to 6236.
const AYAH_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const TOTAL_AYAHS = AYAH_COUNTS.reduce((a, b) => a + b, 0);
// Long ayahs don't fit a card, so the day's verse moves on to the next short one.
const MAX_WORDS = 40;

// Rows from public/quran/<surah>.json: [ayah, position, uthmani, imlaei, audio file number].
type Row = [number, number, string, string, number];

/** The same verse for everyone on a given day. 1103 shares no factor with 6236, so no verse repeats before all have appeared. */
function dayVerse(date: Date): { surah: number; ayah: number } {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  let index = (day * 1103) % TOTAL_AYAHS;
  let surah = 1;
  while (index >= AYAH_COUNTS[surah - 1]) {
    index -= AYAH_COUNTS[surah - 1];
    surah++;
  }
  return { surah, ayah: index + 1 };
}

export type DailyVerse = { surah: number; ayah: number; arabic: string };

/** The Arabic comes from this app's own files, so it never waits on an outside service. */
export async function loadDailyVerse(date: Date): Promise<DailyVerse> {
  const { surah, ayah: first } = dayVerse(date);
  const response = await fetch(`/quran/${surah}.json`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Quran text returned ${response.status}`);
  const rows = (await response.json()) as Row[];
  const count = AYAH_COUNTS[surah - 1];

  let chosen = first;
  for (let step = 0; step < count; step++) {
    const candidate = ((first - 1 + step) % count) + 1;
    chosen = candidate;
    if (rows.filter(([ayah]) => ayah === candidate).length <= MAX_WORDS) break;
  }
  const arabic = rows.filter(([ayah]) => ayah === chosen).map(([, , text]) => text).join(' ');
  return { surah, ayah: chosen, arabic };
}

// Quran.com translation ids: Muhammad Sodiq (Uzbek, Latin), Kuliev (Russian), Saheeh International (English).
const TRANSLATION_IDS = { uz: 55, ru: 45, en: 20 } as const;

/** The translation is a bonus. If the service is slow or blocked this returns null and the card shows the Arabic alone. */
export async function fetchTranslation(surah: number, ayah: number, locale: string): Promise<string | null> {
  try {
    const id = TRANSLATION_IDS[langOf(locale)];
    const response = await fetch(`https://api.qurancdn.com/api/qdc/verses/by_key/${surah}:${ayah}?translations=${id}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { verse?: { translations?: { text: string }[] } };
    const text = json.verse?.translations?.[0]?.text;
    if (!text) return null;
    return text
      .replace(/<sup[^>]*>.*?<\/sup>/g, '') // footnote markers
      .replace(/<[^>]+>/g, '')
      .replace(/`/g, "'") // this Uzbek translation writes o' and g' with a backtick
      .trim();
  } catch {
    return null;
  }
}
