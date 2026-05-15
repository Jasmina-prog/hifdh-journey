'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { IslamicPattern } from '@/components/IslamicPattern';
import { MonthlyTasks } from '@/components/MonthlyTasks';
import { WeeklyNiyyah } from '@/components/WeeklyNiyyah';

// ─── Constants ───────────────────────────────────────────────────────────────

const SURAH_NAMES: string[] = [
  'Al-Fatihah', 'Al-Baqarah', "Ali 'Imran", "An-Nisa'", "Al-Ma'idah",
  "Al-An'am", "Al-A'raf", 'Al-Anfal', 'At-Tawbah', 'Yunus',
  'Hud', 'Yusuf', "Ar-Ra'd", 'Ibrahim', 'Al-Hijr', 'An-Nahl', "Al-Isra'",
  'Al-Kahf', 'Maryam', 'Ta-Ha', "Al-Anbiya'", 'Al-Hajj', "Al-Mu'minun",
  'An-Nur', 'Al-Furqan', "Ash-Shu'ara'", 'An-Naml', 'Al-Qasas',
  "Al-'Ankabut", 'Ar-Rum', 'Luqman', 'As-Sajdah', 'Al-Ahzab', "Saba'",
  'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir',
  'Fussilat', 'Ash-Shura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah',
  'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
  'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman',
  "Al-Waqi'ah", 'Al-Hadid', 'Al-Mujadilah', 'Al-Hashr', 'Al-Mumtahanah',
  'As-Saff', "Al-Jumu'ah", 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq',
  'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', "Al-Ma'arij",
  'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah',
  'Al-Insan', 'Al-Mursalat', "An-Naba'", "An-Nazi'at", 'Abasa',
  'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj',
  'At-Tariq', "Al-A'la", 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad',
  'Ash-Shams', 'Al-Lail', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', "Al-'Alaq",
  'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', "Al-'Adiyat", "Al-Qari'ah",
  'At-Takathur', "Al-'Asr", 'Al-Humazah', 'Al-Fil', 'Quraysh',
  "Al-Ma'un", 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr', 'Al-Masad',
  'Al-Ikhlas', 'Al-Falaq', 'An-Nas',
];

// ─── Types ───────────────────────────────────────────────────────────────────

type Tag = 'tadabbur' | 'milestone' | 'struggle' | 'breakthrough';

type JournalEntry = {
  id: string;
  surah_number: number | null;
  ayah_number: number | null;
  content: string;
  tag: Tag;
  pinned: boolean;
  created_at: string;
};

type VocabWord = {
  id: string;
  word: string;
  root: string;
  meaning: string;
  found_in: string;
  created_at: string;
};

type Milestone = {
  id: string;
  text: string;
  emoji: string;
  type: 'auto' | 'manual';
  created_at: string;
};

// ─── Utility helpers ─────────────────────────────────────────────────────────

function parseSurahInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= 114) return num;
  const idx = SURAH_NAMES.findIndex(
    (n) => n.toLowerCase() === trimmed.toLowerCase()
  );
  return idx >= 0 ? idx + 1 : null;
}

function surahLabel(n: number | null): string {
  if (!n) return '';
  return `${SURAH_NAMES[n - 1]}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function yearsAgo(iso: string) {
  const then = new Date(iso).getFullYear();
  const now = new Date().getFullYear();
  const diff = now - then;
  if (diff === 1) return 'One year ago today';
  return `${diff} years ago today`;
}

function isSameDayPastYear(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate() &&
    d.getFullYear() < today.getFullYear()
  );
}

// ─── Shared UI pieces ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
      {children}
    </p>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4">
      <hr className="flex-1 border-slate-100 dark:border-slate-800/60" />
      <span className="text-xs text-slate-300 dark:text-slate-700">✦</span>
      <hr className="flex-1 border-slate-100 dark:border-slate-800/60" />
    </div>
  );
}

const TAG_STYLES: Record<Tag, string> = {
  tadabbur:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  milestone:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  struggle:    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
  breakthrough:'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800',
};

function TagBadge({ tag }: { tag: Tag }) {
  const labels: Record<Tag, string> = {
    tadabbur: 'Tadabbur', milestone: 'Milestone',
    struggle: 'Struggle', breakthrough: 'Breakthrough',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TAG_STYLES[tag]}`}>
      {labels[tag]}
    </span>
  );
}

