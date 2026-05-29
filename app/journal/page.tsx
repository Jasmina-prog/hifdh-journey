'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { IslamicPattern } from '@/components/IslamicPattern';

// ─── Constants ────────────────────────────────────────────────────────────────

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

const MILESTONE_EMOJIS = ['✨', '🎉', '🤲', '📖', '🌟', '💫', '🏆', '🌙'];

// ─── Types ────────────────────────────────────────────────────────────────────

type Tag = 'tadabbur' | 'milestone' | 'struggle' | 'breakthrough';
type ActiveTab = 'entries' | 'vocab' | 'milestones';

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

// ─── Tag config ───────────────────────────────────────────────────────────────

const TAG_CONFIG: Record<Tag, {
  label: string;
  pill: string;
  leftBorder: string;
  activePill: string;
}> = {
  tadabbur:    {
    label: 'Tadabbur',
    pill: 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-500',
    leftBorder: 'border-l-emerald-400 dark:border-l-emerald-600',
    activePill: 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  milestone: {
    label: 'Milestone',
    pill: 'border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700 dark:border-slate-700 dark:text-slate-500',
    leftBorder: 'border-l-amber-400 dark:border-l-amber-600',
    activePill: 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
  },
  struggle: {
    label: 'Struggle',
    pill: 'border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:text-slate-500',
    leftBorder: 'border-l-rose-400 dark:border-l-rose-600',
    activePill: 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  },
  breakthrough: {
    label: 'Breakthrough',
    pill: 'border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:text-slate-500',
    leftBorder: 'border-l-sky-400 dark:border-l-sky-600',
    activePill: 'border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSurahInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= 114) return num;
  const idx = SURAH_NAMES.findIndex((n) => n.toLowerCase() === trimmed.toLowerCase());
  return idx >= 0 ? idx + 1 : null;
}

function surahLabel(n: number): string {
  return SURAH_NAMES[n - 1] ?? `Surah ${n}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function isSameDayPastYear(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate() && d.getFullYear() < today.getFullYear();
}

function thisWeekCount(entries: JournalEntry[]): number {
  const cutoff = Date.now() - 7 * 86400000;
  return entries.filter((e) => new Date(e.created_at).getTime() > cutoff).length;
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, onPin, onDelete, onEdit }: {
  entry: JournalEntry;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, patch: Pick<JournalEntry, 'content' | 'tag' | 'surah_number' | 'ayah_number'>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [editTag, setEditTag] = useState<Tag>(entry.tag);
  const [editSurah, setEditSurah] = useState(entry.surah_number ? String(entry.surah_number) : '');
  const [editAyah, setEditAyah] = useState(entry.ayah_number ? String(entry.ayah_number) : '');
  const [saving, setSaving] = useState(false);

  const cfg = TAG_CONFIG[entry.tag];
  const isLong = entry.content.length > 240;
  const displayContent = isLong && !expanded ? entry.content.slice(0, 240) + '…' : entry.content;

  function startEdit() {
    setEditContent(entry.content);
    setEditTag(entry.tag);
    setEditSurah(entry.surah_number ? String(entry.surah_number) : '');
    setEditAyah(entry.ayah_number ? String(entry.ayah_number) : '');
    setEditing(true);
  }

  async function saveEdit() {
    if (!editContent.trim()) return;
    setSaving(true);
    const surahNum = parseSurahInput(editSurah);
    const ayahNum = editAyah.trim() ? parseInt(editAyah, 10) : null;
    await onEdit(entry.id, {
      content: editContent.trim(),
      tag: editTag,
      surah_number: surahNum,
      ayah_number: isNaN(ayahNum as number) ? null : ayahNum,
    });
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className={`rounded-xl border border-slate-200 border-l-4 ${cfg.leftBorder} bg-white px-4 py-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900`}>
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <input
              list="surah-datalist-edit"
              value={editSurah}
              onChange={(e) => setEditSurah(e.target.value)}
              placeholder="Surah (optional)"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
            />
            <datalist id="surah-datalist-edit">
              {SURAH_NAMES.map((name, i) => <option key={i} value={name} />)}
            </datalist>
          </div>
          <input
            type="number" min={1}
            value={editAyah}
            onChange={(e) => setEditAyah(e.target.value)}
            placeholder="Ayah #"
            className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(TAG_CONFIG) as Tag[]).map((t) => (
            <button key={t} type="button" onClick={() => setEditTag(t)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${editTag === t ? TAG_CONFIG[t].activePill : TAG_CONFIG[t].pill}`}>
              {TAG_CONFIG[t].label}
            </button>
          ))}
        </div>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-7 text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="button" onClick={saveEdit} disabled={!editContent.trim() || saving}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative rounded-xl border border-slate-100 border-l-4 ${cfg.leftBorder} bg-white px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80`}>
      {/* Row 1: meta + date */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {entry.surah_number && (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {surahLabel(entry.surah_number)}
              {entry.ayah_number ? <span className="font-normal text-slate-500"> · Ayah {entry.ayah_number}</span> : null}
            </span>
          )}
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${cfg.activePill}`}>
            {cfg.label}
          </span>
          {entry.pinned && (
            <span className="text-[11px] text-amber-500">📌 Pinned</span>
          )}
        </div>
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatDate(entry.created_at)}</span>
      </div>

      {/* Content */}
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">{displayContent}</p>
      {isLong && (
        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2.5 dark:border-slate-800">
        <button type="button" onClick={() => onPin(entry.id)}
          className={`flex items-center gap-1 text-xs font-medium transition ${
            entry.pinned
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-slate-300 hover:text-amber-500 dark:text-slate-700 dark:hover:text-amber-400'
          }`}>
          <svg className="h-3.5 w-3.5" fill={entry.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {entry.pinned ? 'Pinned' : 'Pin'}
        </button>
        <div className="flex items-center gap-3 opacity-0 transition group-hover:opacity-100">
          <button type="button" onClick={startEdit}
            className="text-xs text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300">
            Edit
          </button>
          <button type="button" onClick={() => onDelete(entry.id)}
            className="text-xs text-slate-300 hover:text-red-500 dark:text-slate-700 dark:hover:text-red-400">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Write Form ───────────────────────────────────────────────────────────────

function WriteForm({ onSave }: {
  onSave: (e: Omit<JournalEntry, 'id' | 'created_at' | 'pinned'>) => Promise<void>;
}) {
  const [surahInput, setSurahInput] = useState('');
  const [ayahInput, setAyahInput] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<Tag>('tadabbur');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setSurahInput(''); setAyahInput(''); setContent(''); setTag('tadabbur');
    setSaving(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">New Entry</p>

      {/* Surah + Ayah */}
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <input
            list="surah-datalist"
            value={surahInput}
            onChange={(e) => setSurahInput(e.target.value)}
            placeholder="Surah (optional — name or number)"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-emerald-600"
          />
          <datalist id="surah-datalist">
            {SURAH_NAMES.map((name, i) => <option key={i} value={name} />)}
          </datalist>
        </div>
        <input
          type="number"
          min={1}
          value={ayahInput}
          onChange={(e) => setAyahInput(e.target.value)}
          placeholder="Ayah #"
          className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
        />
      </div>

      {/* Tag selection */}
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(TAG_CONFIG) as Tag[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              tag === t ? TAG_CONFIG[t].activePill : TAG_CONFIG[t].pill
            }`}
          >
            {TAG_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave(); }}
        rows={4}
        placeholder="What's on your heart today? A reflection, difficulty, or breakthrough…"
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-emerald-600"
      />

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-300 dark:text-slate-700">⌘ + Enter to save</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={!content.trim() || saving}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
        >
          {saving ? 'Saving…' : 'Save entry →'}
        </button>
      </div>
    </div>
  );
}

// ─── Vocab Tab ────────────────────────────────────────────────────────────────

function VocabTab({ words, onAdd, onDelete }: {
  words: VocabWord[];
  onAdd: (w: Omit<VocabWord, 'id' | 'created_at'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [word, setWord] = useState('');
  const [root, setRoot] = useState('');
  const [meaning, setMeaning] = useState('');
  const [foundIn, setFoundIn] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!word.trim() || !meaning.trim()) return;
    setSaving(true);
    await onAdd({ word: word.trim(), root: root.trim(), meaning: meaning.trim(), found_in: foundIn.trim() });
    setWord(''); setRoot(''); setMeaning(''); setFoundIn('');
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Add a Word</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={word} onChange={(e) => setWord(e.target.value)}
            placeholder="Arabic word"
            dir="rtl"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right font-arabic text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
          <input
            value={root} onChange={(e) => setRoot(e.target.value)}
            placeholder="Root letters (e.g. ك ت ب)"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
          <input
            value={meaning} onChange={(e) => setMeaning(e.target.value)}
            placeholder="Meaning *"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
          <input
            value={foundIn} onChange={(e) => setFoundIn(e.target.value)}
            placeholder="Found in (e.g. Al-Baqarah 2:255)"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleAdd}
            disabled={!word.trim() || !meaning.trim() || saving}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {saving ? 'Saving…' : 'Add word →'}
          </button>
        </div>
      </div>

      {/* Word list */}
      {words.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-800">
          Words you encounter during memorisation will live here.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {words.map((w) => (
            <div key={w.id} className="group flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <div className="min-w-0">
                <p dir="rtl" className="font-arabic text-2xl leading-tight text-slate-900 dark:text-slate-100">{w.word}</p>
                {w.root && <p className="mt-0.5 text-xs text-slate-400">Root: {w.root}</p>}
                <p className="mt-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{w.meaning}</p>
                {w.found_in && <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-500">{w.found_in}</p>}
              </div>
              <button
                onClick={() => onDelete(w.id)}
                className="mt-1 shrink-0 text-xs text-slate-200 opacity-0 transition hover:text-red-400 group-hover:opacity-100 dark:text-slate-700 dark:hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Milestones Tab ───────────────────────────────────────────────────────────

function MilestonesTab({ milestones, onAdd, onDelete }: {
  milestones: Milestone[];
  onAdd: (text: string, emoji: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!text.trim()) return;
    setSaving(true);
    await onAdd(text.trim(), emoji);
    setText('');
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Record a Milestone</p>
        <div className="flex gap-2">
          <select
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-base outline-none dark:border-slate-700 dark:bg-slate-800"
          >
            {MILESTONE_EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="e.g. Completed Surah Al-Kahf — first full surah!"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
          <button
            onClick={handleAdd}
            disabled={!text.trim() || saving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {saving ? '…' : 'Add'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      {milestones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-800">
          Your milestones — big and small — will live here.
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <span className="mt-0.5 text-xl leading-none">{m.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{m.text}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(m.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {m.type === 'auto' && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">auto</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDelete(m.id)}
                className="mt-1 shrink-0 text-xs text-slate-200 opacity-0 transition hover:text-red-400 group-hover:opacity-100 dark:text-slate-700 dark:hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('entries');

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<Tag | 'all'>('all');
  const [dbError, setDbError] = useState<string | null>(null);

  // ── Load from Supabase ──────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error: authErr }) => {
      if (authErr) { setDbError(`Auth error: ${authErr.message}`); setLoading(false); return; }
      const uid = data?.user?.id ?? null;
      setUserId(uid);
      if (!uid) { setDbError('Not signed in — please sign in first.'); setLoading(false); return; }

      Promise.all([
        supabase.from('journal_entries').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('vocab_words').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('journal_milestones').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ]).then(([e, v, m]) => {
        const loadErr = e.error || v.error || m.error;
        if (loadErr) { setDbError(`Load error: ${loadErr.message}`); }
        if (e.data) setEntries(e.data as JournalEntry[]);
        if (v.data) setVocab(v.data as VocabWord[]);
        if (m.data) setMilestones(m.data as Milestone[]);
        setLoading(false);
      });
    });
  }, []);

  // ── Entry handlers ──────────────────────────────────────────────────────────

  async function addEntry(e: Omit<JournalEntry, 'id' | 'created_at' | 'pinned'>) {
    if (!userId) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: JournalEntry = { ...e, id: tempId, pinned: false, created_at: new Date().toISOString() };
    setEntries((prev) => [optimistic, ...prev]);

    const payload: Record<string, unknown> = {
      user_id: userId,
      content: e.content,
      tag: e.tag,
      pinned: false,
    };
    if (e.surah_number != null) payload.surah_number = e.surah_number;
    if (e.ayah_number != null) payload.ayah_number = e.ayah_number;

    const { data, error } = await supabase
      .from('journal_entries')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.warn('addEntry error:', error);
      setDbError(`Save failed: ${error.message} (code: ${error.code})`);
      setEntries((prev) => prev.filter((x) => x.id !== tempId));
      return;
    }
    if (data) setEntries((prev) => prev.map((x) => (x.id === tempId ? data as JournalEntry : x)));
  }

  async function updateEntry(id: string, patch: Pick<JournalEntry, 'content' | 'tag' | 'surah_number' | 'ayah_number'>) {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e));
    const { error } = await supabase
      .from('journal_entries')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId!);
    if (error) console.warn('updateEntry error:', error);
  }

  async function togglePin(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const newPinned = !entry.pinned;
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, pinned: newPinned } : e));
    if (!id.startsWith('temp-')) {
      const { error } = await supabase
        .from('journal_entries')
        .update({ pinned: newPinned })
        .eq('id', id)
        .eq('user_id', userId!);
      if (error) console.warn('togglePin error:', error);
    }
  }

  async function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (!id.startsWith('temp-')) {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!);
      if (error) console.warn('deleteEntry error:', error);
    }
  }

  // ── Vocab handlers ──────────────────────────────────────────────────────────

  async function addVocab(w: Omit<VocabWord, 'id' | 'created_at'>) {
    if (!userId) return;
    const tempId = `temp-${Date.now()}`;
    setVocab((prev) => [{ ...w, id: tempId, created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from('vocab_words').insert({ user_id: userId, ...w }).select('*').single();
    if (error) {
      console.warn('addVocab error:', error);
      setVocab((prev) => prev.filter((x) => x.id !== tempId));
      return;
    }
    if (data) setVocab((prev) => prev.map((x) => (x.id === tempId ? data as VocabWord : x)));
  }

  async function deleteVocab(id: string) {
    const removed = vocab.find((w) => w.id === id);
    setVocab((prev) => prev.filter((w) => w.id !== id));
    if (!id.startsWith('temp-')) {
      const { error } = await supabase
        .from('vocab_words')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!);
      if (error) {
        console.warn('deleteVocab error:', error);
        setDbError(`Delete failed: ${error.message} (code: ${error.code})`);
        if (removed) setVocab((prev) => [...prev, removed]);
      }
    }
  }

  // ── Milestone handlers ──────────────────────────────────────────────────────

  async function addMilestone(text: string, emoji: string) {
    if (!userId) return;
    const tempId = `temp-${Date.now()}`;
    setMilestones((prev) => [{ id: tempId, text, emoji, type: 'manual', created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from('journal_milestones').insert({ user_id: userId, text, emoji, type: 'manual' }).select('*').single();
    if (error) {
      console.warn('addMilestone error:', error);
      setMilestones((prev) => prev.filter((x) => x.id !== tempId));
      return;
    }
    if (data) setMilestones((prev) => prev.map((x) => (x.id === tempId ? data as Milestone : x)));
  }

  async function deleteMilestone(id: string) {
    const removed = milestones.find((m) => m.id === id);
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    if (!id.startsWith('temp-')) {
      const { error } = await supabase
        .from('journal_milestones')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!);
      if (error) {
        console.warn('deleteMilestone error:', error);
        setDbError(`Delete failed: ${error.message} (code: ${error.code})`);
        if (removed) setMilestones((prev) => [...prev, removed]);
      }
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const pinnedEntries = entries.filter((e) => e.pinned);
  const onThisDay = entries.find((e) => isSameDayPastYear(e.created_at));
  const filteredEntries = entries.filter((e) => {
    const matchesTag = filterTag === 'all' || e.tag === filterTag;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || e.content.toLowerCase().includes(q) ||
      (e.surah_number ? surahLabel(e.surah_number).toLowerCase().includes(q) : false);
    return matchesTag && matchesSearch;
  });

  // ─────────────────────────────────────────────────────────────────────────────

  const TABS: { key: ActiveTab; label: string; count: number }[] = [
    { key: 'entries',    label: 'Entries',    count: entries.length },
    { key: 'vocab',      label: 'Vocabulary', count: vocab.length },
    { key: 'milestones', label: 'Milestones', count: milestones.length },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <IslamicPattern />

      <div className="relative mx-auto w-full max-w-400 px-6 py-10 lg:px-16 lg:py-14">

        {/* ── Error banner ── */}
        {dbError && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <span className="break-all">{dbError}</span>
            <button type="button" onClick={() => setDbError(null)} className="shrink-0 font-bold">✕</button>
          </div>
        )}

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Private · Spiritual</p>
          <h1 className="mt-1.5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">My Journal</h1>
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
            {loading ? 'Loading…' : `${entries.length} entries · ${vocab.length} vocab words · ${milestones.length} milestones`}
          </p>
        </motion.div>

        {/* ── Tab bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}
          className="mt-8 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* ── Tab content ── */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >

          {/* ────────────────── ENTRIES TAB ────────────────── */}
          {activeTab === 'entries' && (
            <div className="space-y-5">
              {/* Stats chips */}
              {!loading && (
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {entries.length} total
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {pinnedEntries.length} pinned
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {thisWeekCount(entries)} this week
                  </span>
                </div>
              )}

              {/* Write form */}
              <WriteForm onSave={addEntry} />

              {/* On This Day */}
              {onThisDay && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <p className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-500">
                    📖 On this day, {new Date(onThisDay.created_at).getFullYear()}
                  </p>
                  <p className="line-clamp-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{onThisDay.content}</p>
                  {onThisDay.surah_number && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      {surahLabel(onThisDay.surah_number)}{onThisDay.ayah_number ? ` · Ayah ${onThisDay.ayah_number}` : ''}
                    </p>
                  )}
                </div>
              )}

              {/* Pinned */}
              {pinnedEntries.length > 0 && (
                <div>
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Pinned</p>
                  <div className="space-y-2.5">
                    {pinnedEntries.map((e) => (
                      <EntryCard key={e.id} entry={e} onPin={togglePin} onDelete={deleteEntry} onEdit={updateEntry} />
                    ))}
                  </div>
                </div>
              )}

              {/* All entries */}
              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-8 py-14 text-center dark:border-slate-800">
                  <p className="font-arabic text-2xl leading-12 text-emerald-700 dark:text-emerald-500" dir="rtl">
                    خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
                  </p>
                  <p className="mt-2 text-sm italic text-slate-400">"The best of you are those who learn the Quran and teach it."</p>
                  <p className="mt-5 text-sm text-slate-400">Your journey begins with one reflection. Write above.</p>
                </div>
              ) : (
                <>
                  {/* Filter bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-40 flex-1">
                      <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search entries…"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none placeholder:text-slate-300 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['all', ...Object.keys(TAG_CONFIG)] as (Tag | 'all')[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setFilterTag(t)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                            filterTag === t
                              ? t === 'all'
                                ? 'border-slate-400 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                : TAG_CONFIG[t as Tag].activePill
                              : t === 'all'
                                ? 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-500'
                                : TAG_CONFIG[t as Tag].pill
                          }`}
                        >
                          {t === 'all' ? 'All' : TAG_CONFIG[t as Tag].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredEntries.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No entries match your filter.</p>
                  ) : (
                    <div className="space-y-2.5">
                      <AnimatePresence initial={false}>
                        {filteredEntries.map((entry) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.18 }}
                          >
                            <EntryCard entry={entry} onPin={togglePin} onDelete={deleteEntry} onEdit={updateEntry} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ────────────────── VOCAB TAB ────────────────── */}
          {activeTab === 'vocab' && (
            <VocabTab words={vocab} onAdd={addVocab} onDelete={deleteVocab} />
          )}

          {/* ────────────────── MILESTONES TAB ────────────────── */}
          {activeTab === 'milestones' && (
            <MilestonesTab milestones={milestones} onAdd={addMilestone} onDelete={deleteMilestone} />
          )}

        </motion.div>
      </div>
    </div>
  );
}
