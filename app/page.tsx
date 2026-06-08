'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
} from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// ─── Animation helpers ────────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.65, ease } },
};

const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.65, ease } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease } },
};

const stagger = (delay = 0.1) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

const goldGradientText = {
  background: 'linear-gradient(135deg, #d4af6e 0%, #c9a020 50%, #8b6510 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as React.CSSProperties;

const goldGradientBg = 'linear-gradient(135deg, #d4af6e, #c9a020, #8b6510)';

// ─── Shared CTA button ────────────────────────────────────────────────────────

function GoldButton({
  href,
  onClick,
  children,
  dark,
  disabled,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  dark?: boolean;
  disabled?: boolean;
}) {
  const cls = `inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-base font-semibold shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 ${dark ? 'text-slate-950' : 'text-white'}`;
  const style = { background: goldGradientBg };
  const arrow = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
  if (href) return <Link href={href} className={cls} style={style}>{children}{arrow}</Link>;
  return <button onClick={onClick} disabled={disabled} className={cls} style={style}>{children}{arrow}</button>;
}

// ─── Gold divider (matches dashboard) ────────────────────────────────────────

function Divider() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false }}
      transition={{ duration: 0.8 }}
      className="mx-auto w-full max-w-400 px-6 lg:px-16"
    >
      <div className="flex items-center gap-4">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #c9943a)' }} />
        <span className="text-sm text-amber-500/70 dark:text-amber-400/60">✦</span>
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #c9943a)' }} />
      </div>
    </motion.div>
  );
}

// ─── Count-up number ─────────────────────────────────────────────────────────

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false, margin: '-80px' });
  const raw = useMotionValue(0);
  const spring = useSpring(raw, { stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) => Math.round(v).toString() + suffix);

  useEffect(() => {
    if (inView) {
      animate(raw, to, { duration: 1.6, ease: 'easeOut' });
    } else {
      raw.set(0);
    }
  }, [inView, raw, to]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

// ─── 3-D tilt card ───────────────────────────────────────────────────────────

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    ry.set(((e.clientX - cx) / rect.width) * 10);
    rx.set(-((e.clientY - cy) / rect.height) * 8);
  };

  const onLeave = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Feature card — tilt + cursor spotlight + preview zoom ───────────────────

function FeatureCard({ children, preview, className }: {
  children: React.ReactNode;
  preview: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 22 });
  const sry = useSpring(ry, { stiffness: 200, damping: 22 });
  const [spot, setSpot] = useState({ x: 0, y: 0, on: false });
  const [hovered, setHovered] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    ry.set(((e.clientX - cx) / rect.width) * 9);
    rx.set(-((e.clientY - cy) / rect.height) * 7);
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top, on: true });
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    setSpot((s) => ({ ...s, on: false }));
    setHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onHoverStart={() => setHovered(true)}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className={`group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className ?? ''}`}
    >
      {/* Cursor spotlight */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-3xl transition-opacity duration-500"
        style={{
          opacity: spot.on ? 1 : 0,
          background: `radial-gradient(280px circle at ${spot.x}px ${spot.y}px, rgba(201,160,32,0.10), transparent 70%)`,
        }}
      />

      {/* Hover border glow */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-3xl transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          boxShadow: 'inset 0 0 0 1px rgba(201,160,32,0.35)',
        }}
      />

      {/* Preview — zooms on hover */}
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-slate-50 px-4 dark:bg-slate-800/60">
        <motion.div
          className="w-full"
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.4, ease }}
        >
          {preview}
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-white dark:from-slate-900" />
      </div>

      {/* Text */}
      <div className="relative z-10 p-6">
        {children}
      </div>
    </motion.div>
  );
}

// ─── Feature card visual previews ────────────────────────────────────────────

