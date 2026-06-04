'use client';

import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';

export function IslamicPattern() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">

      {/* ── Top-right · primary · slow clockwise ─────────── */}
      <motion.div
        className="absolute"
        style={{ top: -80, right: -80, width: 720, height: 720 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isDark ? 0.12 : 0.60 }}
        transition={{ duration: 3, ease: 'easeOut' }}
      >
        <motion.img
          src="/patterns/eghra-gold.svg"
          alt=""
          animate={{ rotate: 360 }}
          transition={{ duration: 170, repeat: Infinity, ease: 'linear' }}
          style={{ width: '100%', height: '100%' }}
          draggable={false}
          className={`select-none ${isDark ? '' : 'mix-blend-multiply'}`}
        />
      </motion.div>

      {/* ── Bottom-left · secondary · slow counter-clockwise ─ */}
      <motion.div
        className="absolute"
        style={{ bottom: -50, left: -50, width: 420, height: 420 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isDark ? 0.08 : 0.40 }}
        transition={{ duration: 3, delay: 0.5, ease: 'easeOut' }}
      >
        <motion.img
          src="/patterns/eghra2.svg"
          alt=""
          animate={{ rotate: -360 }}
          transition={{ duration: 110, repeat: Infinity, ease: 'linear' }}
          style={{ width: '100%', height: '100%' }}
          draggable={false}
          className={`select-none ${isDark ? '' : 'mix-blend-multiply'}`}
        />
      </motion.div>

    </div>
  );
}
