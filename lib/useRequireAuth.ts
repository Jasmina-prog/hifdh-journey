'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import type { AuthUser } from '@/lib/auth';

export function useRequireAuth(): { user: AuthUser | null; loading: boolean } {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '/';
      router.replace(`/?from=${encodeURIComponent(path)}`);
    }
  }, [isLoading, isAuthenticated, router]);

  return { user, loading: isLoading };
}
