'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useRequireAuth(): { user: User | null; loading: boolean } {
  const router = useRouter();
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        const path = typeof window !== 'undefined' ? window.location.pathname : '/';
        router.replace(`/?from=${encodeURIComponent(path)}`);
      } else {
        setState({ user: data.user, loading: false });
      }
    });
  }, [router]);

  return state;
}
