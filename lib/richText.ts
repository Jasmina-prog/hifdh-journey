import { Mark, Node, generateHTML, generateJSON, mergeAttributes, type Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { TaskList, TaskItem } from '@tiptap/extension-list';

// ─── Custom nodes ─────────────────────────────────────────────────────────────

// Inline Arabic phrase (ﷺ, رضي الله عنه …) rendered in the Arabic font.
export const ArabicText = Mark.create({
  name: 'arabicText',
  inclusive: false,
  parseHTML() { return [{ tag: 'span[lang="ar"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['span', mergeAttributes(HTMLAttributes, { lang: 'ar', class: 'rt-arabic' }), 0]; },
});

// Quran ayah(s) block. The reference is shown via CSS from data-ref.
export const QuranVerse = Node.create({
  name: 'quranVerse',
  group: 'block',
  content: 'text*',
  marks: '',
  defining: true,
  addAttributes() {
    return {
      reference: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-ref') ?? '',
        renderHTML: (attrs) => ({ 'data-ref': attrs.reference }),
      },
    };
  },
  parseHTML() { return [{ tag: 'figure[data-type="quran-verse"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes, { 'data-type': 'quran-verse', dir: 'rtl', lang: 'ar' }), 0];
  },
});

// Hadith block. The user writes the text inside; source is shown via CSS.
export const Hadith = Node.create({
  name: 'hadith',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return {
      source: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-source') ?? '',
        renderHTML: (attrs) => ({ 'data-source': attrs.source }),
      },
    };
  },
  parseHTML() { return [{ tag: 'aside[data-type="hadith"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes, { 'data-type': 'hadith' }), 0];
  },
});

// ─── Shared extension list (editor + rendering) ───────────────────────────────

export const richTextExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  ArabicText,
  QuranVerse,
  Hadith,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Entries written before the editor existed are plain text.
export function isRichText(content: string): boolean {
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|figure|aside|hr)[\s>]/i.test(content);
}

export function plainTextToHtml(text: string): string {
  return text.split(/\n{2,}/).map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`).join('');
}

/** HTML ready for the editor, converting legacy plain-text entries. */
export function toEditorHtml(content: string): string {
  return isRichText(content) ? content : plainTextToHtml(content);
}

/** Re-serialize through the editor schema so only known tags/attributes survive. */
export function sanitizeRichText(content: string): string {
  const html = toEditorHtml(content);
  if (typeof window === 'undefined') return plainTextToHtml(contentToPlainText(content));
  return generateHTML(generateJSON(html, richTextExtensions), richTextExtensions);
}

/** Plain text for previews, search and empty-checks. */
export function contentToPlainText(content: string): string {
  if (!isRichText(content)) return content;
  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|figure|aside|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
