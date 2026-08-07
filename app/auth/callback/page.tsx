'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAccessToken } from '@/lib/auth';
import { useAuth } from '@/components/AuthProvider';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('access_token');
    const authError = searchParams.get('error');

    if (authError) {
      setError(authError);
      return;
    }

    if (token) {
      setAccessToken(token);
      refreshUser().finally(() => router.replace('/'));
    } else {
      router.replace('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sign-in failed</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
        <button
          type="button"
          onClick={() => router.replace('/')}
          className="mt-2 rounded-full px-5 py-2 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #d4af6e, #c9a020, #8b6510)' }}
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="animate-pulse text-slate-400">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>}>
      <CallbackContent />
    </Suspense>
  );
}