function MushafPreview() {
  const rows = 9;
  const cols = 12;
  const palette = ['#34d399', '#34d399', '#34d399', '#fbbf24', '#f87171', '#cbd5e1', '#cbd5e1', '#cbd5e1'];
  const seed = (r: number, c: number) => palette[(r * 7 + c * 3) % palette.length];
  return (
    <div className="flex flex-col gap-1 p-1">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-1">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3.5 flex-1 rounded-sm" style={{ background: seed(r, c), opacity: 0.85 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RingsPreview() {
  const rings = [
    { r: 46, pct: 0.78, color: '#34d399' },
    { r: 34, pct: 0.52, color: '#c9a020' },
    { r: 22, pct: 0.33, color: '#f87171' },
  ];
  return (
    <svg viewBox="0 0 110 110" className="mx-auto h-28 w-28">
      {rings.map(({ r, pct, color }) => {
        const circ = 2 * Math.PI * r;
        return (
          <g key={r}>
            <circle cx={55} cy={55} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
            <circle
              cx={55} cy={55} r={r} fill="none"
              stroke={color} strokeWidth={6}
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
              strokeLinecap="round"
              transform="rotate(-90 55 55)"
            />
          </g>
        );
      })}
      <text x={55} y={60} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1e293b">78%</text>
    </svg>
  );
}

function JournalPreview() {
  const lines = [
    { w: '90%', h: 8, accent: false },
    { w: '75%', h: 8, accent: false },
    { w: '55%', h: 8, accent: true },
    { w: '80%', h: 8, accent: false },
    { w: '40%', h: 8, accent: false },
  ];
  return (
    <div className="space-y-2.5 px-2 pt-2">
      <div className="mb-3 text-xs font-semibold text-slate-400">Today&apos;s reflection</div>
      {lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="rounded"
            style={{
              width: l.w, height: l.h,
              background: l.accent ? goldGradientBg : '#e2e8f0',
              opacity: l.accent ? 1 : 0.7,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function HeatmapPreview() {
  const weeks = 13;
  const days = 7;
  const getOpacity = (w: number, d: number) => {
    const v = Math.sin(w * 1.7 + d * 2.3) * 0.5 + 0.5;
    if (v < 0.25) return 0.08;
    if (v < 0.5) return 0.3;
    if (v < 0.75) return 0.6;
    return 1;
  };
  return (
    <div className="flex gap-1 px-1">
      {Array.from({ length: weeks }).map((_, w) => (
        <div key={w} className="flex flex-col gap-1">
          {Array.from({ length: days }).map((_, d) => (
            <div
              key={d}
              className="h-3 w-3 rounded-sm"
              style={{ background: '#34d399', opacity: getOpacity(w, d) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function FridayPreview() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div className="flex gap-1.5 items-end justify-center pt-2">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
              i === 4
                ? 'text-slate-950 shadow-md'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
            style={i === 4 ? { background: goldGradientBg } : {}}
          >
            {d}
          </div>
          <div className={`h-1 w-1 rounded-full ${i < 4 ? 'bg-emerald-400' : 'bg-transparent'}`} />
        </div>
      ))}
    </div>
  );
}

function ChecklistPreview() {
  const items = [
    { label: 'Memorization', done: true },
    { label: 'Reflection', done: true },
    { label: 'Understanding', done: false },
  ];
  return (
    <div className="space-y-2.5 px-2 pt-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
              item.done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {item.done && (
              <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className={`text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300'}`}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Feature data ─────────────────────────────────────────────────────────────

const features = [
  {
    title: 'Mushaf Map',
    desc: 'All 114 Surahs laid out visually, color-coded by status. See your whole Quran at a glance.',
    preview: <MushafPreview />,
    link: '/map',
  },
  {
    title: 'Progress Rings',
    desc: "Completion rings across all 30 Juz. Know exactly where you stand in your journey.",
    preview: <RingsPreview />,
    link: '/dashboard',
  },
  {
    title: 'Journal',
    desc: "Log your sessions, set weekly intentions, and write reflections on the verses you're memorizing.",
    preview: <JournalPreview />,
    link: '/journal',
  },
  {
    title: 'Activity Heatmap',
    desc: "Your memorization history as a heatmap — every day you show up gets marked.",
    preview: <HeatmapPreview />,
    link: '/dashboard',
  },
  {
    title: 'Friday Reset',
    desc: "Every Friday is for review only. Solidify what you have before moving forward.",
    preview: <FridayPreview />,
    link: '/dashboard',
  },
  {
    title: 'Daily Checklist',
    desc: "A clean daily checklist keeps the habit simple. Check it off and know you did your part.",
    preview: <ChecklistPreview />,
    link: '/dashboard',
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────────

const stats = [
  { number: 114, suffix: '', label: 'Surahs', sub: 'all tracked visually' },
  { number: 30, suffix: '', label: 'Juz', sub: 'one progress ring per Juz' },
  { number: 52, suffix: '', label: 'Fridays', sub: 'dedicated review days a year' },
];

// ─── Route → readable name ────────────────────────────────────────────────────

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/map':       'Mushaf Map',
  '/journal':   'Journal',
  '/profile':   'Profile',
};

// ─── Page (inner — needs useSearchParams) ────────────────────────────────────

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Freeze the initial value — router.replace() clears searchParams reactively,
  // which would make the message vanish before the user reads it.
  const [redirectFrom] = useState(() => searchParams.get('from') ?? '');
  const pageName = PAGE_NAMES[redirectFrom] ?? 'that page';

  // Clear the ?from param from the URL so it's gone on refresh
  useEffect(() => {
    if (redirectFrom) router.replace('/', { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // undefined = still resolving auth; null = signed out; User = signed in
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const callbackUrl = (next?: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  const signIn = (next?: string) =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl(next) },
    });

  const redirectBadge = redirectFrom && user === null && (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-300"
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden>
        <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z" clipRule="evenodd" />
      </svg>
      Sign in to open your <span className="font-semibold">{pageName}</span>
    </motion.div>
  );

  const heroCta =
    user === undefined ? (
      <div className="h-[52px] w-44 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
    ) : user ? (
      <GoldButton href="/dashboard">Open Dashboard</GoldButton>
    ) : (
      <div className="flex flex-col items-start gap-3">
        {redirectBadge}
        <GoldButton onClick={() => signIn(redirectFrom || undefined)}>
          Sign in with Google
        </GoldButton>
      </div>
    );

  return (
    <div className="relative w-full overflow-x-hidden">


      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-400 px-6 pt-16 pb-10 lg:px-16 lg:pt-24 lg:pb-14">
        <motion.div variants={stagger(0.12)} initial="hidden" animate="show">

          <motion.div
            variants={fadeUp}
            style={{ fontFamily: 'var(--font-display), serif' }}
            className="text-4xl font-semibold text-slate-950 dark:text-white md:text-5xl"
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-10 text-[clamp(2.8rem,6vw,5.5rem)] font-semibold leading-[1.08] tracking-tight text-slate-900 dark:text-white"
          >
            Your Quran memorization,
            <br />
            <motion.span
              style={goldGradientText}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease }}
            >
              tracked with intention.
            </motion.span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-7 max-w-2xl text-lg leading-8 text-slate-500 dark:text-slate-400"
          >
            A personal dashboard for your Hifdh journey — keep a daily log, visualize your progress across all 114 Surahs, and never lose track of where you are.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10">
            {heroCta}
          </motion.div>
        </motion.div>
      </section>

      <Divider />

      {/* ── Stats ─────────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-400 px-6 pt-10 pb-20 lg:px-16 lg:pt-14 lg:pb-28">
        <motion.div
          variants={stagger(0.14)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: '-80px' }}
          className="grid gap-5 sm:grid-cols-3"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              variants={i === 0 ? fadeLeft : i === 2 ? fadeRight : scaleIn}
            >
              <TiltCard className="rounded-[1.75rem] border border-slate-200/80 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[5rem] font-bold leading-none tracking-tighter" style={goldGradientText}>
                  <CountUp to={s.number} suffix={s.suffix} />
                </div>
                <div className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">{s.label}</div>
                <div className="mt-1 text-sm text-slate-400 dark:text-slate-500">{s.sub}</div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <Divider />

      {/* ── Friday Reset banner ───────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-400 px-6 py-20 lg:px-16 lg:py-28">
        <motion.div
          variants={fadeLeft}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: '-60px' }}
          className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex lg:items-center lg:gap-20 lg:p-14"
        >
          <div
            aria-hidden
            style={{ fontFamily: 'var(--font-display), serif' }}
            className="pointer-events-none absolute -right-6 -top-8 select-none text-[9rem] leading-none text-slate-100 dark:text-slate-800"
          >
            الجمعة
          </div>

          <div className="relative shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
              Every Friday
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white lg:text-4xl">
              The Friday Reset
            </h2>
          </div>

          <p className="relative mt-6 text-base leading-7 text-slate-500 dark:text-slate-400 lg:mt-0">
            Every Friday is for review — no new memorization. Go back to the Surahs you already know, especially the weaker ones. The goal is not speed, it is permanence. One day of consolidation each week keeps the entire Quran alive in your memory.
          </p>
        </motion.div>
      </section>

      <Divider />

      {/* ── Feature grid ──────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-400 px-6 py-20 lg:px-16 lg:py-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
            Everything you need
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white lg:text-4xl">
            Built for the long journey.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: '-60px' }}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f, i) => {
            const dir = i % 3 === 0 ? fadeLeft : i % 3 === 2 ? fadeRight : fadeUp;
            return (
              <motion.div key={f.title} variants={dir} className="h-full">
                <FeatureCard preview={f.preview}>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">{f.desc}</p>
                </FeatureCard>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-400 px-6 pb-32 lg:px-16">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: '-60px' }}
          className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-10 py-20 text-center dark:bg-slate-900 dark:ring-1 dark:ring-slate-800"
        >
          {/* Gold radial glow */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-60 w-[32rem] rounded-full opacity-25 blur-3xl"
            style={{ background: 'radial-gradient(circle, #c9a020, transparent 70%)' }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* حفظ watermark */}
          <svg
            aria-hidden
            viewBox="0 0 1000 300"
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full select-none"
          >
            <text
              x="0"
              y="230"
              style={{ fontFamily: 'var(--font-display), serif' }}
              fill="rgba(255,255,255,0.04)"
              fontSize="300"
              textLength="1000"
              lengthAdjust="spacingAndGlyphs"
            >
              حفظ
            </text>
          </svg>

          <div className="relative">
            <div
              style={{ fontFamily: 'var(--font-display), serif' }}
              className="text-3xl text-white/25"
            >
              بِإِذْنِ اللَّهِ
            </div>

            <motion.h2
              className="mt-6 text-4xl font-semibold leading-tight lg:text-5xl"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.7, ease }}
            >
              <span style={goldGradientText}>The best time to start</span>
              <br />
              <span className="text-white">was yesterday.</span>
            </motion.h2>

            <motion.p
              className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-400"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              The second best time is now. Sign in and begin — your progress, your journal, your Quran map, all in one place.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {user === undefined ? (
                <div className="h-[52px] w-48 animate-pulse rounded-full bg-white/10" />
              ) : user ? (
                <GoldButton href="/dashboard" dark>Open Dashboard</GoldButton>
              ) : (
                <>
                  <GoldButton dark onClick={() => signIn(redirectFrom || undefined)}>
                    Sign in with Google
                  </GoldButton>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
