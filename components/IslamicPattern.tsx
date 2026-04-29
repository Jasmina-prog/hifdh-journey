'use client';

import { motion } from 'framer-motion';

export function IslamicPattern() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.1 }}
      transition={{ duration: 2, delay: 2 }}
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute -top-10 -right-10 h-32 w-32 text-amber-600 dark:text-amber-400"
      >
        <path
          d="M50 10 L60 20 L50 30 L40 20 Z M50 70 L60 80 L50 90 L40 80 Z M20 50 L30 60 L20 70 L10 60 Z M80 50 L90 60 L80 70 L70 60 Z"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
      <svg
        viewBox="0 0 100 100"
        className="absolute -bottom-10 -left-10 h-32 w-32 text-emerald-600 dark:text-emerald-400"
      >
        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.2" />
      </svg>
    </motion.div>
  );
}