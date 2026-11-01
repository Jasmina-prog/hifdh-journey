import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCompanion, type CompanionWord } from './companion.ts';
import { hasWaqfMark, normalizeArabic, tokenize } from './matcher.ts';
import { summarizeSession } from './sessionResult.ts';

function surah(ayahs: string[]): CompanionWord[] {
  return ayahs.flatMap((ayah, a) =>
    ayah.split(' ').map((text, w) => ({
      verseKey: `1:${a + 1}`,
      ayah: a + 1,
      position: w + 1,
      text,
      normalized: normalizeArabic(text),
      audioUrl: `${a + 1}/${w + 1}.mp3`,
      hasWaqfMark: hasWaqfMark(text),
    })),
  );
}

const IKHLAS = surah([
  'قُلْ هُوَ اللَّهُ أَحَدٌ',
  'اللَّهُ الصَّمَدُ',
  'لَمْ يَلِدْ وَلَمْ يُولَدْ',
  'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ',
]);
const SHARH = surah([
  'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
  'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
  'فَإِذَا فَرَغْتَ فَانْصَبْ',
  'وَإِلَى رَبِّكَ فَارْغَبْ',
]);
const spoken = (words: CompanionWord[], from: number, to: number) =>
  words.slice(from, to).map((word) => word.text).join(' ');

test('normalizes harakat and letter variants to the same form', () => {
  assert.equal(normalizeArabic('أَحَدٌ'), normalizeArabic('احد'));
  assert.equal(normalizeArabic('ٱلصَّلَوٰةَ'), normalizeArabic('الصلوه'));
  assert.equal(normalizeArabic('رَمَى'), normalizeArabic('رمي'));
  assert.deepEqual(tokenize('  قُلْ   هُوَ '), ['قل', 'هو']);
});

test('pointer follows recitation word by word, including interim results', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ interim: spoken(IKHLAS, 0, 2) }, 1000);
  assert.equal(companion.snapshot().pointer, 2);
  companion.hear({ interim: spoken(IKHLAS, 0, 4) }, 2000);
  assert.equal(companion.snapshot().pointer, 4);
  companion.hear({ final: spoken(IKHLAS, 0, 4) }, 2500);
  assert.equal(companion.snapshot().pointer, 4);
});

test('tracks when the recognizer only catches some of the words', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  // Heard "هو" and "احد" with "الله" missing, plus a word that isn't in the text.
  companion.hear({ final: `${IKHLAS[1].text} ${IKHLAS[3].text} كتاب ${IKHLAS[5].text}` }, 1000);
  assert.equal(companion.snapshot().pointer, 6);
});

test('a lone word away from the next position does not move the pointer', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ interim: IKHLAS[9].text }, 1000);
  assert.equal(companion.snapshot().pointer, 0);
});

test('hums and unrelated speech count as no progress, so the hint still fires', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: spoken(IKHLAS, 0, 3) }, 1000);
  companion.hear({ interim: 'ام ام ام' }, 2000);
  companion.hear({ interim: 'ام ام ام ام ام' }, 3500);
  assert.deepEqual(companion.tick(3999), null);
  assert.deepEqual(companion.tick(4000), { indexes: [3], kind: 'auto', verseKey: '1:1' });
});

test('hint ladder gives three words, then a qari recites the ayah, then stays quiet', () => {
  const words = surah(['الف باء تاء ثاء جيم حاء', 'خاء دال']);
  const companion = createCompanion(words, 0);
  companion.start(0);
  companion.hear({ final: 'الف' }, 0);
  assert.equal(companion.snapshot().pointer, 1);

  let now = 0;
  const nextHint = () => {
    now += 5000;
    const hint = companion.tick(now);
    if (hint) companion.hintFinished(now);
    return hint;
  };
  assert.deepEqual(nextHint(), { indexes: [1], kind: 'auto', verseKey: '1:1' });
  assert.deepEqual(nextHint(), { indexes: [2], kind: 'auto', verseKey: '1:1' });
  assert.deepEqual(nextHint(), { indexes: [3], kind: 'auto', verseKey: '1:1' });
  assert.deepEqual(nextHint(), { indexes: [1, 2, 3, 4, 5], kind: 'ayah', verseKey: '1:1' });
  assert.equal(nextHint(), null);
  assert.equal(companion.snapshot().peeks.length, 4);
  assert.deepEqual(companion.tap(now), { indexes: [1], kind: 'tap', verseKey: '1:1' });
});

