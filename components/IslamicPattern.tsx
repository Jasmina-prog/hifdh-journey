'use client';

import { motion } from 'framer-motion';

export function IslamicPattern() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Top-right geometric star */}
      <motion.svg
        initial={{ opacity: 0, rotate: -30 }}
        animate={{ opacity: 0.07, rotate: 0 }}
        transition={{ duration: 3, ease: 'easeOut' }}
        viewBox="0 0 200 200"
        className="absolute -top-16 -right-16 h-80 w-80 text-emerald-600 dark:text-emerald-400"
        fill="currentColor"
      >
        <polygon points="100,10 120,80 190,80 135,125 155,195 100,155 45,195 65,125 10,80 80,80" />
      </motion.svg>

      {/* Bottom-left crescent */}
      <motion.svg
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 0.06, x: 0 }}
        transition={{ duration: 2.5, delay: 0.5 }}
        viewBox="0 0 100 100"
        className="absolute -bottom-12 -left-12 h-64 w-64 text-teal-600 dark:text-teal-400"
        fill="currentColor"
      >
        <path d="M50 5 A45 45 0 1 0 50 95 A30 30 0 1 1 50 5 Z" />
      </motion.svg>

      {/* Center-right subtle grid */}
      <motion.svg
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.03 }}
        transition={{ duration: 3, delay: 1 }}
        viewBox="0 0 400 400"
        className="absolute top-1/3 right-0 h-96 w-96 text-amber-600 dark:text-amber-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        {[0, 1, 2, 3].map((i) =>
          [0, 1, 2, 3].map((j) => (
            <polygon
              key={`${i}-${j}`}
              points={`${i * 100 + 50},${j * 100 + 10} ${i * 100 + 90},${j * 100 + 50} ${i * 100 + 50},${j * 100 + 90} ${i * 100 + 10},${j * 100 + 50}`}
            />
          ))
        )}
      </motion.svg>
    </div>
  );
}