type CollapsibleProps = {
  label: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function Collapsible({ label, badge, defaultOpen = false, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <SectionLabel>{label}</SectionLabel>
          {badge !== undefined && (
            <span className="-mt-3 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {badge}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="-mt-3 text-slate-400 dark:text-slate-600"
        >
          ↓
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Entry Card ──────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onPin,
  onDelete,
}: {
  entry: JournalEntry;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = entry.content.length > 220;
  const displayContent =
    isLong && !expanded ? entry.content.slice(0, 220) + '…' : entry.content;

  return (
    <div className="group relative rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Header row */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {entry.surah_number && (
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {surahLabel(entry.surah_number)}
              {entry.ayah_number ? ` · Ayah ${entry.ayah_number}` : ''}
            </span>
          )}
          <TagBadge tag={entry.tag} />
        </div>
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {formatDate(entry.created_at)}
        </span>
      </div>

      {/* Content */}
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
        {displayContent}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Footer actions */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onPin(entry.id)}
          title={entry.pinned ? 'Unpin' : 'Pin this entry'}
          className={`flex items-center gap-1.5 text-xs transition ${
            entry.pinned
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-slate-300 hover:text-amber-400 dark:text-slate-700 dark:hover:text-amber-500'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill={entry.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {entry.pinned ? 'Pinned' : 'Pin'}
        </button>

        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="text-xs text-slate-200 opacity-0 transition hover:text-red-400 group-hover:opacity-100 dark:text-slate-700 dark:hover:text-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Entry Form ──────────────────────────────────────────────────────────────

type EntryFormProps = {
  onSave: (entry: Omit<JournalEntry, 'id' | 'created_at' | 'pinned'>) => Promise<void>;
};

function EntryForm({ onSave }: EntryFormProps) {
  const [surahInput, setSurahInput] = useState('');
  const [ayahInput, setAyahInput] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<Tag>('tadabbur');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const TAGS: { value: Tag; label: string }[] = [
    { value: 'tadabbur', label: 'Tadabbur' },
    { value: 'milestone', label: 'Milestone' },
    { value: 'struggle', label: 'Struggle' },
    { value: 'breakthrough', label: 'Breakthrough' },
  ];

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    const surahNum = parseSurahInput(surahInput);
    const ayahNum = ayahInput.trim() ? parseInt(ayahInput, 10) : null;
    await onSave({
      surah_number: surahNum,
      ayah_number: isNaN(ayahNum as number) ? null : ayahNum,
      content: content.trim(),
      tag,
    });
    setSurahInput('');
    setAyahInput('');
    setContent('');
    setTag('tadabbur');
    setSaving(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <SectionLabel>Write a new entry</SectionLabel>

      {/* Surah + Ayah row */}
      <div className="mb-3 flex gap-3">
        <div className="flex-1">
          <input
            list="surah-list"
            value={surahInput}
            onChange={(e) => setSurahInput(e.target.value)}
            placeholder="Which Surah? (name or number)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-500"
          />
          <datalist id="surah-list">
            {SURAH_NAMES.map((name, i) => (
              <option key={i} value={name} />
            ))}
          </datalist>
        </div>
        <input
          type="number"
          min={1}
          value={ayahInput}
          onChange={(e) => setAyahInput(e.target.value)}
          placeholder="Ayah #"
          className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-500"
        />
      </div>

      {/* Content */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave();
        }}
        rows={4}
        placeholder="What's on your heart today?"
        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-300 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-slate-500"
      />

      {/* Tag row + save */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <label key={t.value} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="entry-tag"
                value={t.value}
                checked={tag === t.value}
                onChange={() => setTag(t.value)}
                className="sr-only"
              />
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-medium transition ${
                  tag === t.value
                    ? TAG_STYLES[t.value]
                    : 'border-slate-200 text-slate-400 hover:border-slate-300 dark:border-slate-700 dark:text-slate-600'
                }`}
              >
                {t.label}
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!content.trim() || saving}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
        >
          {saving ? 'Saving…' : 'Save quietly'}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-300 dark:text-slate-700">
        ⌘ + Enter to save
      </p>
    </div>
  );
}

// ─── Vocab Bank ──────────────────────────────────────────────────────────────