test('the qari still plays when the stuck word is the last of the surah', () => {
  const companion = createCompanion(IKHLAS, IKHLAS.length - 1);
  companion.start(0);
  companion.tap(0);
  companion.hintFinished(0);
  const hint = companion.tap(0);
  assert.deepEqual(hint, { indexes: [IKHLAS.length - 1], kind: 'ayah', verseKey: '1:4' });
});

test('silence after a waqf sign or at an ayah end waits longer than silence mid-ayah', () => {
  const words = surah(['ذلك الكتاب لا ريبۛ فيه هدى للمتقين', 'الذين يؤمنون']);
  const atWaqf = words.findIndex((word) => word.normalized === 'فيه');
  assert.equal(words[atWaqf - 1].hasWaqfMark, true);

  // Stopping on the waqf sign.
  const waqf = createCompanion(words, 0);
  waqf.start(0);
  waqf.hear({ final: spoken(words, 0, atWaqf) }, 1000);
  assert.equal(waqf.snapshot().pointer, atWaqf);
  assert.equal(waqf.tick(8999), null);
  assert.equal(waqf.tick(9000)?.indexes[0], atWaqf);

  // Stopping at the end of the ayah.
  const ayahEnd = createCompanion(words, 0);
  const firstOfAyah2 = words.findIndex((word) => word.ayah === 2);
  ayahEnd.start(0);
  ayahEnd.hear({ final: spoken(words, 0, firstOfAyah2) }, 1000);
  assert.equal(ayahEnd.tick(8999), null);
  assert.equal(ayahEnd.tick(9000)?.indexes[0], firstOfAyah2);

  // Stopping mid-ayah with no sign.
  const midAyah = createCompanion(words, 0);
  midAyah.start(0);
  midAyah.hear({ final: spoken(words, 0, 2) }, 1000);
  assert.equal(midAyah.tick(5999), null);
  assert.equal(midAyah.tick(6000)?.indexes[0], 2);
});

test('wrong words at a waqf still get help sooner than plain silence', () => {
  const words = surah(['ذلك الكتاب لا ريبۛ فيه هدى للمتقين']);
  const atWaqf = words.findIndex((word) => word.normalized === 'فيه');
  const companion = createCompanion(words, 0);
  companion.start(0);
  companion.hear({ final: spoken(words, 0, atWaqf) }, 1000);
  companion.hear({ interim: 'ام ام' }, 2000);
  assert.equal(companion.tick(5999), null);
  assert.equal(companion.tick(6000)?.indexes[0], atWaqf);
});

test('repeating recent words counts as reciting and restarts the wait', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: spoken(IKHLAS, 0, 3) }, 1000);
  companion.hear({ interim: IKHLAS[1].text }, 1500);
  assert.equal(companion.tick(6499), null);
  assert.equal(companion.tick(6500)?.indexes[0], 3);
});

test('marking a hint as not needed makes later hints wait longer', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: spoken(IKHLAS, 0, 3) }, 1000);
  assert.equal(companion.snapshot().stuckAfterMs, 5000);
  companion.hintNotNeeded();
  assert.equal(companion.snapshot().stuckAfterMs, 6500);
  assert.equal(companion.tick(7499), null);
  assert.equal(companion.tick(7500)?.indexes[0], 3);
});

test('transcripts during a hint are ignored, so the hint cannot move the pointer', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: spoken(IKHLAS, 0, 3) }, 1000);
  assert.ok(companion.tick(6000));
  companion.hear({ interim: spoken(IKHLAS, 2, 5) }, 6100);
  assert.equal(companion.snapshot().pointer, 3);
});

test('repeating one hinted word advances, and restarts the stuck timer', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: spoken(IKHLAS, 0, 3) }, 1000);
  assert.ok(companion.tick(6000));
  companion.hintFinished(6500);
  assert.equal(companion.tick(7000), null);
  companion.hear({ interim: IKHLAS[3].text }, 7000);
  assert.equal(companion.snapshot().pointer, 4);
  assert.equal(companion.tick(9000), null);
});

