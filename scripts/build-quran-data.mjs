// Downloads the Quran text once and writes public/quran/<surah>.json, so the app
// serves it from its own origin instead of calling api.quran.com on every visit.
// Run: node scripts/build-quran-data.mjs   (the text never changes; commit the output)
import { access, mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://api.qurancdn.com/api/qdc/verses/by_chapter';
const OUT = new URL('../public/quran/', import.meta.url);
await mkdir(OUT, { recursive: true });

async function getJson(url) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (res.ok) return await res.json();
    } catch {}
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  throw new Error(`Failed: ${url}`);
}

for (let surah = 1; surah <= 114; surah++) {
  if (await access(new URL(`${surah}.json`, OUT)).then(() => true, () => false)) continue; // resume after a failed run
  const rows = [];
  let page = 1;
  while (page) {
    const params = new URLSearchParams({ words: 'true', word_fields: 'text_uthmani,text_imlaei', per_page: '50', page: String(page) });
    const data = await getJson(`${BASE}/${surah}?${params}`);
    for (const verse of data.verses) {
      for (const w of verse.words) {
        if (w.char_type_name !== 'word' || !w.audio_url) continue;
        const m = /^wbw\/(\d{3})_(\d{3})_(\d{3})\.mp3$/.exec(w.audio_url);
        if (!m || Number(m[1]) !== surah || Number(m[2]) !== verse.verse_number) throw new Error(`Unexpected audio path ${w.audio_url}`);
        // Last field: the word's audio file number, which can differ from its position.
        rows.push([verse.verse_number, w.position, w.text_uthmani, w.text_imlaei, Number(m[3])]);
      }
    }
    page = data.pagination.next_page;
  }
  await writeFile(new URL(`${surah}.json`, OUT), JSON.stringify(rows));
  console.log(surah, rows.length);
}
