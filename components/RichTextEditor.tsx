'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extensions';
import { Popover } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import {
  Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Highlighter, Baseline, ChevronDown,
  Undo2, Redo2, List, ListOrdered, TextQuote, ListTodo, Minus, BookOpen, ScrollText,
  TextAlignStart, TextAlignCenter, TextAlignEnd, TextAlignJustify,
} from 'lucide-react';
import { contentToPlainText, plainTextToHtml, richTextExtensions, sanitizeRichText, toEditorHtml } from '@/lib/richText';
import { SURAH_NAMES } from '@/lib/surahNames';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const HONORIFICS: { ar: string; label: string }[] = [
  { ar: 'ﷺ', label: 'Sallallahu alayhi wa sallam' },
  { ar: 'عَلَيْهِ ٱلسَّلَامُ', label: 'Alayhis salam' },
  { ar: 'سُبْحَانَهُ وَتَعَالَىٰ', label: "Subhanahu wa ta'ala" },
  { ar: 'عَزَّ وَجَلَّ', label: 'Azza wa jall' },
  { ar: 'رَضِيَ ٱللَّهُ عَنْهُ', label: 'Radiyallahu anhu' },
  { ar: 'رَضِيَ ٱللَّهُ عَنْهَا', label: 'Radiyallahu anha' },
  { ar: 'رَضِيَ ٱللَّهُ عَنْهُمْ', label: 'Radiyallahu anhum' },
  { ar: 'رَحِمَهُ ٱللَّهُ', label: 'Rahimahullah' },
  { ar: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', label: 'Bismillah' },
  { ar: 'ٱلْحَمْدُ لِلَّهِ', label: 'Alhamdulillah' },
  { ar: 'سُبْحَانَ ٱللَّهِ', label: 'SubhanAllah' },
  { ar: 'مَا شَاءَ ٱللَّهُ', label: "Masha'Allah" },
  { ar: 'إِن شَاءَ ٱللَّهُ', label: "In sha'Allah" },
  { ar: 'ٱللَّهُ أَكْبَرُ', label: 'Allahu akbar' },
  { ar: 'جَزَاكَ ٱللَّهُ خَيْرًا', label: 'JazakAllahu khayran' },
];

const TEXT_COLORS = ['#10b981', '#d97706', '#f43f5e', '#0ea5e9', '#8b5cf6', '#c9a020'];
const HIGHLIGHT_COLORS = ['#fde68a', '#bbf7d0', '#bae6fd', '#fecdd3', '#e9d5ff'];
const MAX_AYAHS = 20;
const ALIGN_ICONS = { left: TextAlignStart, center: TextAlignCenter, right: TextAlignEnd, justify: TextAlignJustify } as const;

function toArabicDigits(n: number) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

// The Quran text is served from this app's own files (public/quran), not an outside API.
// Rows are [ayah, position, uthmani, imlaei, audio file number].
const surahCache = new Map<number, Promise<[number, number, string, string, number][]>>();

function loadSurahRows(surah: number) {
  let rows = surahCache.get(surah);
  if (!rows) {
    rows = fetch(`/quran/${surah}.json`, { signal: AbortSignal.timeout(15000) }).then((res) => {
      if (!res.ok) throw new Error(`Failed to load surah ${surah}`);
      return res.json();
    });
    rows.catch(() => surahCache.delete(surah));
    surahCache.set(surah, rows);
  }
  return rows;
}

async function fetchAyahs(surah: number, from: number, to: number): Promise<string> {
  const rows = await loadSurahRows(surah);
  const verses: string[] = [];
  for (let n = from; n <= to; n++) {
    const words = rows.filter(([ayah]) => ayah === n).map(([, , text]) => text);
    if (words.length === 0) throw new Error(`No ayah ${surah}:${n}`);
    verses.push(`${words.join(' ')} ﴿${toArabicDigits(n)}﴾`);
  }
  return verses.join(' ');
}

// ─── Small building blocks ────────────────────────────────────────────────────

function ToolbarButton({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title} aria-pressed={active}
      className={cn(
        'flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        active && 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
      )}>
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />;
}

function ToolbarPopover({ trigger, title, open, onOpenChange, children, className }: {
  trigger: ReactNode; title: string; open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode; className?: string;
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button type="button" title={title} aria-label={title}
          className={cn(
            'flex h-8 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
            open && 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
          )}>
          {trigger}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} align="start" collisionPadding={12}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={cn('z-[70] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900', className)}>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MenuItem({ onClick, active, children }: { onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        active && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      )}>
      {children}
    </button>
  );
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const primaryButtonClass = 'rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-40';

// ─── Insert forms ─────────────────────────────────────────────────────────────

function QuranInsertForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const { t } = useTranslation('common');
  const [surah, setSurah] = useState(1);
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('');
  const [includeBasmala, setIncludeBasmala] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function insert() {
    let start = parseInt(from, 10);
    const end = to.trim() ? parseInt(to, 10) : start;
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) { setError(t('editorInvalidAyah')); return; }
    // In the Hafs count the Basmala is Al-Fatihah 1:1; let the user leave it out.
    if (surah === 1 && start === 1 && !includeBasmala) {
      if (end === 1) { setError(t('editorBasmalaOnly')); return; }
      start = 2;
    }
    if (end - start + 1 > MAX_AYAHS) { setError(t('editorTooManyAyahs', { max: MAX_AYAHS })); return; }
    setLoading(true); setError('');
    try {
      const text = await fetchAyahs(surah, start, end);
      const reference = `${SURAH_NAMES[surah - 1]} ${surah}:${start}${end > start ? `-${end}` : ''}`;
      editor.chain().focus().insertContent([
        { type: 'quranVerse', attrs: { reference }, content: [{ type: 'text', text }] },
        { type: 'paragraph' },
      ]).run();
      onDone();
    } catch {
      setError(t('editorAyahLoadFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-72 space-y-2 p-1.5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('editorInsertAyah')}</p>
      <select value={surah} onChange={(e) => setSurah(Number(e.target.value))} className={inputClass}>
        {SURAH_NAMES.map((name, i) => <option key={i} value={i + 1}>{i + 1}. {name}</option>)}
      </select>
      <div className="flex gap-2">
        <input type="number" min={1} value={from} onChange={(e) => setFrom(e.target.value)} placeholder={t('editorFromAyah')} className={inputClass} />
        <input type="number" min={1} value={to} onChange={(e) => setTo(e.target.value)} placeholder={t('editorToAyah')} className={inputClass}
          onKeyDown={(e) => { if (e.key === 'Enter') insert(); }} />
      </div>
      {surah === 1 && parseInt(from, 10) === 1 && (
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <input type="checkbox" checked={includeBasmala} onChange={(e) => setIncludeBasmala(e.target.checked)} className="accent-emerald-600" />
          {t('editorIncludeBasmala')}
        </label>
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="flex justify-end">
        <button type="button" onClick={insert} disabled={loading} className={primaryButtonClass}>
          {loading ? t('editorLoading') : t('editorInsert')}
        </button>
      </div>
    </div>
  );
}

function HadithInsertForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const { t } = useTranslation('common');
  const [text, setText] = useState('');
  const [source, setSource] = useState('');

  function insert() {
    editor.chain().focus().insertContent([
      { type: 'hadith', attrs: { source: source.trim() }, content: [{ type: 'paragraph', content: text.trim() ? [{ type: 'text', text: text.trim() }] : [] }] },
      { type: 'paragraph' },
    ]).run();
    onDone();
  }

  return (
    <div className="w-72 space-y-2 p-1.5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('editorInsertHadith')}</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={t('editorHadithText')} className={cn(inputClass, 'resize-none')} />
      <input value={source} onChange={(e) => setSource(e.target.value)} placeholder={t('editorHadithSource')} className={inputClass}
        onKeyDown={(e) => { if (e.key === 'Enter') insert(); }} />
      <div className="flex justify-end">
        <button type="button" onClick={insert} className={primaryButtonClass}>{t('editorInsert')}</button>
      </div>
    </div>
  );
}

function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const { t } = useTranslation('common');
  const [url, setUrl] = useState<string>(editor.getAttributes('link').href ?? '');

  function apply() {
    const href = url.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!href) chain.unsetLink().run();
    else if (editor.state.selection.empty && !editor.isActive('link')) {
      chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
    } else chain.setLink({ href }).run();
    onDone();
  }

  return (
    <div className="flex w-72 items-center gap-2 p-1">
      <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={inputClass}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }} />
      <button type="button" onClick={apply} className={primaryButtonClass}>{t('editorApply')}</button>
    </div>
  );
}