test('stays quiet during a run-up behind the frontier, then resumes at the frontier', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: spoken(IKHLAS, 0, 8) }, 1000);
  assert.equal(companion.snapshot().frontier, 8);

  companion.hear({ final: spoken(IKHLAS, 2, 5) }, 2000);
  let state = companion.snapshot();
  assert.equal(state.pointer, 5);
  assert.equal(state.frontier, 8);
  assert.equal(companion.tick(60_000), null);

  companion.hear({ final: spoken(IKHLAS, 5, 8) }, 61_000);
  state = companion.snapshot();
  assert.equal(state.pointer, 8);
  assert.deepEqual(companion.tick(66_000), { indexes: [8], kind: 'auto', verseKey: '1:3' });
});

test('a recognizer revising its interim guess does not push the pointer back', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ interim: spoken(IKHLAS, 0, 5) }, 1000);
  companion.hear({ interim: spoken(IKHLAS, 0, 4) }, 1200);
  assert.equal(companion.snapshot().pointer, 5);
});

test('with a repeated phrase, picks the occurrence nearest the pointer', () => {
  const companion = createCompanion(SHARH, 0);
  companion.start(0);
  companion.hear({ final: spoken(SHARH, 0, 4) }, 1000);
  assert.equal(companion.snapshot().pointer, 4);
  assert.equal(companion.snapshot().jumps, 0);
});

test('going far back, a phrase found in several places goes to the one that fits best', () => {
  const filler = Array.from({ length: 40 }, (_, i) => `كلمه${'ب'.repeat(i % 5)}ت${'س'.repeat(i % 7)}`).join(' ');
  const words = surah([
    filler,
    'يا ايها الذين امنوا اطيعوا',
    filler,
    'يا ايها الذين امنوا استجيبوا لله',
    filler,
  ]);
  const target = words.findIndex((word) => word.normalized === 'لله');

  const clear = createCompanion(words, 0);
  clear.start(0);
  clear.resync(words.length - 1, 0);
  clear.hear({ final: 'يا ايها الذين امنوا استجيبوا' }, 1000);
  assert.equal(clear.snapshot().pointer, target);

  const ambiguous = createCompanion(words, 0);
  ambiguous.start(0);
  ambiguous.resync(words.length - 1, 0);
  ambiguous.hear({ final: 'يا ايها الذين امنوا' }, 1000);
  assert.equal(ambiguous.snapshot().pointer, words.length - 1);
});

const TWO_AYAHS = surah(['الف باء تاء ثاء جيم حاء خاء دال ذال', 'راء زاي سين شين صاد ضاد']);
const NEXT_AYAH = 9;

test('reciting the next ayah does not move on while this one is unfinished', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: 'الف باء تاء' }, 1000);
  companion.hear({ final: 'راء زاي سين شين' }, 2000);
  const state = companion.snapshot();
  assert.equal(state.pointer, 3);
  assert.equal(state.waitingOnAyah, '1:1');
});

test('jumping to the end of the ayah does not count as finishing it', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: 'الف باء' }, 1000);
  companion.hear({ final: 'خاء دال ذال راء زاي' }, 2000);
  assert.ok(companion.snapshot().pointer < NEXT_AYAH);
});

test('finishing the ayah moves on, even running straight into the next', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: 'الف باء تاء ثاء جيم حاء خاء دال ذال راء زاي' }, 1000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH + 2);
  assert.equal(companion.snapshot().waitingOnAyah, null);
});

test('the recognizer missing the last words of the ayah does not block moving on', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: 'الف باء تاء ثاء جيم حاء' }, 1000);
  companion.hear({ final: 'راء زاي سين' }, 2000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH + 3);
});

test('after a hint, skipping the last word and going on does not count', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: spoken(TWO_AYAHS, 0, 8) }, 0);
  assert.equal(companion.tap(1000)?.indexes[0], 8);
  companion.hintFinished(1000);

  companion.hear({ final: 'راء زاي سين' }, 2000);
  assert.equal(companion.snapshot().pointer, 8);
  assert.equal(companion.snapshot().waitingOnAyah, '1:1');

  // Saying the hinted word and carrying on is exactly what should work.
  companion.hear({ final: 'ذال راء زاي' }, 3000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH + 2);
});

// Stuck on the ayah's last word, through word hint and qari.
function stuckThroughQari() {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: spoken(TWO_AYAHS, 0, 8) }, 0);
  companion.tap(1000);
  companion.hintFinished(1000);
  assert.equal(companion.tap(2000)?.kind, 'ayah');
  companion.hintFinished(2000);
  return companion;
}

