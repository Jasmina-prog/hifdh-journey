'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Verse = {
  verse_key: string;
  text_uthmani: string;
  translations: { text: string }[];
};

export function RandomVerse() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVerse() {
      try {
        // Try Quran.Foundation API first
        try {
          const response = await fetch('https://api.quran.foundation/v1/verses/random?language=en&words=false&translations=131');
          if (response.ok) {
            const data = await response.json();
            if (data.verse) {
              setVerse(data.verse);
              return;
            }
          }
        } catch (qfError) {
          console.warn('Quran.Foundation API failed, trying fallback:', qfError);
        }

        // Fallback to Quran.com API
        const surah = Math.floor(Math.random() * 114) + 1;
        const response = await fetch(`https://api.quran.com/api/v4/verses/by_key/${surah}?language=en&words=false&translations=131&audio=7`);
        const data = await response.json();
        if (data.verse) {
          setVerse(data.verse);
        }
      } catch (error) {
        console.error('Failed to fetch verse:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVerse();
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        className="rounded-md border border-amber-200 bg-amber-50/80 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200"
      >
        <p className="text-sm">Loading a beautiful verse...</p>
      </motion.div>
    );
  }

  if (!verse) return null;

  return (
    <motion.div
      initial={{ y: 20 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, delay: 1 }}
      className="rounded-md border border-amber-200 bg-amber-50/80 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">Quran {verse.verse_key}</p>
      <p className="mt-2 text-sm leading-6 font-arabic">{verse.text_uthmani}</p>
      {verse.translations?.[0] && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 italic">
          "{verse.translations[0].text}"
        </p>
      )}
    </motion.div>
  );
}