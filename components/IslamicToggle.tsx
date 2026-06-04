'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';

const N = 16;

function borderTri(i: number, cx: number, cy: number, ro: number, ri: number, n: number) {
  const slice = (2 * Math.PI) / n;
  const a0 = i * slice - Math.PI / 2;
  const am = (i + 0.5) * slice - Math.PI / 2;
  const a1 = (i + 1) * slice - Math.PI / 2;
  const c = Math.cos, s = Math.sin;
  if (i % 2 === 0) {
    return `M${cx + ri * c(am)},${cy + ri * s(am)} L${cx + ro * c(a0)},${cy + ro * s(a0)} L${cx + ro * c(a1)},${cy + ro * s(a1)}Z`;
  }
  return `M${cx + ro * c(am)},${cy + ro * s(am)} L${cx + ri * c(a0)},${cy + ri * s(a0)} L${cx + ri * c(a1)},${cy + ri * s(a1)}Z`;
}

export function IslamicThemeToggle({
  theme,
  onToggle,
}: {
  theme: string;
  onToggle: () => void;
}) {
  const uid = useId().replace(/[^a-z0-9]/gi, '');
  const isDark = theme === 'dark';

  const K = 30;
  const TH = 20;
  const TW = 36;
  const W = K + TW;        // knob fits fully on either side
  const travel = TW;       // knob travels the full track width
  const cx = K / 2;
  const cy = K / 2;

  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="relative shrink-0 cursor-pointer focus:outline-none select-none"
      style={{ width: W, height: K }}
    >
      {/* ── Track ──────────────────────────────────────────────────── */}
      <div
        className="absolute"
        style={{
          left: K / 2,
          top: (K - TH) / 2,
          width: TW,
          height: TH,
          borderRadius: TH / 2,
          border: '1.5px solid #c9a020',
          boxShadow: '0 0 0 0.5px #9a721860, inset 0 1px 4px rgba(0,0,0,0.18)',
          background: isDark
            ? 'linear-gradient(130deg,#0d1829 0%,#1a2840 100%)'
            : 'linear-gradient(130deg,#b8d4cc 0%,#cce4da 50%,#c0dcd4 100%)',
          overflow: 'hidden',
        }}
      >
        <svg width="100%" height="100%">
          <defs>
            <pattern id={`${uid}tp`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <path
                d="M5,0.4 L6,3.4 L9.3,3.4 L6.6,5.4 L7.6,8.4 L5,6.6 L2.4,8.4 L3.4,5.4 L0.7,3.4 L4,3.4 Z"
                fill="none"
                stroke={isDark ? 'rgba(180,145,50,0.28)' : 'rgba(100,80,20,0.20)'}
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${uid}tp)`} />
        </svg>
      </div>

      {/* ── Sliding knob ───────────────────────────────────────────── */}
      <motion.div
        animate={{ x: isDark ? travel : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className="absolute top-0 left-0"
        style={{ width: K, height: K, zIndex: 10 }}
      >
        <svg width={K} height={K} viewBox={`0 0 ${K} ${K}`}>
          <defs>
            <radialGradient id={`${uid}rg`} cx="38%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#f5e080" />
              <stop offset="45%" stopColor="#d4a820" />
              <stop offset="100%" stopColor="#7a5210" />
            </radialGradient>
            <radialGradient id={`${uid}ig`} cx="36%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#faeea0" />
              <stop offset="55%" stopColor="#d4b030" />
              <stop offset="100%" stopColor="#9a7218" />
            </radialGradient>
          </defs>

          {/* Outer gold ring */}
          <circle cx={cx} cy={cy} r={14} fill={`url(#${uid}rg)`} />

          {/* Islamic triangular border */}
          {Array.from({ length: N }).map((_, i) => (
            <path
              key={i}
              d={borderTri(i, cx, cy, 14, 9.5, N)}
              fill={i % 2 === 0 ? '#7a5210' : '#f0d060'}
              fillOpacity={0.88}
            />
          ))}

          {/* Inner ring separator */}
          <circle cx={cx} cy={cy} r={9} fill="none" stroke="#9a7218" strokeWidth="0.6" />

          {/* Inner disc */}
          <circle cx={cx} cy={cy} r={8.5} fill={`url(#${uid}ig)`} />

          {/* Symbol */}
          {isDark ? (
            <g transform={`translate(${cx},${cy}) scale(0.44) translate(-13,-12)`}>
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                fill="#4a2e06"
                fillOpacity="0.7"
              />
            </g>
          ) : (
            <g>
              <circle cx={cx} cy={cy} r="2.2" fill="#4a2e06" fillOpacity="0.55" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
                const rad = (deg - 90) * Math.PI / 180;
                return (
                  <line
                    key={deg}
                    x1={cx + 3.5 * Math.cos(rad)} y1={cy + 3.5 * Math.sin(rad)}
                    x2={cx + 5.2 * Math.cos(rad)} y2={cy + 5.2 * Math.sin(rad)}
                    stroke="#4a2e06" strokeWidth="0.9" strokeOpacity="0.6"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          )}
        </svg>
      </motion.div>
    </button>
  );
}
