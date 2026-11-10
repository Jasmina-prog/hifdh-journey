export type Localized = { en: string; uz: string; ru: string };

export type Dua = {
  arabic: string;
  transliteration: string;
  translation: Localized;
  source: Localized;
};

export const STUDENT_DUAS: Dua[] = [
  {
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: 'Rabbi zidni ilma',
    translation: { en: 'My Lord, increase me in knowledge.', uz: 'Robbim, ilmimni ziyoda qil.', ru: 'Господи, приумножь мои знания!' },
    source: { en: 'Quran 20:114', uz: 'Qur\'on 20:114', ru: 'Коран 20:114' },
  },
  {
    arabic: 'اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي، وَعَلِّمْنِي مَا يَنْفَعُنِي، وَزِدْنِي عِلْمًا',
    transliteration: 'Allahumma infa-ni bima allamtani, wa allimni ma yanfa-uni, wa zidni ilma',
    translation: { en: 'O Allah, benefit me with what You have taught me, teach me what will benefit me, and increase me in knowledge.', uz: 'Allohim, menga o\'rgatgan narsang bilan manfaat ber, menga foydali narsani o\'rgat va ilmimni ziyoda qil.', ru: 'О Аллах, сделай полезным для меня то, чему Ты меня научил, научи меня тому, что принесёт мне пользу, и приумножь мои знания.' },
    source: { en: 'Tirmidhi 3599', uz: 'Termiziy 3599', ru: 'ат-Тирмизи 3599' },
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
    transliteration: 'Allahumma inni as-aluka ilman nafi-an, wa rizqan tayyiban, wa amalan mutaqabbalan',
    translation: { en: 'O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.', uz: 'Allohim, Sendan foydali ilm, pok rizq va qabul bo\'ladigan amal so\'rayman.', ru: 'О Аллах, я прошу у Тебя полезного знания, благого удела и принятых деяний.' },
    source: { en: 'Ibn Majah 925', uz: 'Ibn Moja 925', ru: 'Ибн Маджа 925' },
  },
  {
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
    transliteration: 'Rabbi-shrah li sadri wa yassir li amri',
    translation: { en: 'My Lord, expand my chest and ease my task for me.', uz: 'Robbim, ko\'ksimni keng qil va ishimni menga oson qil.', ru: 'Господи, расширь мне грудь и облегчи мне мою задачу.' },
    source: { en: 'Quran 20:25-26', uz: 'Qur\'on 20:25-26', ru: 'Коран 20:25-26' },
  },
  {
    arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الحَزْنَ إِذَا شِئْتَ سَهْلًا',
    transliteration: 'Allahumma la sahla illa ma ja-altahu sahlan, wa anta taj-alul-hazna idha shi-ta sahlan',
    translation: { en: 'O Allah, nothing is easy except what You make easy, and You make difficulty easy when You will.', uz: 'Allohim, Sen oson qilgan narsadan boshqa hech narsa oson emas, Sen xohlasang qiyinchilikni oson qilasan.', ru: 'О Аллах, нет лёгкого, кроме того, что Ты облегчил, и Ты, если пожелаешь, делаешь лёгким трудное.' },
    source: { en: 'Ibn Hibban', uz: 'Ibn Hibbon', ru: 'Ибн Хиббан' },
  },
  {
    arabic: 'اللَّهُمَّ ارْزُقْنِي حِفْظَ كِتَابِكَ وَفَهْمَهُ',
    transliteration: 'Allahumma-rzuqni hifza kitabika wa fahmahu',
    translation: { en: 'O Allah, grant me the memorisation of Your Book and its understanding.', uz: 'Allohim, menga Kitobingni yodlashni va uni tushunishni nasib et.', ru: 'О Аллах, даруй мне заучивание Твоей Книги и понимание её.' },
    source: { en: 'Traditional dua of students of Quran', uz: 'Qur\'on talabalarining an\'anaviy duosi', ru: 'Традиционная мольба учащихся Корана' },
  },
  {
    arabic: 'رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا',
    transliteration: 'Rabbana atina min ladunka rahmatan wa hayyi-lana min amrina rashada',
    translation: { en: 'Our Lord, grant us mercy from Yourself and guide us to right conduct in our affair.', uz: 'Robbimiz, bizga O\'z huzuringdan rahmat ber va ishimizda bizga to\'g\'ri yo\'lni tayyorla.', ru: 'Господи наш, даруй нам милость от Себя и устрой для нас наше дело правильным путём.' },
    source: { en: 'Quran 18:10', uz: 'Qur\'on 18:10', ru: 'Коран 18:10' },
  },
];

export function getDailyDua(date: Date): Dua {
  const idx = Math.floor(date.getTime() / 86400000) % STUDENT_DUAS.length;
  return STUDENT_DUAS[idx];
}
