'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export function LoginButton({ dark }: { dark?: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        },
      });
      if (error) console.error('Login error:', error);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGoogleLogin}
      disabled={loading}
      size="lg"
      className={`gap-2 border-0 ${dark ? 'text-slate-950' : 'text-white'}`}
      style={{ background: 'linear-gradient(135deg, #d4af6e, #c9a020, #8b6510)' }}
    >
      {loading ? 'Redirecting...' : 'Sign in with Google'}
    </Button>
  );
}
