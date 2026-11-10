import type { Localized } from './duas.ts';

// Hadiths about knowledge, the Quran and memorizing it. Each one cites its collection
// and number so it can be checked. The wording is a translation of the meaning, and the
// Uzbek and Russian were written for this app: have a qualified person review them
// against a trusted published translation before relying on them.

type Book = 'bukhari' | 'muslim' | 'abudawud' | 'tirmidhi' | 'ibnmajah';

export const BOOK_NAMES: Record<Book, Localized> = {
  bukhari: { en: 'Sahih al-Bukhari', uz: 'Sahih al-Buxoriy', ru: 'Сахих аль-Бухари' },
  muslim: { en: 'Sahih Muslim', uz: 'Sahih Muslim', ru: 'Сахих Муслим' },
  abudawud: { en: 'Sunan Abi Dawud', uz: 'Sunan Abu Dovud', ru: 'Сунан Абу Дауда' },
  tirmidhi: { en: 'Jami at-Tirmidhi', uz: 'Jome at-Termiziy', ru: 'Джами ат-Тирмизи' },
  ibnmajah: { en: 'Sunan Ibn Majah', uz: 'Sunan Ibn Moja', ru: 'Сунан Ибн Маджа' },
};

export type Hadith = {
  text: Localized;
  /** The collections that record it, with the hadith number in each. */
  refs: { book: Book; number: number }[];
  /** Where scholars grade it: sahih for Bukhari and Muslim, otherwise as graded in the Sunan. */
  grade: 'sahih' | 'hasan';
};