test('the next ayah recited too early is not counted once the held ayah is finished', () => {
  const companion = stuckThroughQari();
  companion.hear({ final: 'راء زاي سين شين' }, 3000);
  assert.equal(companion.snapshot().pointer, 8);

  companion.hear({ final: 'دال ذال' }, 4000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH);
  // Any later update from the recognizer must not bring back the words heard earlier.
  companion.hear({ interim: '' }, 4100);
  companion.hear({ interim: 'كلمه' }, 4200);
  companion.hear({ interim: '' }, 4300);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH);
  assert.equal(companion.snapshot().frontier, NEXT_AYAH);
});

test('the same applies when it is all one unbroken recognizer sentence', () => {
  const companion = stuckThroughQari();
  companion.hear({ interim: 'راء زاي سين' }, 3000);
  companion.hear({ interim: 'راء زاي سين شين' }, 3500);
  assert.equal(companion.snapshot().pointer, 8);
  companion.hear({ interim: 'راء زاي سين شين دال ذال' }, 4000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH);
  companion.hear({ final: 'راء زاي سين شين دال ذال' }, 4500);
  companion.hear({ interim: '' }, 4600);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH);
});

test('after finishing the held ayah, reciting the next one works from its first word', () => {
  const companion = stuckThroughQari();
  companion.hear({ final: 'راء زاي سين' }, 3000);
  companion.hear({ final: 'دال ذال' }, 4000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH);
  companion.hear({ interim: 'راء' }, 5000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH + 1);
  companion.hear({ interim: 'راء زاي سين' }, 6000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH + 3);
});

test('saying a nearby word after the qari does not loosen the rule', () => {
  const companion = stuckThroughQari();
  companion.hear({ final: 'دال' }, 3000);
  companion.hear({ final: 'راء زاي سين' }, 4000);
  assert.equal(companion.snapshot().pointer, 8);
});

test('the finish-this-ayah message stays until the ayah is finished', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: spoken(TWO_AYAHS, 0, 8) }, 0);
  companion.tap(1000);
  companion.hintFinished(1000);
  companion.hear({ final: 'راء زاي سين' }, 2000);
  assert.equal(companion.snapshot().waitingOnAyah, '1:1');
  companion.hear({ interim: 'شين' }, 3000);
  assert.equal(companion.snapshot().waitingOnAyah, '1:1');
  companion.hear({ final: 'ذال' }, 4000);
  assert.equal(companion.snapshot().waitingOnAyah, null);
});

test('word hints stay inside the ayah, then the qari recites that same ayah', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: spoken(TWO_AYAHS, 0, 8) }, 0);
  assert.equal(companion.snapshot().pointer, 8);
  let now = 0;
  const nextHint = () => {
    now += 5000;
    const hint = companion.tick(now);
    if (hint) companion.hintFinished(now);
    return hint;
  };
  assert.deepEqual(nextHint(), { indexes: [8], kind: 'auto', verseKey: '1:1' });
  assert.deepEqual(nextHint(), { indexes: [8], kind: 'ayah', verseKey: '1:1' });
  assert.equal(nextHint(), null);
  const state = companion.snapshot();
  assert.equal(state.pointer, 8);
  assert.equal(state.waitingOnAyah, '1:1');
});

test('after the qari, finishing the ayah moves on and clears the wait', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: spoken(TWO_AYAHS, 0, 8) }, 0);
  companion.tap(1000);
  companion.hintFinished(1000);
  companion.tap(2000);
  companion.hintFinished(2000);
  assert.equal(companion.snapshot().waitingOnAyah, '1:1');
  companion.hear({ interim: TWO_AYAHS[8].text }, 3000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH);
  assert.equal(companion.snapshot().waitingOnAyah, null);
});

test('after finishing, earlier ayahs can be repeated freely', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: spoken(TWO_AYAHS, 0, 11) }, 1000);
  companion.hear({ final: spoken(TWO_AYAHS, 3, 11) }, 2000);
  assert.equal(companion.snapshot().pointer, 11);
  assert.equal(companion.snapshot().waitingOnAyah, null);
});