function VocabBank({
  words,
  onAdd,
  onDelete,
}: {
  words: VocabWord[];
  onAdd: (w: Omit<VocabWord, 'id' | 'created_at'>) => void;
  onDelete: (id: string) => void;
}) {
  const [word, setWord] = useState('');
  const [root, setRoot] = useState('');
  const [meaning, setMeaning] = useState('');
  const [foundIn, setFoundIn] = useState('');

  function handleAdd() {
    if (!word.trim() || !meaning.trim()) return;
    onAdd({ word: word.trim(), root: root.trim(), meaning: meaning.trim(), found_in: foundIn.trim() });
    setWord(''); setRoot(''); setMeaning(''); setFoundIn('');
  }

  return (
    <div className="mt-4 space-y-4">
      {words.length > 0 && (
        <div className="space-y-2">
          {words.map((w) => (
            <div key={w.id} className="group flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p dir="rtl" className="font-arabic text-xl text-slate-900 dark:text-slate-100">{w.word}</p>
                {w.root && (
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Root: {w.root}</p>
                )}
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{w.meaning}</p>
                {w.found_in && (
                  <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-500">Found in: {w.found_in}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDelete(w.id)}
                className="shrink-0 text-xs text-slate-200 opacity-0 transition hover:text-red-400 group-hover:opacity-100 dark:text-slate-700 dark:hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {words.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-300 dark:text-slate-700">
          Words you encounter during memorisation will live here.
        </p>
      )}

      {/* Add form */}
      <div className="rounded-xl border border-dashed border-slate-200 p-4 dark:border-slate-800">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Arabic word"
            dir="rtl"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-arabic text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
          <input
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            placeholder="Root letters (optional)"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
          <input
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="Meaning"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
          <input
            value={foundIn}
            onChange={(e) => setFoundIn(e.target.value)}
            placeholder="Found in (e.g. Al-Baqarah 2:219)"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!word.trim() || !meaning.trim()}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
          >
            Add word
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Milestone Log ───────────────────────────────────────────────────────────

const MILESTONE_EMOJIS = ['🎉', '✨', '🤲', '📖', '🌟', '💫', '🏆', '🌙'];

function MilestoneLog({
  milestones,
  onAdd,
  onDelete,
}: {
  milestones: Milestone[];
  onAdd: (text: string, emoji: string) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState('✨');

  function handleAdd() {
    if (!text.trim()) return;
    onAdd(text.trim(), emoji);
    setText('');
  }

  return (
    <div className="mt-4 space-y-4">
      {milestones.length > 0 && (
        <ul className="space-y-2">
          {milestones.map((m) => (
            <li key={m.id} className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-lg leading-none">{m.emoji}</span>
              <div className="flex-1">
                <p className="text-sm text-slate-800 dark:text-slate-200">{m.text}</p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {formatDate(m.created_at)}
                  {m.type === 'auto' && (
                    <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">auto</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(m.id)}
                className="shrink-0 text-xs text-slate-200 opacity-0 transition hover:text-red-400 group-hover:opacity-100 dark:text-slate-700 dark:hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {milestones.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-300 dark:text-slate-700">
          Your milestones — big and small — will live here.
        </p>
      )}

      {/* Add form */}
      <div className="flex gap-2">
        <div className="relative">
          <select
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="h-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-base outline-none dark:border-slate-700 dark:bg-slate-800"
          >
            {MILESTONE_EMOJIS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Record a milestone…"
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!text.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [userId, setUserId] = useState<string | null>(null);

  // Entries state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<Tag | 'all'>('all');

  // ── Storage helpers ──────────────────────────────────────────────────────

  function entriesKey(uid: string) { return `hifdh-journal-${uid}`; }
  function vocabKey(uid: string) { return `hifdh-vocab-${uid}`; }
  function milestonesKey(uid: string) { return `hifdh-milestones-${uid}`; }

  function readLocal<T>(key: string): T[] {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }
  function writeLocal<T>(key: string, data: T[]) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id ?? null;
      setUserId(uid);

      if (!uid) return;

      // Load from localStorage instantly
      setEntries(readLocal<JournalEntry>(entriesKey(uid)));
      setVocab(readLocal<VocabWord>(vocabKey(uid)));
      setMilestones(readLocal<Milestone>(milestonesKey(uid)));

      // Sync from Supabase
      Promise.all([
        supabase.from('journal_entries').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('vocab_words').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('journal_milestones').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ]).then(([e, v, m]) => {
        if (e.data && e.data.length > 0) {
          setEntries(e.data as JournalEntry[]);
          writeLocal(entriesKey(uid), e.data);
        }
        if (v.data && v.data.length > 0) {
          setVocab(v.data as VocabWord[]);
          writeLocal(vocabKey(uid), v.data);
        }
        if (m.data && m.data.length > 0) {
          setMilestones(m.data as Milestone[]);
          writeLocal(milestonesKey(uid), m.data);
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Entry handlers ────────────────────────────────────────────────────────

  async function addEntry(e: Omit<JournalEntry, 'id' | 'created_at' | 'pinned'>) {
    const tempId = `local-${Date.now()}`;
    const newEntry: JournalEntry = {
      ...e, id: tempId, pinned: false, created_at: new Date().toISOString(),
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    if (userId) writeLocal(entriesKey(userId), updated);

    if (userId) {
      const { data } = await supabase
        .from('journal_entries')
        .insert({ user_id: userId, ...e, pinned: false })
        .select('*')
        .single();
      if (data) {
        setEntries((prev) => prev.map((x) => (x.id === tempId ? data as JournalEntry : x)));
        if (userId) writeLocal(entriesKey(userId), entries.map((x) => (x.id === tempId ? data as JournalEntry : x)));
      }
    }
  }

  async function togglePin(id: string) {
    const updated = entries.map((e) => e.id === id ? { ...e, pinned: !e.pinned } : e);
    setEntries(updated);
    if (userId) writeLocal(entriesKey(userId), updated);
    const entry = entries.find((e) => e.id === id);
    if (userId && entry && !id.startsWith('local-')) {
      await supabase.from('journal_entries').update({ pinned: !entry.pinned }).eq('id', id);
    }
  }

  async function deleteEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    if (userId) writeLocal(entriesKey(userId), updated);
    if (userId && !id.startsWith('local-')) {
      await supabase.from('journal_entries').delete().eq('id', id);
    }
  }

  // ── Vocab handlers ────────────────────────────────────────────────────────

  async function addVocab(w: Omit<VocabWord, 'id' | 'created_at'>) {
    const tempId = `local-${Date.now()}`;
    const newWord: VocabWord = { ...w, id: tempId, created_at: new Date().toISOString() };
    const updated = [newWord, ...vocab];
    setVocab(updated);
    if (userId) writeLocal(vocabKey(userId), updated);

    if (userId) {
      const { data } = await supabase
        .from('vocab_words')
        .insert({ user_id: userId, ...w })
        .select('*')
        .single();
      if (data) setVocab((prev) => prev.map((x) => (x.id === tempId ? data as VocabWord : x)));
    }
  }

  async function deleteVocab(id: string) {
    const updated = vocab.filter((w) => w.id !== id);
    setVocab(updated);
    if (userId) writeLocal(vocabKey(userId), updated);
    if (userId && !id.startsWith('local-')) {
      await supabase.from('vocab_words').delete().eq('id', id);
    }
  }

  // ── Milestone handlers ────────────────────────────────────────────────────

  async function addMilestone(text: string, emoji: string) {
    const tempId = `local-${Date.now()}`;
    const newM: Milestone = { id: tempId, text, emoji, type: 'manual', created_at: new Date().toISOString() };
    const updated = [newM, ...milestones];
    setMilestones(updated);
    if (userId) writeLocal(milestonesKey(userId), updated);

    if (userId) {
      const { data } = await supabase
        .from('journal_milestones')
        .insert({ user_id: userId, text, emoji, type: 'manual' })
        .select('*')
        .single();
      if (data) setMilestones((prev) => prev.map((x) => (x.id === tempId ? data as Milestone : x)));
    }
  }

  async function deleteMilestone(id: string) {
    const updated = milestones.filter((m) => m.id !== id);
    setMilestones(updated);
    if (userId) writeLocal(milestonesKey(userId), updated);
    if (userId && !id.startsWith('local-')) {
      await supabase.from('journal_milestones').delete().eq('id', id);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const pinnedEntries = entries.filter((e) => e.pinned);

  const onThisDay = entries.find((e) => isSameDayPastYear(e.created_at));

  const filteredEntries = entries.filter((e) => {
    const matchesTag = filterTag === 'all' || e.tag === filterTag;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      e.content.toLowerCase().includes(q) ||
      (e.surah_number ? surahLabel(e.surah_number).toLowerCase().includes(q) : false);
    return matchesTag && matchesSearch;
  });

  const isEmpty = entries.length === 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <IslamicPattern />

      <div className="relative mx-auto w-full max-w-400 px-6 py-10 lg:px-16 lg:py-14">
        <div className="space-y-12">

          {/* ── Page heading ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
              Private · Spiritual
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
              My Journal
            </h1>
            <p className="mt-2 text-base text-slate-400 dark:text-slate-500">
              Reflections, intentions, and milestones on your hifdh journey.
            </p>
          </motion.div>

          <Divider />

          {/* ── 1. Monthly Goals (collapsible) ───────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Collapsible label="Monthly Goals" badge={undefined} defaultOpen>
              <div className="mt-2">
                <MonthlyTasks userId={userId} />
              </div>
            </Collapsible>
          </motion.section>

          <Divider />

          {/* ── 2. Weekly niyyah ─────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <WeeklyNiyyah userId={userId} />
          </motion.section>

          <Divider />

          {/* ── 3. On this day (conditional) ─────────────────────────────── */}
          {onThisDay && (
            <>
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <p className="mb-3 text-xs font-semibold text-amber-600 dark:text-amber-500">
                    📖 {yearsAgo(onThisDay.created_at)}
                  </p>
                  <p className="text-sm leading-7 text-slate-700 dark:text-slate-300 line-clamp-4">
                    {onThisDay.content}
                  </p>
                  {onThisDay.surah_number && (
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                      {surahLabel(onThisDay.surah_number)}
                      {onThisDay.ayah_number ? ` · Ayah ${onThisDay.ayah_number}` : ''}
                    </p>
                  )}
                </div>
              </motion.section>
              <Divider />
            </>
          )}

          {/* ── 4. Pinned entries (conditional) ──────────────────────────── */}
          {pinnedEntries.length > 0 && (
            <>
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <SectionLabel>Pinned</SectionLabel>
                <div className="space-y-3">
                  {pinnedEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onPin={togglePin}
                      onDelete={deleteEntry}
                    />
                  ))}
                </div>
              </motion.section>
              <Divider />
            </>
          )}

          {/* ── 5. Write new entry (always visible) ──────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
          >
            <EntryForm onSave={addEntry} />
          </motion.section>

          <Divider />

          {/* ── 6. Past entries ───────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {isEmpty ? (
              /* Empty state */
              <div className="rounded-3xl border border-slate-100 bg-white/60 px-8 py-14 text-center dark:border-slate-800/60 dark:bg-slate-900/40">
                <p className="font-arabic text-2xl leading-[3rem] text-emerald-700 dark:text-emerald-500" dir="rtl">
                  خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
                </p>
                <p className="mt-2 text-sm italic text-slate-400 dark:text-slate-500">
                  "The best of you are those who learn the Quran and teach it."
                </p>
                <p className="mt-1 text-xs text-slate-300 dark:text-slate-700">
                  — Prophet Muhammad ﷺ
                </p>
                <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">
                  Your journey begins with one reflection.
                </p>
              </div>
            ) : (
              <>
                {/* Search + filter bar */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[180px]">
                    <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search entries…"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-300 transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'tadabbur', 'milestone', 'struggle', 'breakthrough'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFilterTag(t)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          filterTag === t
                            ? t === 'all'
                              ? 'border-slate-400 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                              : TAG_STYLES[t as Tag]
                            : 'border-slate-200 text-slate-400 hover:border-slate-300 dark:border-slate-700 dark:text-slate-600'
                        }`}
                      >
                        {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredEntries.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-300 dark:text-slate-700">
                    No entries match your search.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {filteredEntries.map((entry) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.2 }}
                        >
                          <EntryCard
                            entry={entry}
                            onPin={togglePin}
                            onDelete={deleteEntry}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </motion.section>

          <Divider />

          {/* ── 7. Vocabulary bank (collapsible) ─────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
          >
            <Collapsible label="Vocabulary Bank" badge={vocab.length || undefined}>
              <VocabBank words={vocab} onAdd={addVocab} onDelete={deleteVocab} />
            </Collapsible>
          </motion.section>

          <Divider />

          {/* ── 8. Milestone log (collapsible) ───────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Collapsible label="Milestone Log" badge={milestones.length || undefined}>
              <MilestoneLog milestones={milestones} onAdd={addMilestone} onDelete={deleteMilestone} />
            </Collapsible>
          </motion.section>

        </div>
      </div>
    </div>
  );
}
