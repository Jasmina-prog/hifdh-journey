'use client';

import { motion } from 'framer-motion';

// Two authentic Arabic eghra (arabesque) ornaments from Wikimedia Commons.
// Both use a warm linear gradient: pale gold → vivid gold → deep amber.
// Transparent backgrounds — no bounding rects, no filters causing dark areas.

export function IslamicPattern() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">

      {/* ── Top-right · primary · slow clockwise ─────────── */}
      <motion.div
        className="absolute"
        style={{ top: -80, right: -80, width: 720, height: 720 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.14 }}
        transition={{ duration: 3, ease: 'easeOut' }}
      >
        <motion.img
          src="/patterns/eghra-gold.svg"
          alt=""
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          style={{ width: '100%', height: '100%' }}
          draggable={false}
          className="select-none"
        />
      </motion.div>

      {/* ── Bottom-left · secondary · slow counter-clockwise ─ */}
      <motion.div
        className="absolute"
        style={{ bottom: -50, left: -50, width: 420, height: 420 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.10 }}
        transition={{ duration: 3, delay: 0.5, ease: 'easeOut' }}
      >
        <motion.img
          src="/patterns/eghra2.svg"
          alt=""
          animate={{ rotate: -360 }}
          transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
          style={{ width: '100%', height: '100%' }}
          draggable={false}
          className="select-none"
        />
      </motion.div>

    </div>
  );
}