test('tapping an ayah number still lets the user choose to move on', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: 'الف باء تاء' }, 1000);
  companion.resync(NEXT_AYAH, 2000);
  companion.hear({ final: 'راء زاي' }, 3000);
  assert.equal(companion.snapshot().pointer, NEXT_AYAH + 2);
});

const BASMALA = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ';

test('saying the basmala and then not starting gets a hint for the first word', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: BASMALA }, 2000);
  assert.equal(companion.snapshot().pointer, 0);
  assert.equal(companion.tick(6999), null);
  assert.deepEqual(companion.tick(7000), { indexes: [0], kind: 'auto', verseKey: '1:1' });
});

test('the opening words themselves never get interrupted', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  // A slow ta'awwudh and basmala that take far longer than any hint delay.
  const opening = 'اعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم'.split(' ');
  opening.forEach((_, i) => {
    const at = (i + 1) * 2000;
    companion.hear({ interim: opening.slice(0, i + 1).join(' ') }, at);
    assert.equal(companion.tick(at + 1000), null);
  });
});

test('saying nothing at all still gets a hint eventually', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  assert.equal(companion.tick(9999), null);
  assert.deepEqual(companion.tick(10_000), { indexes: [0], kind: 'auto', verseKey: '1:1' });
});

test('after the basmala in Al-Fatihah, the wait is not the long waqf one', () => {
  const words = surah([BASMALA, 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ']);
  const companion = createCompanion(words, 0);
  companion.start(0);
  companion.hear({ final: BASMALA }, 1000);
  assert.equal(companion.snapshot().pointer, 4);
  assert.equal(companion.tick(5999), null);
  assert.deepEqual(companion.tick(6000), { indexes: [4], kind: 'auto', verseKey: '1:2' });
});

test('starting over after a hint is not treated as still being stuck', () => {
  const words = surah(['الف باء تاء ثاء جيم حاء خاء دال']);
  const companion = createCompanion(words, 0);
  companion.start(0);
  companion.hear({ final: 'الف باء تاء' }, 1000);
  assert.deepEqual(companion.tick(6000), { indexes: [3], kind: 'auto', verseKey: '1:1' });
  companion.hintFinished(7000);

  // Only one word back, and then from the very start, each with pauses between words.
  companion.hear({ final: 'تاء' }, 9000);
  assert.equal(companion.tick(12_000), null);
  companion.hear({ final: 'الف' }, 13_000);
  assert.equal(companion.tick(16_000), null);
  companion.hear({ final: 'باء' }, 17_000);
  assert.equal(companion.tick(20_000), null);
  companion.hear({ final: 'تاء ثاء جيم' }, 21_000);
  assert.equal(companion.snapshot().pointer, 5);
});

test('stalling again after starting over repeats the same word, not the next one', () => {
  const words = surah(['الف باء تاء ثاء جيم حاء خاء دال']);
  const companion = createCompanion(words, 0);
  companion.start(0);
  companion.hear({ final: 'الف باء تاء' }, 1000);
  assert.deepEqual(companion.tick(6000), { indexes: [3], kind: 'auto', verseKey: '1:1' });
  companion.hintFinished(7000);
  companion.hear({ final: 'باء تاء' }, 9000);
  assert.equal(companion.tick(13_999), null);
  assert.deepEqual(companion.tick(14_000), { indexes: [3], kind: 'auto', verseKey: '1:1' });
});

test('repeatedly stalling on one word still reaches the qari', () => {
  const words = surah(['الف باء تاء ثاء جيم حاء خاء دال']);
  const companion = createCompanion(words, 0);
  companion.start(0);
  companion.hear({ final: 'الف باء تاء' }, 1000);
  let now = 1000;
  const kinds = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    now += 5000;
    const hint = companion.tick(now);
    kinds.push(hint?.kind);
    now += 1000;
    companion.hintFinished(now);
    companion.hear({ final: attempt % 2 ? 'الف باء' : 'باء تاء' }, now);
  }
  assert.deepEqual(kinds, ['auto', 'auto', 'auto', 'ayah']);
});

test('after the qari, starting over and stalling again gets help again', () => {
  const words = surah(['الف باء تاء ثاء جيم حاء خاء دال']);
  const companion = createCompanion(words, 0);
  companion.start(0);
  companion.hear({ final: 'الف باء تاء' }, 0);
  let now = 0;
  for (const expected of ['auto', 'auto', 'auto', 'ayah']) {
    now += 5000;
    assert.equal(companion.tick(now)?.kind, expected);
    companion.hintFinished(now);
  }
  assert.equal(companion.tick(now + 60_000), null);
  now += 60_000;
  companion.hear({ final: 'باء تاء' }, now);
  assert.equal(companion.tick(now + 5000)?.indexes[0], 3);
});

test('after a hint, there is time to begin before the next one', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: spoken(IKHLAS, 0, 3) }, 1000);
  assert.ok(companion.tick(6000));
  companion.hintFinished(7000);
  assert.equal(companion.tick(11_999), null);
  // The stuck word ends the ayah, so the next hint is the qari, not the next ayah.
  assert.deepEqual(companion.tick(12_000), { indexes: [3], kind: 'ayah', verseKey: '1:1' });
});

