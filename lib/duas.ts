export type Dua = {
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
};

export const STUDENT_DUAS: Dua[] = [
  {
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: 'Rabbi zidni ilma',
    translation: 'My Lord, increase me in knowledge.',
    source: 'Quran 20:114',
  },
  {
    arabic: 'اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي، وَعَلِّمْنِي مَا يَنْفَعُنِي، وَزِدْنِي عِلْمًا',
    transliteration: 'Allahumma infa-ni bima allamtani, wa allimni ma yanfa-uni, wa zidni ilma',
    translation: 'O Allah, benefit me with what You have taught me, teach me what will benefit me, and increase me in knowledge.',
    source: 'Tirmidhi 3599',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
    transliteration: 'Allahumma inni as-aluka ilman nafi-an, wa rizqan tayyiban, wa amalan mutaqabbalan',
    translation: 'O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.',
    source: 'Ibn Majah 925',
  },
  {
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
    transliteration: 'Rabbi-shrah li sadri wa yassir li amri',
    translation: 'My Lord, expand my chest and ease my task for me.',
    source: 'Quran 20:25-26',
  },
  {
    arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الحَزْنَ إِذَا شِئْتَ سَهْلًا',
    transliteration: 'Allahumma la sahla illa ma ja-altahu sahlan, wa anta taj-alul-hazna idha shi-ta sahlan',
    translation: 'O Allah, nothing is easy except what You make easy, and You make difficulty easy when You will.',
    source: 'Ibn Hibban',
  },
  {
    arabic: 'اللَّهُمَّ ارْزُقْنِي حِفْظَ كِتَابِكَ وَفَهْمَهُ',
    transliteration: 'Allahumma-rzuqni hifza kitabika wa fahmahu',
    translation: 'O Allah, grant me the memorisation of Your Book and its understanding.',
    source: 'Traditional dua of students of Quran',
  },
  {
    arabic: 'رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا',
    transliteration: 'Rabbana atina min ladunka rahmatan wa hayyi-lana min amrina rashada',
    translation: 'Our Lord, grant us mercy from Yourself and guide us to right conduct in our affair.',
    source: 'Quran 18:10',
  },
];

export function getDailyDua(date: Date): Dua {
  const idx = Math.floor(date.getTime() / 86400000) % STUDENT_DUAS.length;
  return STUDENT_DUAS[idx];
}
