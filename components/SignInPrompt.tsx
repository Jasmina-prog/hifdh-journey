'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Cloud, Lock, Smartphone, Sparkles, X } from 'lucide-react';
import { useAuth } from './AuthProvider';

// Pages are open to everyone. An account is only needed for actions that save
// something, so those actions call requireSignIn() and stop when it says no.

export type SignInReason = 'map' | 'journal' | 'memorize' | 'generic';

const REASON_KEYS: Record<SignInReason, string> = {
  map: 'signInReasonMap',
  journal: 'signInReasonJournal',
  memorize: 'signInReasonMemorize',
  generic: 'signInReasonGeneric',
};

const GOLD = 'linear-gradient(135deg, #d4af6e, #c9a020, #8b6510)';

type SignInPromptValue = {
  /** True when the user is signed in. Otherwise opens the sign-in dialog and returns false. */
  requireSignIn: (reason?: SignInReason) => boolean;
};

const SignInPromptContext = createContext<SignInPromptValue | null>(null);

export function SignInPromptProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [reason, setReason] = useState<SignInReason | null>(null);

  const requireSignIn = useCallback(
    (why: SignInReason = 'generic') => {
      if (isAuthenticated) return true;
      // Still finding out who the user is. Don't show a dialog to someone who is signed in.
      if (!isLoading) setReason(why);
      return false;
    },
    [isAuthenticated, isLoading],
  );

  const value = useMemo(() => ({ requireSignIn }), [requireSignIn]);

  return (
    <SignInPromptContext.Provider value={value}>
      {children}
      <SignInDialog reason={reason} onClose={() => setReason(null)} />
    </SignInPromptContext.Provider>
  );
}

export function useSignInPrompt(): SignInPromptValue {
  const ctx = useContext(SignInPromptContext);
  if (!ctx) throw new Error('useSignInPrompt must be used within SignInPromptProvider');
  return ctx;
}

function SignInDialog({ reason, onClose }: { reason: SignInReason | null; onClose: () => void }) {
  const { t } = useTranslation('common');
  const { login } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const benefits = [
    { icon: Cloud, text: t('signInBenefitProgress') },
    { icon: Smartphone, text: t('signInBenefitDevices') },
    { icon: Sparkles, text: t('signInBenefitFree') },
  ];

  return (
    <Dialog.Root open={reason !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content
          // Focus must not return to the field that opened this, or it would reopen.
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl backdrop-blur-xl focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/90 sm:p-8">
          <Dialog.Close
            aria-label={t('close')}
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" aria-hidden />
          </Dialog.Close>

          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: GOLD }}
          >
            <Lock className="h-6 w-6" aria-hidden />
          </div>

          <Dialog.Title className="mt-5 text-center text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('signInPromptTitle')}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-center text-sm leading-6 text-slate-600 dark:text-slate-400">
            {reason && t(REASON_KEYS[reason])}
          </Dialog.Description>

          <ul className="mt-5 space-y-2.5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <Icon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={redirecting}
            onClick={() => {
              setRedirecting(true);
              login();
            }}
            className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow transition hover:brightness-105 disabled:opacity-60"
            style={{ background: GOLD }}
          >
            {redirecting ? t('redirecting') : t('signInWithGoogle')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t('signInPromptNotNow')}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A slim notice for guests at the top of a page, in place of a locked screen. */
export function GuestBanner({ message, className = '' }: { message: string; className?: string }) {
  const { t } = useTranslation('common');
  const { isAuthenticated, isLoading, login } = useAuth();
  if (isLoading || isAuthenticated) return null;

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 backdrop-blur-sm dark:border-amber-700/30 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${className}`}>
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t('guestBannerTitle')}</p>
          <p className="text-sm text-amber-800/90 dark:text-amber-300/80">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={login}
        className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        style={{ background: GOLD }}
      >
        {t('startYourHifdh')}
      </button>
    </div>
  );
}
