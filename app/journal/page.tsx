'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const SURAH_NAMES: string[] = [
  'Al-Fatihah','Al-Baqarah',"Ali 'Imran","An-Nisa'","Al-Ma'idah","Al-An'am","Al-A'raf",'Al-Anfal','At-Tawbah','Yunus',
  'Hud','Yusuf',"Ar-Ra'd",'Ibrahim','Al-Hijr','An-Nahl',"Al-Isra'",'Al-Kahf','Maryam','Ta-Ha',"Al-Anbiya'",'Al-Hajj',
  "Al-Mu'minun",'An-Nur','Al-Furqan',"Ash-Shu'ara'",'An-Naml','Al-Qasas',"Al-'Ankabut",'Ar-Rum','Luqman','As-Sajdah',
  'Al-Ahzab',"Saba'",'Fatir','Ya-Sin','As-Saffat','Sad','Az-Zumar','Ghafir','Fussilat','Ash-Shura','Az-Zukhruf',
  'Ad-Dukhan','Al-Jathiyah','Al-Ahqaf','Muhammad','Al-Fath','Al-Hujurat','Qaf','Adh-Dhariyat','At-Tur','An-Najm',
  'Al-Qamar','Ar-Rahman',"Al-Waqi'ah",'Al-Hadid','Al-Mujadilah','Al-Hashr','Al-Mumtahanah','As-Saff',"Al-Jumu'ah",
  'Al-Munafiqun','At-Taghabun','At-Talaq','At-Tahrim','Al-Mulk','Al-Qalam','Al-Haqqah',"Al-Ma'arij",'Nuh','Al-Jinn',
  'Al-Muzzammil','Al-Muddaththir','Al-Qiyamah','Al-Insan','Al-Mursalat',"An-Naba'","An-Nazi'at",'Abasa','At-Takwir',
  'Al-Infitar','Al-Mutaffifin','Al-Inshiqaq','Al-Buruj','At-Tariq',"Al-A'la",'Al-Ghashiyah','Al-Fajr','Al-Balad',
  'Ash-Shams','Al-Lail','Ad-Duha','Ash-Sharh','At-Tin',"Al-'Alaq",'Al-Qadr','Al-Bayyinah','Az-Zalzalah',
  "Al-'Adiyat","Al-Qari'ah",'At-Takathur',"Al-'Asr",'Al-Humazah','Al-Fil','Quraysh',"Al-Ma'un",'Al-Kawthar',
  'Al-Kafirun','An-Nasr','Al-Masad','Al-Ikhlas','Al-Falaq','An-Nas',
];

const MILESTONE_EMOJIS = ['✨','🎉','🤲','📖','🌟','💫','🏆','🌙'];

// ─── Types ────────────────────────────────────────────────────────────────────

type Tag = 'tadabbur' | 'milestone' | 'struggle' | 'breakthrough';

type JournalEntry = {
  id: string; surah_number: number | null; ayah_number: number | null;
  content: string; tag: Tag; pinned: boolean; created_at: string;
};
type VocabWord = { id: string; word: string; root: string; meaning: string; found_in: string; created_at: string };
type Milestone = { id: string; text: string; emoji: string; type: 'auto' | 'manual'; created_at: string };

// ─── Tag config ───────────────────────────────────────────────────────────────