export const HADITHS: Hadith[] = [
  {
    text: {
      en: 'The best of you are those who learn the Quran and teach it.',
      uz: "Sizlarning eng yaxshingiz Qur'onni o'rgangan va uni o'rgatgan kishingizdir.",
      ru: 'Лучший из вас тот, кто изучает Коран и обучает ему других.',
    },
    refs: [{ book: 'bukhari', number: 5027 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'Recite the Quran, for on the Day of Resurrection it will come as an intercessor for those who recited it.',
      uz: "Qur'onni o'qinglar, chunki u qiyomat kuni o'z egalari uchun shafoatchi bo'lib keladi.",
      ru: 'Читайте Коран, ибо в День воскресения он придёт заступником для тех, кто его читал.',
    },
    refs: [{ book: 'muslim', number: 804 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'The one who recites the Quran skilfully will be with the noble and obedient angels. And the one who recites it with difficulty, struggling through it, will have a double reward.',
      uz: "Qur'onni mohirlik bilan o'qigan kishi hurmatli va itoatkor farishtalar bilan birga bo'ladi. Qur'onni qiynalib, qiyinchilik bilan o'qigan kishiga esa ikki baravar ajr bor.",
      ru: 'Тот, кто искусно читает Коран, будет с благородными и послушными ангелами. А тот, кто читает его с запинкой и трудом, получит двойную награду.',
    },
    refs: [{ book: 'bukhari', number: 4937 }, { book: 'muslim', number: 798 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'It will be said to the companion of the Quran: Recite and rise, and recite slowly as you used to recite in the world, for your rank is at the last verse you recite.',
      uz: "Qur'on egasiga aytiladi: «O'qi va yuksal, dunyoda tartil bilan o'qiganingdek o'qi. Sening martabang o'qigan oxirgi oyatingdadir.»",
      ru: 'Обладателю Корана будет сказано: «Читай и поднимайся, и читай размеренно, как ты читал в мирской жизни, ибо твоя ступень — у последнего аята, который ты прочтёшь».',
    },
    refs: [{ book: 'abudawud', number: 1464 }, { book: 'tirmidhi', number: 2914 }],
    grade: 'hasan',
  },
  {
    text: {
      en: 'Keep reviewing the Quran. By Him in Whose hand is my soul, it escapes more quickly than a camel from its rope.',
      uz: "Qur'onni muntazam takrorlab turinglar. Jonim qo'lida bo'lgan Zot nomiga qasamki, u bog'langan tuyadan ham tezroq qochib ketadi.",
      ru: 'Постоянно повторяйте Коран. Клянусь Тем, в Чьей руке моя душа, он убегает быстрее, чем верблюд из своих пут.',
    },
    refs: [{ book: 'bukhari', number: 5033 }, { book: 'muslim', number: 791 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'Whoever recites a letter from the Book of Allah earns a good deed, and each good deed is multiplied by ten. I do not say that "Alif Lam Mim" is one letter, but Alif is a letter, Lam is a letter and Mim is a letter.',
      uz: "Kim Allohning Kitobidan bir harf o'qisa, unga bir savob bor, har bir savob esa o'n barobar bo'ladi. «Alif, Lom, Mim» bir harf demayman, balki Alif — bir harf, Lom — bir harf, Mim — bir harf.",
      ru: 'Кто прочтёт одну букву из Книги Аллаха, тому — одно благое деяние, а каждое благое деяние умножается в десять раз. Я не говорю, что «Алиф, Лям, Мим» — одна буква, но «алиф» — буква, «лям» — буква и «мим» — буква.',
    },
    refs: [{ book: 'tirmidhi', number: 2910 }],
    grade: 'hasan',
  },
  {
    text: {
      en: 'There is no envy except in two cases: a man to whom Allah has given the Quran and he stands with it through the night and the day, and a man to whom Allah has given wealth and he spends it night and day.',
      uz: "Faqat ikki kishiga havas qilish joiz: Alloh Qur'on bergan va uni kechayu kunduz o'qib turadigan kishiga, hamda Alloh mol bergan va uni kechayu kunduz sarflaydigan kishiga.",
      ru: 'Зависть (в хорошем смысле) допустима лишь в двух случаях: к человеку, которому Аллах даровал Коран и который читает его ночью и днём, и к человеку, которому Аллах даровал богатство и который расходует его ночью и днём.',
    },
    refs: [{ book: 'bukhari', number: 5025 }, { book: 'muslim', number: 815 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'Indeed, Allah raises some people by this Book and lowers others by it.',
      uz: "Albatta, Alloh shu Kitob sababli bir qavmlarni yuksaltiradi, boshqalarni esa pasaytiradi.",
      ru: 'Воистину, Аллах возвышает одних людей этой Книгой и унижает других.',
    },
    refs: [{ book: 'muslim', number: 817 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'The believer who recites the Quran is like a citron: its fragrance is good and its taste is good. The believer who does not recite the Quran is like a date: it has no fragrance but its taste is sweet.',
      uz: "Qur'on o'qiydigan mo'minning misoli turunjga o'xshaydi: hidi ham yaxshi, mazasi ham yaxshi. Qur'on o'qimaydigan mo'minning misoli xurmoga o'xshaydi: hidi yo'q, lekin mazasi shirin.",
      ru: 'Верующий, читающий Коран, подобен цитрону: аромат его приятен и вкус приятен. Верующий, не читающий Коран, подобен финику: у него нет аромата, но вкус сладок.',
    },
    refs: [{ book: 'bukhari', number: 5020 }, { book: 'muslim', number: 797 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'Whoever recites the last two verses of Surat al-Baqarah at night, they will be enough for him.',
      uz: "Kim kechasi Baqara surasining oxirgi ikki oyatini o'qisa, ular unga kifoya qiladi.",
      ru: 'Кто прочтёт ночью два последних аята суры «аль-Бакара», тому их будет достаточно.',
    },
    refs: [{ book: 'bukhari', number: 5009 }, { book: 'muslim', number: 807 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'Do not turn your houses into graves. Satan flees from the house in which Surat al-Baqarah is recited.',
      uz: "Uylaringizni qabristonga aylantirmanglar. Shayton Baqara surasi o'qiladigan uydan qochadi.",
      ru: 'Не превращайте свои дома в кладбища. Шайтан бежит из дома, в котором читают суру «аль-Бакара».',
    },
    refs: [{ book: 'muslim', number: 780 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'Whoever memorizes ten verses from the beginning of Surat al-Kahf will be protected from the Dajjal.',
      uz: "Kim Kahf surasining boshidan o'n oyatni yod olsa, u Dajjoldan himoya qilinadi.",
      ru: 'Кто выучит десять аятов из начала суры «аль-Кахф», тот будет защищён от Даджаля.',
    },
    refs: [{ book: 'muslim', number: 809 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'Whoever stands in prayer reciting ten verses will not be written among the heedless.',
      uz: "Kim namozda o'n oyat o'qib tursa, g'ofillardan yozilmaydi.",
      ru: 'Кто встанет на молитву и прочтёт десять аятов, тот не будет записан среди беспечных.',
    },
    refs: [{ book: 'abudawud', number: 1398 }],
    grade: 'hasan',
  },
  {
    text: {
      en: 'The one who has nothing of the Quran in his heart is like a ruined house.',
      uz: "Qalbida Qur'ondan hech narsa bo'lmagan kishi vayron uy kabidir.",
      ru: 'Тот, в чьём сердце нет ничего из Корана, подобен разрушенному дому.',
    },
    refs: [{ book: 'tirmidhi', number: 2913 }],
    grade: 'hasan',
  },
  {
    text: {
      en: 'Allah has people among mankind. They said: Messenger of Allah, who are they? He said: The people of the Quran. They are the people of Allah and His chosen ones.',
      uz: "Alloh uchun odamlar orasida O'ziga mansub kishilar bor. «Ey Allohning elchisi, ular kimlar?» deyishdi. U: «Qur'on ahli. Ular Allohning ahli va O'zining xos bandalaridir», dedi.",
      ru: 'У Аллаха среди людей есть Его люди. Спросили: «О Посланник Аллаха, кто они?» Он ответил: «Люди Корана. Они — люди Аллаха и Его избранные».',
    },
    refs: [{ book: 'ibnmajah', number: 215 }],
    grade: 'hasan',
  },
  {
    text: {
      en: 'Whoever takes a path in search of knowledge, Allah will make easy for him a path to Paradise.',
      uz: "Kim ilm izlab yo'lga chiqsa, Alloh unga jannatga olib boradigan yo'lni oson qiladi.",
      ru: 'Кто пойдёт путём в поисках знания, тому Аллах облегчит путь в Рай.',
    },
    refs: [{ book: 'muslim', number: 2699 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'When a person dies, his deeds come to an end except for three: ongoing charity, knowledge that is benefited from, or a righteous child who prays for him.',
      uz: "Inson vafot etsa, amali uzilib qoladi, faqat uch narsa qoladi: davomli sadaqa, foyda berib turadigan ilm yoki unga duo qiladigan solih farzand.",
      ru: 'Когда человек умирает, его деяния прекращаются, кроме трёх: непрекращающейся милостыни, знания, которым пользуются, и праведного ребёнка, который молится за него.',
    },
    refs: [{ book: 'muslim', number: 1631 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'When Allah wants good for someone, He gives him understanding of the religion.',
      uz: "Alloh kim uchun yaxshilikni xohlasa, uni dinda chuqur tushunchali qiladi.",
      ru: 'Кому Аллах желает добра, тому Он даёт глубокое понимание религии.',
    },
    refs: [{ book: 'bukhari', number: 71 }, { book: 'muslim', number: 1037 }],
    grade: 'sahih',
  },
  {
    text: {
      en: 'Convey from me, even if it is one verse.',
      uz: "Mendan yetkazinglar, hatto bitta oyat bo'lsa ham.",
      ru: 'Передавайте от меня, даже если это один аят.',
    },
    refs: [{ book: 'bukhari', number: 3461 }],
    grade: 'sahih',
  },
];

/** The same hadith for everyone on a given day, cycling through the list. */
export function getDailyHadith(date: Date): Hadith {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return HADITHS[day % HADITHS.length];
}

/** "Sahih al-Bukhari 4937; Sahih Muslim 798" in the given language. */
export function hadithSource(hadith: Hadith, lang: keyof Localized): string {
  return hadith.refs.map(({ book, number }) => `${BOOK_NAMES[book][lang]} ${number}`).join('; ');
}