test('resync overrides tracking, including an earlier frontier', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: spoken(IKHLAS, 0, 8) }, 1000);
  companion.resync(4, 2000);
  assert.equal(companion.snapshot().pointer, 4);
  assert.equal(companion.snapshot().frontier, 4);
  // Index 4 opens an ayah, so silence there gets the longer waqf allowance.
  assert.equal(companion.tick(9999), null);
  assert.deepEqual(companion.tick(10_000), { indexes: [4], kind: 'auto', verseKey: '1:2' });
});

test('stuck timeout adapts to pace and stays within limits', () => {
  const slow = createCompanion(IKHLAS, 0);
  slow.start(0);
  for (let i = 1; i <= 6; i++) slow.hear({ final: IKHLAS[i - 1].text }, i * 4000);
  slow.hear({ interim: 'ام' }, 25_000);
  assert.equal(slow.snapshot().stuckAfterMs, 6000);

  const fast = createCompanion(IKHLAS, 0);
  fast.start(0);
  for (let i = 1; i <= 5; i++) fast.hear({ final: IKHLAS[i - 1].text }, i * 200);
  fast.hear({ interim: 'ام' }, 1100);
  assert.equal(fast.snapshot().stuckAfterMs, 3000);
});

test('reaching the last word finishes the session', () => {
  const companion = createCompanion(IKHLAS, 0);
  companion.start(0);
  companion.hear({ final: spoken(IKHLAS, 0, IKHLAS.length) }, 1000);
  assert.equal(companion.snapshot().finished, true);
  assert.equal(companion.tick(60_000), null);
  assert.equal(companion.tap(60_000), null);
});

test('a session summary lists each word once, in order, with no dependency on the session', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: spoken(TWO_AYAHS, 0, 3) }, 1000);
  companion.tap(2000);
  companion.hintFinished(2000);
  companion.hear({ final: spoken(TWO_AYAHS, 1, 3) }, 3000);
  companion.tap(4000);
  companion.hintFinished(4000);
  companion.hear({ interim: TWO_AYAHS[3].text }, 5000);
  companion.tap(6000);
  companion.hintFinished(6000);

  const result = summarizeSession(companion.snapshot(), TWO_AYAHS, { surah: 7, startAyah: 1, seconds: 6, savedAt: 123 });
  assert.equal(result.wordsCovered, 4);
  assert.equal(result.hints, 3);
  assert.equal(result.reached, '1:1');
  assert.deepEqual(result.review, [
    { verseKey: '1:1', word: TWO_AYAHS[3].text, hints: 2 },
    { verseKey: '1:1', word: TWO_AYAHS[4].text, hints: 1 },
  ]);
  // It has to survive being saved and read back.
  assert.deepEqual(JSON.parse(JSON.stringify(result)).review[0].word, TWO_AYAHS[3].text);
});

test('a qari hint is summarized as the whole ayah', () => {
  const companion = createCompanion(TWO_AYAHS, 0);
  companion.start(0);
  companion.hear({ final: spoken(TWO_AYAHS, 0, 8) }, 0);
  companion.tap(1000);
  companion.hintFinished(1000);
  companion.tap(2000);
  companion.hintFinished(2000);
  const result = summarizeSession(companion.snapshot(), TWO_AYAHS, { surah: 7, startAyah: 1, seconds: 2, savedAt: 1 });
  assert.deepEqual(result.review, [
    { verseKey: '1:1', word: TWO_AYAHS[8].text, hints: 1 },
    { verseKey: '1:1', word: undefined, hints: 1 },
  ]);
});