const TAG_CONFIG: Record<Tag, { label: string; pill: string; leftBorder: string; activePill: string }> = {
  tadabbur:    { label:'Tadabbur',    pill:'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-500', leftBorder:'border-l-emerald-400 dark:border-l-emerald-600',  activePill:'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300' },
  milestone:   { label:'Milestone',   pill:'border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700 dark:border-slate-700 dark:text-slate-500',   leftBorder:'border-l-amber-400 dark:border-l-amber-600',     activePill:'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300' },
  struggle:    { label:'Struggle',    pill:'border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:text-slate-500',     leftBorder:'border-l-rose-400 dark:border-l-rose-600',       activePill:'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-300' },
  breakthrough:{ label:'Breakthrough',pill:'border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:text-slate-500',      leftBorder:'border-l-sky-400 dark:border-l-sky-600',         activePill:'border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-300' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSurahInput(input: string): number | null {
  const trimmed = input.trim(); if (!trimmed) return null;
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= 114) return num;
  const idx = SURAH_NAMES.findIndex((n) => n.toLowerCase() === trimmed.toLowerCase());
  return idx >= 0 ? idx + 1 : null;
}

function surahLabel(n: number): string { return SURAH_NAMES[n - 1] ?? `Surah ${n}`; }

function normalizeISO(iso: string): Date {
  if (!iso) return new Date();
  const s = iso.includes('T') ? iso : iso.replace(' ', 'T');
  const normalized = /[Zz]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z';
  return new Date(normalized);
}

function formatDate(iso: string) {
  const d = normalizeISO(iso);
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((todayMidnight.getTime() - dMidnight.getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function isSameDayPastYear(iso: string): boolean {
  const d = normalizeISO(iso);
  const today = new Date();
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate() && d.getFullYear() < today.getFullYear();
}

function thisWeekCount(entries: JournalEntry[]): number {
  const cutoff = Date.now() - 7 * 86400000;
  return entries.filter((e) => normalizeISO(e.created_at).getTime() > cutoff).length;
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function exportPDF(entries: JournalEntry[], vocab: VocabWord[], milestones: Milestone[]) {
  function esc(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>'); }
  const tagColors: Record<Tag, string> = { tadabbur:'#059669', milestone:'#d97706', struggle:'#e11d48', breakthrough:'#0284c7' };
  const exportDate = new Date().toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' });

  const entryRows = entries.length === 0 ? '<p class="empty">No reflections yet.</p>' : entries.map((e) => `
    <div class="item">
      <div class="item-meta">
        <span class="tag" style="color:${tagColors[e.tag]};border-color:${tagColors[e.tag]}">${TAG_CONFIG[e.tag].label}</span>
        ${e.surah_number ? `<span class="ref">${surahLabel(e.surah_number)}${e.ayah_number ? ` · Ayah ${e.ayah_number}` : ''}</span>` : ''}
        ${e.pinned ? '<span class="pinned">📌</span>' : ''}
        <span class="date">${normalizeISO(e.created_at).toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })}</span>
      </div>
      <p class="content">${esc(e.content)}</p>
    </div>`).join('');

  const vocabRows = vocab.length === 0 ? '<p class="empty">No vocabulary saved.</p>' : vocab.map((w) => `
    <div class="item vocab-item">
      <div class="item-meta">
        ${w.found_in ? `<span class="ref">${esc(w.found_in)}</span>` : ''}
        <span class="date">${normalizeISO(w.created_at).toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })}</span>
      </div>
      <div class="vocab-row">
        <span class="arabic" dir="rtl">${esc(w.word)}</span>
        <span class="vocab-meaning">${esc(w.meaning)}</span>
      </div>
      ${w.root ? `<p class="vocab-root">Root: ${esc(w.root)}</p>` : ''}
    </div>`).join('');

  const milestoneRows = milestones.length === 0 ? '<p class="empty">No milestones recorded.</p>' : milestones.map((m) => `
    <div class="item milestone-item">
      <span class="milestone-emoji">${m.emoji}</span>
      <div>
        <p class="milestone-text">${esc(m.text)}</p>
        <p class="date">${normalizeISO(m.created_at).toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })}</p>
      </div>
    </div>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>My Hifdh Journal</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,serif;color:#1a1a1a;padding:48px;max-width:760px;margin:0 auto}
    h1{font-size:30px;font-weight:600;color:#111;margin-bottom:4px}
    .export-date{font-size:12px;color:#9ca3af;margin-bottom:40px}
    h2{font-size:18px;font-weight:600;color:#111;margin:40px 0 16px;padding-bottom:10px;border-bottom:2px solid #f3f4f6}
    h2:first-of-type{margin-top:0}
    .item{margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid #f3f4f6}
    .item:last-child{border-bottom:none}
    .item-meta{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
    .tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;border:1px solid;border-radius:20px;padding:2px 9px}
    .ref{font-size:12px;font-weight:600;color:#374151}
    .pinned{font-size:12px}
    .date{font-size:11px;color:#9ca3af;margin-left:auto}
    .content{font-size:14px;line-height:1.9;color:#374151}
    .vocab-item{}
    .vocab-row{display:flex;align-items:baseline;gap:12px;margin-bottom:4px}
    .arabic{font-size:26px;line-height:1.2;color:#111;direction:rtl}
    .vocab-meaning{font-size:14px;color:#374151;font-weight:500}
    .vocab-root{font-size:12px;color:#9ca3af}
    .milestone-item{display:flex;align-items:flex-start;gap:14px}
    .milestone-emoji{font-size:24px;line-height:1;margin-top:2px}
    .milestone-text{font-size:14px;font-weight:500;color:#374151;margin-bottom:3px}
    .empty{font-size:13px;color:#9ca3af;font-style:italic;padding:12px 0}
    @media print{body{padding:20px}@page{margin:1.5cm}}
  </style></head><body>
    <h1>My Hifdh Journal</h1>
    <p class="export-date">Exported ${exportDate} · ${entries.length} reflections · ${vocab.length} vocab · ${milestones.length} milestones</p>
    <h2>Reflections</h2>${entryRows}
    <h2>Vocabulary</h2>${vocabRows}
    <h2>Milestones</h2>${milestoneRows}
  </body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) { URL.revokeObjectURL(url); return; }
  win.addEventListener('load', () => { win.print(); URL.revokeObjectURL(url); });
}

// ─── Gold column divider (vertical, with ✦ star) ──────────────────────────────

function GoldDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center shrink-0 w-5 ${className}`}>
      <div className="flex-1 w-px" style={{ background: 'linear-gradient(to bottom, transparent, #c9943a)' }} />
      <span className="py-3 text-xs text-amber-500/70 dark:text-amber-400/60 leading-none select-none">✦</span>
      <div className="flex-1 w-px" style={{ background: 'linear-gradient(to top, transparent, #c9943a)' }} />
    </div>
  );
}

// ─── Custom Select (emoji / small option lists) ───────────────────────────────

function CustomSelect<T extends string>({ value, onChange, options, className = '' }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const handleBlur = (e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className={`relative ${className}`} onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        {current?.label ?? value}
        <svg className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1 z-50 min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  value === opt.value
                    ? 'bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Surah Select (searchable, 114 options) ───────────────────────────────────

function SurahSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else setQuery('');
  }, [open]);

  const handleBlur = (e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };

  const currentNum = parseSurahInput(value);
  const displayLabel = currentNum ? `${currentNum}. ${surahLabel(currentNum)}` : null;

  const filtered = SURAH_NAMES
    .map((name, i) => ({ name, num: i + 1 }))
    .filter(({ name, num }) =>
      !query ||
      name.toLowerCase().includes(query.toLowerCase()) ||
      String(num).startsWith(query)
    );

  return (
    <div ref={ref} className="relative flex-1" onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
      >
        <span className={displayLabel ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {displayLabel ?? 'Surah (optional)'}
        </span>
        <svg className={`h-3 w-3 shrink-0 ml-2 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1 z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search surah…"
                className="w-full rounded-lg bg-slate-50 px-3 py-1.5 text-sm outline-none placeholder:text-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {value && (
                <button
                  type="button"
                  onMouseDown={() => { onChange(''); setOpen(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Clear
                </button>
              )}
              {filtered.map(({ name, num }) => (
                <button
                  key={num}
                  type="button"
                  onMouseDown={() => { onChange(String(num)); setOpen(false); }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    currentNum === num
                      ? 'bg-slate-50 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="tabular-nums text-xs text-slate-400 mr-2">{num}.</span>{name}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-slate-400">No surah found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Compact Entry Card ───────────────────────────────────────────────────────

function CompactEntryCard({ entry, onClick }: { entry: JournalEntry; onClick: () => void }) {
  const cfg = TAG_CONFIG[entry.tag];
  return (
    <button
      type="button" onClick={onClick}
      className={`group w-full text-left rounded-xl border border-slate-100 border-l-4 ${cfg.leftBorder} bg-white px-3.5 py-2.5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.activePill}`}>{cfg.label}</span>
        {entry.surah_number && (
          <Link
            href={`/map?surah=${entry.surah_number}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-semibold text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors truncate"
          >
            {surahLabel(entry.surah_number)}{entry.ayah_number ? ` · ${entry.ayah_number}` : ''}
          </Link>
        )}
        {entry.pinned && <span className="text-[10px] text-amber-500">📌</span>}
        <span className="ml-auto shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{formatDate(entry.created_at)}</span>
      </div>
      <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{entry.content}</p>
    </button>
  );
}

// ─── Compact Vocab Card ───────────────────────────────────────────────────────

function VocabCard({ word, onClick }: { word: VocabWord; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="group w-full text-left rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex items-center gap-2 mb-1.5">
        {word.found_in && (
          <span className="truncate text-xs text-slate-400 dark:text-slate-500">{word.found_in}</span>
        )}
        <span className="ml-auto shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{formatDate(word.created_at)}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p dir="rtl" className="font-arabic text-lg leading-tight text-slate-900 dark:text-slate-100 shrink-0">{word.word}</p>
        <p className="line-clamp-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{word.meaning}</p>
      </div>
    </button>
  );
}

// ─── Compact Milestone Card ───────────────────────────────────────────────────

function MilestoneCard({ milestone, onClick }: { milestone: Milestone; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="group w-full text-left rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatDate(milestone.created_at)}</span>
        {milestone.type === 'auto' && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">auto</span>
        )}
      </div>
      <div className="flex items-start gap-2">
        <span className="text-base leading-tight shrink-0 mt-0.5">{milestone.emoji}</span>
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{milestone.text}</p>
      </div>
    </button>
  );
}

// ─── Entry Detail Modal ───────────────────────────────────────────────────────

function EntryDetailModal({ entry, onClose, onPin, onDelete, onEdit }: {
  entry: JournalEntry;
  onClose: () => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, patch: Pick<JournalEntry, 'content' | 'tag' | 'surah_number' | 'ayah_number'>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [editTag, setEditTag] = useState<Tag>(entry.tag);
  const [editSurah, setEditSurah] = useState(entry.surah_number ? String(entry.surah_number) : '');
  const [editAyah, setEditAyah] = useState(entry.ayah_number ? String(entry.ayah_number) : '');
  const [saving, setSaving] = useState(false);
  const cfg = TAG_CONFIG[entry.tag];

  async function saveEdit() {
    if (!editContent.trim()) return;
    setSaving(true);
    const surahNum = parseSurahInput(editSurah);
    const ayahNum = editAyah.trim() ? parseInt(editAyah, 10) : null;
    await onEdit(entry.id, { content: editContent.trim(), tag: editTag, surah_number: surahNum, ayah_number: isNaN(ayahNum as number) ? null : ayahNum });
    setSaving(false); setEditing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.22 }}
        className={`relative z-10 w-full max-w-2xl rounded-2xl border border-l-4 ${cfg.leftBorder} bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cfg.activePill}`}>{cfg.label}</span>
            {entry.surah_number && (
              <Link href={`/map?surah=${entry.surah_number}`} onClick={onClose}
                className="text-sm font-semibold text-slate-800 hover:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 transition-colors">
                {surahLabel(entry.surah_number)}{entry.ayah_number ? ` · Ayah ${entry.ayah_number}` : ''}
              </Link>
            )}
            {entry.pinned && <span className="text-xs text-amber-500">📌 Pinned</span>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400">{formatDate(entry.created_at)}</span>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {editing ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input list="surah-edit-detail" value={editSurah} onChange={(e) => setEditSurah(e.target.value)} placeholder="Surah (optional)"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  <datalist id="surah-edit-detail">{SURAH_NAMES.map((name, i) => <option key={i} value={name} />)}</datalist>
                </div>
                <input type="number" min={1} value={editAyah} onChange={(e) => setEditAyah(e.target.value)} placeholder="Ayah #"
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TAG_CONFIG) as Tag[]).map((t) => (
                  <button key={t} type="button" onClick={() => setEditTag(t)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${editTag === t ? TAG_CONFIG[t].activePill : TAG_CONFIG[t].pill}`}>
                    {TAG_CONFIG[t].label}
                  </button>
                ))}
              </div>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={8}
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-7 text-slate-900 outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-8 text-slate-700 dark:text-slate-300">{entry.content}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onPin(entry.id)}
              className={`flex items-center gap-1 text-xs font-medium transition ${entry.pinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}>
              <svg className="h-3.5 w-3.5" fill={entry.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {entry.pinned ? 'Unpin' : 'Pin'}
            </button>
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition">Edit</button>
            )}
            <button type="button" onClick={() => { onDelete(entry.id); onClose(); }}
              className="text-xs text-slate-300 hover:text-red-500 dark:text-slate-700 dark:hover:text-red-400 transition">Delete</button>
          </div>
          {editing && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={!editContent.trim() || saving}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Vocab Detail Modal ───────────────────────────────────────────────────────

function VocabDetailModal({ word, onClose, onDelete }: {
  word: VocabWord;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.22 }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-l-4 border-l-emerald-400 bg-white shadow-2xl dark:border-slate-700 dark:border-l-emerald-600 dark:bg-slate-900 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-400 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              Vocab
            </span>
            {word.found_in && (
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{word.found_in}</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400">{formatDate(word.created_at)}</span>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <p dir="rtl" className="font-arabic text-5xl leading-tight text-slate-900 dark:text-slate-100 text-right">{word.word}</p>
            {word.root && (
              <p className="mt-2 text-sm text-slate-400">Root: <span className="font-medium text-slate-600 dark:text-slate-300">{word.root}</span></p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Meaning</p>
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{word.meaning}</p>
          </div>
          {word.found_in && (
            <div className="rounded-xl bg-emerald-50/60 px-4 py-3 dark:bg-emerald-950/20">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1">Found in</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{word.found_in}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <button type="button" onClick={() => { onDelete(word.id); onClose(); }}
            className="text-xs text-slate-300 hover:text-red-500 dark:text-slate-700 dark:hover:text-red-400 transition">Delete</button>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Milestone Detail Modal ───────────────────────────────────────────────────

function MilestoneDetailModal({ milestone, onClose, onDelete }: {
  milestone: Milestone;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.22 }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-l-4 border-l-amber-400 bg-white shadow-2xl dark:border-slate-700 dark:border-l-amber-600 dark:bg-slate-900 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              {milestone.emoji} Milestone
            </span>
            {milestone.type === 'auto' && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">auto</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400">{formatDate(milestone.created_at)}</span>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="flex items-start gap-4">
            <span className="text-5xl leading-none mt-1">{milestone.emoji}</span>
            <div>
              <p className="text-lg font-medium leading-relaxed text-slate-800 dark:text-slate-200">{milestone.text}</p>
              <p className="mt-2 text-sm text-slate-400">
                {normalizeISO(milestone.created_at).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <button type="button" onClick={() => { onDelete(milestone.id); onClose(); }}
            className="text-xs text-slate-300 hover:text-red-500 dark:text-slate-700 dark:hover:text-red-400 transition">Delete</button>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Write Modal ──────────────────────────────────────────────────────────────

function WriteModal({ onSave, onClose }: {
  onSave: (e: Omit<JournalEntry, 'id' | 'created_at' | 'pinned'>) => Promise<void>;
  onClose: () => void;
}) {
  const [surahInput, setSurahInput] = useState('');
  const [ayahInput, setAyahInput] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<Tag>('tadabbur');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    const surahNum = parseSurahInput(surahInput);
    const ayahNum = ayahInput.trim() ? parseInt(ayahInput, 10) : null;
    await onSave({ surah_number: surahNum, ayah_number: isNaN(ayahNum as number) ? null : ayahNum, content: content.trim(), tag });
    setSaving(false); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.22 }}
        className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Entry</p>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="mb-3 flex gap-2">
          <SurahSelect value={surahInput} onChange={setSurahInput} />
          <input type="number" min={1} value={ayahInput} onChange={(e) => setAyahInput(e.target.value)} placeholder="Ayah #"
            className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(TAG_CONFIG) as Tag[]).map((t) => (
            <button key={t} type="button" onClick={() => setTag(t)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${tag === t ? TAG_CONFIG[t].activePill : TAG_CONFIG[t].pill}`}>
              {TAG_CONFIG[t].label}
            </button>
          ))}
        </div>
        <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave(); }}
          rows={5} placeholder="What's on your heart today?"
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600" />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-300 dark:text-slate-700">⌘ + Enter to save</span>
          <button type="button" onClick={handleSave} disabled={!content.trim() || saving}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #d4af6e, #c9a020, #8b6510)' }}>
            {saving ? 'Saving…' : 'Save entry →'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Inner Page ───────────────────────────────────────────────────────────────

function JournalInner() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedVocab, setSelectedVocab] = useState<VocabWord | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<Tag | 'all'>('all');
  const [filterSurah, setFilterSurah] = useState<number | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // Vocab form state
  const [vocabWord, setVocabWord] = useState('');
  const [vocabRoot, setVocabRoot] = useState('');
  const [vocabMeaning, setVocabMeaning] = useState('');
  const [vocabFoundIn, setVocabFoundIn] = useState('');
  const [savingVocab, setSavingVocab] = useState(false);

  // Milestone form state
  const [milestoneText, setMilestoneText] = useState('');
  const [milestoneEmoji, setMilestoneEmoji] = useState('✨');
  const [savingMilestone, setSavingMilestone] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error: authErr }) => {
      if (authErr) { setDbError(`Auth error: ${authErr.message}`); setLoading(false); return; }
      const uid = data?.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) { setDbError('Not signed in — please sign in first.'); setLoading(false); return; }
      Promise.all([
        supabase.from('journal_entries').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('vocab_words').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('journal_milestones').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ]).then(([e, v, m]) => {
        if (e.error || v.error || m.error) setDbError(`Load error: ${(e.error || v.error || m.error)!.message}`);
        if (e.data) setEntries(e.data as JournalEntry[]);
        if (v.data) setVocab(v.data as VocabWord[]);
        if (m.data) setMilestones(m.data as Milestone[]);
        setLoading(false);
      });
    });
  }, []);

  useEffect(() => {
    const entryId = searchParams.get('entry');
    if (!entryId || entries.length === 0) return;
    const found = entries.find((e) => e.id === entryId);
    if (found) setSelectedEntry(found);
  }, [searchParams, entries]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function addEntry(e: Omit<JournalEntry, 'id' | 'created_at' | 'pinned'>) {
    if (!userId) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: JournalEntry = { ...e, id: tempId, pinned: false, created_at: new Date().toISOString() };
    setEntries((prev) => [optimistic, ...prev]);
    const payload: Record<string, unknown> = { user_id: userId, content: e.content, tag: e.tag, pinned: false };
    if (e.surah_number != null) payload.surah_number = e.surah_number;
    if (e.ayah_number != null) payload.ayah_number = e.ayah_number;
    const { data, error } = await supabase.from('journal_entries').insert(payload).select('*').single();
    if (error) { setDbError(`Save failed: ${error.message}`); setEntries((prev) => prev.filter((x) => x.id !== tempId)); return; }
    if (data) setEntries((prev) => prev.map((x) => (x.id === tempId ? data as JournalEntry : x)));
  }

  async function updateEntry(id: string, patch: Pick<JournalEntry, 'content' | 'tag' | 'surah_number' | 'ayah_number'>) {
    const original = entries.find((e) => e.id === id);
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e));
    setSelectedEntry((prev) => prev?.id === id ? { ...prev, ...patch } : prev);
    const { error } = await supabase.from('journal_entries').update(patch).eq('id', id).eq('user_id', userId!);
    if (error) {
      if (original) {
        setEntries((prev) => prev.map((e) => e.id === id ? original : e));
        setSelectedEntry((prev) => prev?.id === id ? original : prev);
      }
      setDbError(`Update failed: ${error.message}`);
    }
  }

  async function togglePin(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const newPinned = !entry.pinned;
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, pinned: newPinned } : e));
    setSelectedEntry((prev) => prev?.id === id ? { ...prev, pinned: newPinned } : prev);
    if (!id.startsWith('temp-')) {
      const { error } = await supabase.from('journal_entries').update({ pinned: newPinned }).eq('id', id).eq('user_id', userId!);
      if (error) {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, pinned: entry.pinned } : e));
        setSelectedEntry((prev) => prev?.id === id ? { ...prev, pinned: entry.pinned } : prev);
      }
    }
  }

  async function deleteEntry(id: string) {
    const original = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (!id.startsWith('temp-')) {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', userId!);
      if (error) {
        if (original) setEntries((prev) => [original, ...prev]);
        setDbError(`Delete failed: ${error.message}`);
      }
    }
  }

  async function handleAddVocab() {
    if (!userId || !vocabWord.trim() || !vocabMeaning.trim()) return;
    setSavingVocab(true);
    const w = { word: vocabWord.trim(), root: vocabRoot.trim(), meaning: vocabMeaning.trim(), found_in: vocabFoundIn.trim() };
    const tempId = `temp-${Date.now()}`;
    setVocab((prev) => [{ ...w, id: tempId, created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from('vocab_words').insert({ user_id: userId, ...w }).select('*').single();
    if (error) {
      setVocab((prev) => prev.filter((x) => x.id !== tempId));
      setDbError(`Save failed: ${error.message}`);
      setSavingVocab(false);
      return;
    }
    if (data) setVocab((prev) => prev.map((x) => (x.id === tempId ? data as VocabWord : x)));
    setVocabWord(''); setVocabRoot(''); setVocabMeaning(''); setVocabFoundIn('');
    setSavingVocab(false);
  }

  async function deleteVocab(id: string) {
    const removed = vocab.find((w) => w.id === id);
    setVocab((prev) => prev.filter((w) => w.id !== id));
    if (!id.startsWith('temp-')) {
      const { error } = await supabase.from('vocab_words').delete().eq('id', id).eq('user_id', userId!);
      if (error) {
        if (removed) setVocab((prev) => [removed, ...prev]);
        setDbError(`Delete failed: ${error.message}`);
      }
    }
  }

  async function handleAddMilestone() {
    if (!userId || !milestoneText.trim()) return;
    setSavingMilestone(true);
    const text = milestoneText.trim();
    const tempId = `temp-${Date.now()}`;
    setMilestones((prev) => [{ id: tempId, text, emoji: milestoneEmoji, type: 'manual', created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from('journal_milestones').insert({ user_id: userId, text, emoji: milestoneEmoji, type: 'manual' }).select('*').single();
    if (error) {
      setMilestones((prev) => prev.filter((x) => x.id !== tempId));
      setDbError(`Save failed: ${error.message}`);
      setSavingMilestone(false);
      return;
    }
    if (data) setMilestones((prev) => prev.map((x) => (x.id === tempId ? data as Milestone : x)));
    setMilestoneText('');
    setSavingMilestone(false);
  }

  async function deleteMilestone(id: string) {
    const removed = milestones.find((m) => m.id === id);
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    if (!id.startsWith('temp-')) {
      const { error } = await supabase.from('journal_milestones').delete().eq('id', id).eq('user_id', userId!);
      if (error) {
        if (removed) setMilestones((prev) => [removed, ...prev]);
        setDbError(`Delete failed: ${error.message}`);
      }
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const pinnedEntries = entries.filter((e) => e.pinned);
  const onThisDay = entries.find((e) => isSameDayPastYear(e.created_at));
  const surahsWithEntries = Array.from(new Set(entries.map((e) => e.surah_number).filter(Boolean) as number[])).sort((a, b) => a - b);

  const filteredEntries = entries.filter((e) => {
    const matchTag = filterTag === 'all' || e.tag === filterTag;
    const matchSurah = filterSurah === null || e.surah_number === filterSurah;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || e.content.toLowerCase().includes(q) || (e.surah_number ? surahLabel(e.surah_number).toLowerCase().includes(q) : false);
    return matchTag && matchSurah && matchSearch;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="mx-auto w-full max-w-400 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">

        {dbError && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <span className="break-all">{dbError}</span>
            <button type="button" onClick={() => setDbError(null)} className="shrink-0 font-bold">✕</button>
          </div>
        )}

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Private · Spiritual</p>
            <h1 className="mt-1.5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">My Journal</h1>
            <p className="mt-1.5 text-sm text-slate-400 dark:text-slate-500">
              {loading ? 'Loading…' : `${entries.length} entries · ${vocab.length} vocab · ${milestones.length} milestones`}
            </p>
          </div>
          {entries.length > 0 && (
            <button onClick={() => exportPDF(entries, vocab, milestones)}
              className="mt-1 flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          )}
        </motion.div>

        {/* ── Main layout ── */}
        <div className="flex items-stretch gap-0">

          {/* ── Sidebar ── */}
          <aside className="hidden xl:flex w-60 shrink-0 flex-col gap-2.5 sticky top-24 self-start">

            {/* Overview card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Overview</p>
              <div className="space-y-3">
                {[
                  { section: 'Reflections', val: entries.length, sub: `${thisWeekCount(entries)} this week` },
                  { section: 'Vocabulary', val: vocab.length, sub: 'words saved' },
                  { section: 'Milestones', val: milestones.length, sub: 'recorded' },
                ].map(({ section, val, sub }) => (
                  <div key={section} className="flex items-center justify-between gap-2">
                    <div className="leading-5">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{section}</p>
                      <p className="text-xs text-slate-400">{sub}</p>
                    </div>
                    <span className="text-xl font-semibold tabular-nums text-slate-800 dark:text-slate-200">{val}</span>
                  </div>
                ))}
              </div>
              {pinnedEntries.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm text-slate-500">📌 Pinned</span>
                  <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">{pinnedEntries.length}</span>
                </div>
              )}
            </div>

            {/* Latest vocab */}
            {vocab[0] && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Latest Word</p>
                <p className="font-arabic text-2xl text-slate-900 dark:text-slate-100 text-right leading-relaxed" dir="rtl">{vocab[0].word}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{vocab[0].meaning}</p>
              </div>
            )}

            {/* Latest milestone */}
            {milestones[0] && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Latest Milestone</p>
                <p className="text-xs text-slate-400 mb-1.5 leading-relaxed">
                  {normalizeISO(milestones[0].created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-3">{milestones[0].text}</p>
              </div>
            )}
          </aside>

          {/* Sidebar gold divider */}
          <GoldDivider className="hidden xl:flex mx-4" />

          {/* ── Three columns ── */}
          <div className="flex-1 flex flex-col lg:flex-row min-w-0 items-stretch gap-0">

            {/* ── Column 1: Entries ── */}
            <div className="flex-1 min-w-0 lg:pr-4 xl:pr-5">

              {/* Column header */}
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reflections</h2>
                {entries.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">{entries.length}</span>
                )}
              </div>

              {/* New Entry block */}
              <button
                type="button"
                onClick={() => setShowWriteModal(true)}
                className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400 dark:text-slate-500">Write a reflection…</span>
                  <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
                    New entry →
                  </span>
                </div>
              </button>

              {loading ? (
                <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}</div>
              ) : entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-slate-800">
                  <p className="font-arabic text-xl leading-10 text-emerald-700 dark:text-emerald-500" dir="rtl">خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ</p>
                  <p className="mt-2 text-xs italic text-slate-400">"The best of you are those who learn the Quran and teach it."</p>
                </div>
              ) : (
                <>
                  {onThisDay && (
                    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                      <p className="mb-1 text-xs font-semibold text-amber-600 dark:text-amber-500">📖 On this day, {normalizeISO(onThisDay.created_at).getFullYear()}</p>
                      <p className="line-clamp-2 text-xs leading-5 text-slate-700 dark:text-slate-300">{onThisDay.content}</p>
                      {onThisDay.surah_number && <p className="mt-1 text-[11px] text-slate-400">{surahLabel(onThisDay.surah_number)}</p>}
                    </div>
                  )}

                  {/* Search */}
                  <div className="mb-2 relative">
                    <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search entries…"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none placeholder:text-slate-300 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                  </div>

                  {/* Filter block */}
                  <div className="mb-3 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex flex-wrap gap-1">
                      {(['all', ...Object.keys(TAG_CONFIG)] as (Tag | 'all')[]).map((t) => (
                        <button key={t} onClick={() => setFilterTag(t)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                            filterTag === t
                              ? t === 'all' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950' : TAG_CONFIG[t as Tag].activePill
                              : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                          }`}>
                          {t === 'all' ? 'All' : TAG_CONFIG[t as Tag].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredEntries.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No entries match.</p>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {filteredEntries.map((entry) => (
                          <motion.div key={entry.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}>
                            <CompactEntryCard entry={entry} onClick={() => setSelectedEntry(entry)} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Gold divider: Entries | Vocab */}
            <GoldDivider className="hidden lg:flex" />

            {/* ── Column 2: Vocabulary ── */}
            <div className="flex-1 min-w-0 lg:px-4 xl:px-5 mt-10 lg:mt-0">

              {/* Column header */}
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Vocabulary</h2>
                {vocab.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">{vocab.length}</span>
                )}
              </div>

              {/* Add form */}
              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900 space-y-2">
                <input value={vocabWord} onChange={(e) => setVocabWord(e.target.value)} placeholder="Arabic word" dir="rtl"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right font-arabic text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600" />
                <input value={vocabRoot} onChange={(e) => setVocabRoot(e.target.value)} placeholder="Root letters (e.g. ك ت ب)"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600" />
                <input value={vocabMeaning} onChange={(e) => setVocabMeaning(e.target.value)} placeholder="Meaning *"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600" />
                <input value={vocabFoundIn} onChange={(e) => setVocabFoundIn(e.target.value)} placeholder="Found in (e.g. Al-Baqarah 2:255)"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600" />
                <div className="flex justify-end pt-0.5">
                  <button onClick={handleAddVocab} disabled={!vocabWord.trim() || !vocabMeaning.trim() || savingVocab}
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950">
                    {savingVocab ? 'Saving…' : 'Add word →'}
                  </button>
                </div>
              </div>

              {vocab.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-800">Words you encounter during memorisation will live here.</div>
              ) : (
                <div className="space-y-2">
                  {vocab.map((w) => (
                    <VocabCard key={w.id} word={w} onClick={() => setSelectedVocab(w)} />
                  ))}
                </div>
              )}
            </div>

            {/* Gold divider: Vocab | Milestones */}
            <GoldDivider className="hidden lg:flex" />

            {/* ── Column 3: Milestones ── */}
            <div className="flex-1 min-w-0 lg:pl-4 xl:pl-5 mt-10 lg:mt-0">

              {/* Column header */}
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Milestones</h2>
                {milestones.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">{milestones.length}</span>
                )}
              </div>

              {/* Add form */}
              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900 space-y-2">
                <div className="flex gap-2">
                  <CustomSelect
                    value={milestoneEmoji}
                    onChange={setMilestoneEmoji}
                    options={MILESTONE_EMOJIS.map((e) => ({ value: e, label: e }))}
                  />
                  <input value={milestoneText} onChange={(e) => setMilestoneText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddMilestone(); }}
                    placeholder="e.g. Completed Surah Al-Kahf"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600" />
                </div>
                <div className="flex justify-end">
                  <button onClick={handleAddMilestone} disabled={!milestoneText.trim() || savingMilestone}
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-slate-100 dark:text-slate-950">
                    {savingMilestone ? '…' : 'Add →'}
                  </button>
                </div>
              </div>

              {milestones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-800">Your milestones — big and small — will live here.</div>
              ) : (
                <div className="space-y-2">
                  {milestones.map((m) => (
                    <MilestoneCard key={m.id} milestone={m} onClick={() => setSelectedMilestone(m)} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showWriteModal && <WriteModal onSave={addEntry} onClose={() => setShowWriteModal(false)} />}
        {selectedEntry && (
          <EntryDetailModal
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onPin={togglePin}
            onDelete={deleteEntry}
            onEdit={updateEntry}
          />
        )}
        {selectedVocab && (
          <VocabDetailModal
            word={selectedVocab}
            onClose={() => setSelectedVocab(null)}
            onDelete={deleteVocab}
          />
        )}
        {selectedMilestone && (
          <MilestoneDetailModal
            milestone={selectedMilestone}
            onClose={() => setSelectedMilestone(null)}
            onDelete={deleteMilestone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading…</div>}>
      <JournalInner />
    </Suspense>
  );
}
