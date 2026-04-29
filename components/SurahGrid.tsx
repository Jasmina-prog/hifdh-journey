'use client';

import { motion } from 'framer-motion';

const surahNames = [
  'Al-Fatihah', 'Al-Baqarah', 'Ali \'Imran', 'An-Nisa\'', 'Al-Ma\'idah', 'Al-An\'am', 'Al-A\'raf', 'Al-Anfal', 'At-Tawbah', 'Yunus',
  'Hud', 'Yusuf', 'Ar-Ra\'d', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra\'', 'Al-Kahf', 'Maryam', 'Ta-Ha',
  'Al-Anbiya\'', 'Al-Hajj', 'Al-Mu\'minun', 'An-Nur', 'Al-Furqan', 'Ash-Shu\'ara\'', 'An-Naml', 'Al-Qasas', 'Al-\'Ankabut', 'Ar-Rum',
  'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba\'', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir',
  'Fussilat', 'Ash-Shura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
  'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', 'Al-Waqi\'ah', 'Al-Hadid', 'Al-Mujadilah', 'Al-Hashr', 'Al-Mumtahanah',
  'As-Saff', 'Al-Jumu\'ah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Ma\'arij',
  'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', 'An-Naba\'', 'An-Nazi\'at', 'Abasa',
  'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', 'Al-A\'la', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad',
  'Ash-Shams', 'Al-Lail', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-\'Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-\'Adiyat',
  'Al-Qari\'ah', 'At-Takathur', 'Al-\'Asr', 'Al-Humazah', 'Al-Fil', 'Quraysh', 'Al-Ma\'un', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr',
  'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas'
];

type SurahGridProps = {
  completedSurahs: number[];
  selectedSurah: number;
  onSelect: (surah: number) => void;
};

export function SurahGrid({ completedSurahs, selectedSurah, onSelect }: SurahGridProps) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14">
      {Array.from({ length: 114 }, (_, index) => {
        const surahNumber = index + 1;
        const isCompleted = completedSurahs.includes(surahNumber);
        const isSelected = selectedSurah === surahNumber;
        return (
          <motion.button
            key={surahNumber}
            type="button"
            onClick={() => onSelect(surahNumber)}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: index * 0.005 }}
            className={`relative aspect-square rounded-lg border text-xs font-semibold transition-all duration-200 hover:scale-105 ${
              isCompleted
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-100'
                : isSelected
                ? 'border-slate-400 bg-slate-100 text-slate-950 shadow-md dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100'
                : 'border-slate-200 bg-white text-slate-950 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
            }`}
          >
            <span className="absolute inset-0 flex items-center justify-center">
              {surahNumber}
            </span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[0.6rem] leading-none opacity-60">
              {/* {surahNumber} */}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
