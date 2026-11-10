'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// v2: everyone sees the new guide once, even if they closed the old inline one.
const SEEN_KEY = 'memorize-guide-seen-v2';
const GOLD_DEEP = 'linear-gradient(135deg, #b8902e, #96720f 55%, #6f510b)';
const STEPS = [1, 2, 3, 4, 5] as const;

/**
 * The "Qo'llanma" modal. It opens by itself for a first-time visitor so they read how the
 * page works before they start. A prominent button reopens it, and stays eye-catching
 * until it has been read once.
 */
export function Guide({ micSupported }: { micSupported: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = !!localStorage.getItem(SEEN_KEY);
    } catch {
      // storage unavailable: treat as a first visit
    }
    // Browser storage can't be read while rendering, so this settles after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen(alreadySeen);
    if (!alreadySeen) setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setSeen(true);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // storage unavailable
    }
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="guide-toggle"
        onClick={() => setOpen(true)}
        className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
          seen
            ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50'
            : 'text-white shadow-lg shadow-amber-600/30 hover:brightness-105 motion-safe:animate-pulse'
        }`}
        style={seen ? undefined : { background: GOLD_DEEP }}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M10 2.5c-2.1-1.3-4.6-1.7-7-1.4v13c2.4-.3 4.9.1 7 1.4 2.1-1.3 4.6-1.7 7-1.4v-13c-2.4-.3-4.9.1-7 1.4Z" />
        </svg>
        {t('guideShow')}
        {!seen && <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs">{t('guideStartHere')}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            data-testid="guide"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-[#faf7f2] shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
          >
            <div className="px-6 py-6 text-white sm:px-10 sm:py-8" style={{ background: GOLD_DEEP }}>
              <h2 id="guide-title" className="text-2xl font-bold sm:text-3xl">{t('guideTitle')}</h2>
              <p className="mt-2 max-w-2xl text-sm text-amber-50 sm:text-base">{t('guideIntro')}</p>
            </div>

            <div
              role="note"
              data-testid="guide-disclaimer"
              className="mx-6 mt-6 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100 sm:mx-10"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden>
                <path fillRule="evenodd" d="M8.49 2.6a1.7 1.7 0 0 1 3.02 0l6.1 11.6A1.7 1.7 0 0 1 16.1 16.7H3.9a1.7 1.7 0 0 1-1.5-2.5L8.49 2.6ZM10 7a.9.9 0 0 0-.9.9v3a.9.9 0 1 0 1.8 0v-3A.9.9 0 0 0 10 7Zm0 7.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold">{t('guideDisclaimerTitle')}</p>
                <p className="mt-1 text-sm leading-relaxed text-amber-900 dark:text-amber-200/90">{t('guideDisclaimerText')}</p>
              </div>
            </div>

            <ol className="grid gap-3 px-6 py-6 sm:grid-cols-2 sm:px-10">
              {STEPS.map((step) => (
                <li
                  key={step}
                  className={`flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50 ${step === 5 ? 'sm:col-span-2' : ''}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold text-white" style={{ background: GOLD_DEEP }}>{step}</span>
                  <div>
                    <p className="font-semibold">{t(`guideStep${step}Title`)}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t(`guideStep${step}Text`)}</p>
                  </div>
                </li>
              ))}
              {!micSupported && (
                <li className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200 sm:col-span-2">
                  {t('guideNoMic')}
                </li>
              )}
            </ol>

            <div className="sticky bottom-0 flex justify-end border-t border-slate-200 bg-[#faf7f2]/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-10">
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                style={{ background: GOLD_DEEP }}
                className="h-11 w-full rounded-xl px-8 font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:w-auto"
              >
                {t('guideGotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
