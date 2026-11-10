// Month and weekday names written out for each language. Browsers' built-in Uzbek
// date data is patchy (some show "M01" or a bare letter), so the app doesn't depend on it.

export type Lang = 'uz' | 'ru' | 'en';

export function langOf(locale: string): Lang {
  const l = locale.toLowerCase();
  if (l.startsWith('uz')) return 'uz';
  if (l.startsWith('ru')) return 'ru';
  return 'en';
}

const MONTHS_LONG: Record<Lang, string[]> = {
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
// Russian needs the genitive after a day number: "10 ноября".
const RU_MONTHS_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const MONTHS_SHORT: Record<Lang, string[]> = {
  uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

// Indexed by Date#getDay(), so 0 is Sunday.
const WEEKDAYS_LONG: Record<Lang, string[]> = {
  uz: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const WEEKDAYS_SHORT: Record<Lang, string[]> = {
  uz: ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'],
  ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export const monthLong = (monthIndex: number, locale: string) => MONTHS_LONG[langOf(locale)][monthIndex];
export const monthShort = (monthIndex: number, locale: string) => MONTHS_SHORT[langOf(locale)][monthIndex];
export const weekdayShort = (day: number, locale: string) => WEEKDAYS_SHORT[langOf(locale)][day];

/** "Dushanba, 10 noyabr 2026" / "понедельник, 10 ноября 2026" / "Monday, November 10, 2026". */
export function formatLongDate(date: Date, locale: string): string {
  const lang = langOf(locale);
  const weekday = WEEKDAYS_LONG[lang][date.getDay()];
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  if (lang === 'ru') return `${weekday}, ${day} ${RU_MONTHS_GENITIVE[month]} ${year}`;
  if (lang === 'uz') return `${weekday}, ${day} ${MONTHS_LONG.uz[month].toLowerCase()} ${year}`;
  return `${weekday}, ${MONTHS_LONG.en[month]} ${day}, ${year}`;
}

/** The calendar day in the user's own time zone as YYYY-MM-DD. toISOString() would use UTC and shift the day. */
export function localDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const HIJRI_MONTHS: Record<Lang, string[]> = {
  uz: ['Muharram', 'Safar', 'Rabiul-avval', 'Rabiul-oxir', 'Jumodul-avval', 'Jumodul-oxir', 'Rajab', "Sha'bon", 'Ramazon', 'Shavvol', "Zulqa'da", 'Zulhijja'],
  ru: ['Мухаррам', 'Сафар', 'Раби аль-авваль', 'Раби ас-сани', 'Джумада аль-уля', 'Джумада ас-сани', 'Раджаб', 'Шаабан', 'Рамадан', 'Шавваль', 'Зуль-каада', 'Зуль-хиджжа'],
  en: ['Muharram', 'Safar', "Rabi' al-awwal", "Rabi' al-thani", 'Jumada al-ula', 'Jumada al-thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'],
};

/** "15 Rajab 1448-yil hijriy" / "15 Раджаб 1448 г. хиджры" / "15 Rajab 1448 AH", without a weekday, which belongs to the Gregorian date. Empty if the browser lacks the Hijri calendar. */
export function formatHijriDate(date: Date, locale: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const day = Number(part('day'));
    const month = Number(part('month'));
    const year = Number(part('year').replace(/\D/g, ''));
    if (!day || !month || !year) return '';
    const lang = langOf(locale);
    const name = HIJRI_MONTHS[lang][month - 1];
    if (lang === 'uz') return `${day} ${name} ${year}-yil hijriy`;
    if (lang === 'ru') return `${day} ${name} ${year} г. хиджры`;
    return `${day} ${name} ${year} AH`;
  } catch {
    return '';
  }
}