function Swatches({ colors, onPick, onClear, clearLabel }: {
  colors: string[]; onPick: (c: string) => void; onClear: () => void; clearLabel: string;
}) {
  return (
    <div className="w-44 p-1">
      <div className="mb-1.5 grid grid-cols-6 gap-1.5">
        {colors.map((c) => (
          <button key={c} type="button" onClick={() => onPick(c)} title={c}
            className="h-6 w-6 rounded-full border border-black/10 transition hover:scale-110" style={{ background: c }} />
        ))}
      </div>
      <MenuItem onClick={onClear}>{clearLabel}</MenuItem>
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

type PopoverKey = 'quran' | 'hadith' | 'honorific' | 'link' | 'highlight' | 'color' | 'heading' | 'align';

function Toolbar({ editor }: { editor: Editor }) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState<PopoverKey | null>(null);
  const toggle = (key: PopoverKey) => (o: boolean) => setOpen(o ? key : null);
  const close = () => setOpen(null);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
      link: e.isActive('link'), highlight: e.isActive('highlight'), color: e.getAttributes('textStyle').color as string | undefined,
      h1: e.isActive('heading', { level: 1 }), h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }),
      align: (['center', 'right', 'justify'] as const).find((a) => e.isActive({ textAlign: a })) ?? ('left' as const),
      bulletList: e.isActive('bulletList'), orderedList: e.isActive('orderedList'), blockquote: e.isActive('blockquote'), taskList: e.isActive('taskList'),
      canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  });

  const headingLabel = s.h1 ? 'H1' : s.h2 ? 'H2' : s.h3 ? 'H3' : 'H';
  const AlignIcon = ALIGN_ICONS[s.align];
  const chain = () => editor.chain().focus();

  return (
    <div className="flex items-center gap-0.5 gap-y-1 overflow-x-auto border-b border-slate-200 px-2 py-1.5 [scrollbar-width:none] sm:flex-wrap dark:border-slate-700">
      <Popover.Root open={open === 'quran'} onOpenChange={toggle('quran')}>
        <Popover.Trigger asChild>
          <button type="button" className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800">
            <BookOpen className="h-3.5 w-3.5" /> {t('editorQuran')}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content sideOffset={6} align="start" collisionPadding={12} onCloseAutoFocus={(e) => e.preventDefault()}
            className="z-[70] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <QuranInsertForm editor={editor} onDone={close} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <Popover.Root open={open === 'hadith'} onOpenChange={toggle('hadith')}>
        <Popover.Trigger asChild>
          <button type="button" className="ml-1 flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800">
            <ScrollText className="h-3.5 w-3.5" /> {t('editorHadith')}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content sideOffset={6} align="start" collisionPadding={12} onCloseAutoFocus={(e) => e.preventDefault()}
            className="z-[70] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <HadithInsertForm editor={editor} onDone={close} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <ToolbarPopover title={t('editorHonorifics')} open={open === 'honorific'} onOpenChange={toggle('honorific')}
        className="max-h-80 w-72 overflow-y-auto"
        trigger={<><span className="font-arabic text-lg leading-none">ﷺ</span><ChevronDown className="h-3 w-3" /></>}>
        {HONORIFICS.map((h) => (
          <MenuItem key={h.label} onClick={() => {
            chain().insertContent([{ type: 'text', text: h.ar, marks: [{ type: 'arabicText' }] }, { type: 'text', text: ' ' }]).run();
            close();
          }}>
            <span dir="rtl" className="min-w-16 font-arabic text-lg text-slate-900 dark:text-slate-100">{h.ar}</span>
            <span className="ml-auto text-xs text-slate-400">{h.label}</span>
          </MenuItem>
        ))}
      </ToolbarPopover>

      <Divider />
      <ToolbarButton title={t('editorUndo')} disabled={!s.canUndo} onClick={() => chain().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title={t('editorRedo')} disabled={!s.canRedo} onClick={() => chain().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>

      <Divider />
      <ToolbarButton title={t('editorBold')} active={s.bold} onClick={() => chain().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title={t('editorItalic')} active={s.italic} onClick={() => chain().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title={t('editorUnderline')} active={s.underline} onClick={() => chain().toggleUnderline().run()}><Underline className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title={t('editorStrike')} active={s.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <ToolbarPopover title={t('editorLink')} open={open === 'link'} onOpenChange={toggle('link')}
        trigger={<LinkIcon className={cn('h-4 w-4', s.link && 'text-emerald-600')} />}>
        <LinkForm editor={editor} onDone={close} />
      </ToolbarPopover>
      <ToolbarPopover title={t('editorHighlight')} open={open === 'highlight'} onOpenChange={toggle('highlight')}
        trigger={<Highlighter className={cn('h-4 w-4', s.highlight && 'text-amber-500')} />}>
        <Swatches colors={HIGHLIGHT_COLORS} clearLabel={t('editorRemove')}
          onPick={(color) => { chain().setHighlight({ color }).run(); close(); }}
          onClear={() => { chain().unsetHighlight().run(); close(); }} />
      </ToolbarPopover>
      <ToolbarPopover title={t('editorTextColor')} open={open === 'color'} onOpenChange={toggle('color')}
        trigger={<span className="flex flex-col items-center"><Baseline className="h-4 w-4" /><span className="-mt-0.5 h-0.5 w-4 rounded" style={{ background: s.color ?? 'currentColor' }} /></span>}>
        <Swatches colors={TEXT_COLORS} clearLabel={t('editorDefaultColor')}
          onPick={(color) => { chain().setColor(color).run(); close(); }}
          onClear={() => { chain().unsetColor().run(); close(); }} />
      </ToolbarPopover>

      <Divider />
      <ToolbarPopover title={t('editorHeading')} open={open === 'heading'} onOpenChange={toggle('heading')} className="w-40"
        trigger={<><span className="text-sm font-semibold">{headingLabel}</span><ChevronDown className="h-3 w-3" /></>}>
        <MenuItem active={!s.h1 && !s.h2 && !s.h3} onClick={() => { chain().setParagraph().run(); close(); }}>{t('editorParagraph')}</MenuItem>
        {([1, 2, 3] as const).map((level) => (
          <MenuItem key={level} active={s[`h${level}`]} onClick={() => { chain().toggleHeading({ level }).run(); close(); }}>
            <span className={cn('font-semibold', level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm')}>{t('editorHeading')} {level}</span>
          </MenuItem>
        ))}
      </ToolbarPopover>
      <ToolbarPopover title={t('editorAlign')} open={open === 'align'} onOpenChange={toggle('align')} className="flex gap-0.5"
        trigger={<><AlignIcon className="h-4 w-4" /><ChevronDown className="h-3 w-3" /></>}>
        {(Object.entries(ALIGN_ICONS) as [keyof typeof ALIGN_ICONS, typeof TextAlignStart][]).map(([a, Icon]) => (
          <ToolbarButton key={a} title={a} active={s.align === a} onClick={() => { chain().setTextAlign(a).run(); close(); }}>
            <Icon className="h-4 w-4" />
          </ToolbarButton>
        ))}
      </ToolbarPopover>

      <Divider />
      <ToolbarButton title={t('editorBulletList')} active={s.bulletList} onClick={() => chain().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title={t('editorNumberedList')} active={s.orderedList} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title={t('editorQuote')} active={s.blockquote} onClick={() => chain().toggleBlockquote().run()}><TextQuote className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title={t('editorChecklist')} active={s.taskList} onClick={() => chain().toggleTaskList().run()}><ListTodo className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title={t('editorDivider')} onClick={() => chain().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>
    </div>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export function RichTextEditor({ value, onChange, onSubmit, placeholder, autoFocus, className }: {
  value: string;
  onChange: (html: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  // Keep latest callbacks without recreating the editor.
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => { onChangeRef.current = onChange; onSubmitRef.current = onSubmit; });

  const editor = useEditor({
    extensions: [...richTextExtensions, Placeholder.configure({ placeholder })],
    content: toEditorHtml(value),
    immediatelyRender: false,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: { class: 'journal-prose min-h-40 max-h-[50vh] overflow-y-auto px-3.5 py-3 outline-none' },
      handleKeyDown: (_view, e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { onSubmitRef.current?.(); return true; }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => onChangeRef.current(e.isEmpty ? '' : e.getHTML()),
  });

  return (
    <div className={cn('overflow-hidden rounded-lg border border-slate-200 bg-slate-50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:ring-emerald-950', className)}>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

const noopSubscribe = () => () => {};

/** Read-only rendering of a saved entry (plain-text or HTML). */
export function RichTextView({ content, className }: { content: string; className?: string }) {
  // Sanitizing needs the DOM, so the server renders a plain-text fallback first.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const html = useMemo(() => (isClient ? sanitizeRichText(content) : plainTextToHtml(contentToPlainText(content))), [content, isClient]);
  return <div className={cn('journal-prose', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
