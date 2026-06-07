'use client';

// Supabase table required — run once in the SQL editor:
// CREATE TABLE feedback (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
//   email text,
//   name text,
//   type text,
//   message text NOT NULL,
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Anyone can submit feedback" ON feedback FOR INSERT TO public WITH CHECK (true);
//
// If the table already exists, add the new columns:
// ALTER TABLE feedback ADD COLUMN IF NOT EXISTS email text;
// ALTER TABLE feedback ADD COLUMN IF NOT EXISTS name text;

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const gold = 'linear-gradient(135deg, #d4af6e, #c9a020, #8b6510)';

const TYPES = [
  {
    id: 'idea',
    label: 'Idea',
    hint: 'What feature would make this better?',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.355a7.5 7.5 0 0 1-3 0M9 9a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" />
      </svg>
    ),
  },
  {
    id: 'question',
    label: 'Question',
    hint: "Something you're wondering about?",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    id: 'issue',
    label: 'Issue',
    hint: 'What went wrong?',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    id: 'love',
    label: 'Love',
    hint: 'What do you love about this?',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
];

type Status = 'idle' | 'sending' | 'done';

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('idea');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-feedback', handler);
    return () => window.removeEventListener('open-feedback', handler);
  }, []);

  // Focus textarea when panel opens
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 120);
  }, [open]);

  const hint = TYPES.find((t) => t.id === type)?.hint ?? '';

  const close = () => {
    setOpen(false);
    setTimeout(() => { setMessage(''); setType('idea'); setStatus('idle'); }, 300);
  };

  const switchType = (id: string) => {
    setType(id);
    // Keep textarea active — restore focus after React re-render
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submit = async () => {
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      // getSession() reads from local storage — no network round-trip
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const name =
        user?.user_metadata?.full_name ??
        user?.user_metadata?.name ??
        user?.user_metadata?.display_name ??
        null;
      await supabase.from('feedback').insert({
        type,
        message: message.trim(),
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        name,
      });
    } catch (e) {
      console.error('Feedback submit:', e);
    }
    setStatus('done');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-85 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Share your thoughts</p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Questions, ideas, or anything — we read every one.</p>
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {status === 'done' ? (
                /* ── Success ──────────────────────────────────────────── */
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center gap-4 px-6 py-12 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: gold }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-7 w-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">JazakAllahu khayran!</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your feedback was received.</p>
                  </div>
                  <button
                    onClick={close}
                    className="mt-1 rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </motion.div>
              ) : (
                /* ── Form ─────────────────────────────────────────────── */
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 px-5 py-5"
                >
                  {/* Type chips */}
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t.id}
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent textarea blur
                          switchType(t.id);
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          type === t.id
                            ? 'scale-105 text-slate-950 shadow-sm'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                        }`}
                        style={type === t.id ? { background: gold } : {}}
                      >
                        {t.icon}
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Textarea */}
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={hint}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-amber-500 dark:focus:bg-slate-800/80"
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                    />
                    <p className="absolute bottom-2.5 right-3 select-none text-[11px] text-slate-300 dark:text-slate-600">
                      ⌘↵ to send
                    </p>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={submit}
                    disabled={!message.trim() || status === 'sending'}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-slate-950 shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                    style={{ background: gold }}
                  >
                    {status === 'sending' ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A10 10 0 002 12h2z" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        Send feedback
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => (open ? close() : setOpen(true))}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl"
        style={{ background: gold }}
        aria-label="Open feedback"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </motion.svg>
          )}
        </AnimatePresence>
        <motion.span key={open ? 'close' : 'open'} initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} transition={{ duration: 0.15 }}>
          {open ? 'Close' : 'Feedback'}
        </motion.span>
      </motion.button>

    </div>
  );
}
