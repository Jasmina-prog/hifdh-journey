'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';
import type { Profile } from '@/lib/types';

const KEY = 'profile';

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => apiGet<Profile>('/api/profiles/me'),
    enabled,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Profile>) => apiPatch<Profile>('/api/profiles/me', patch),
    onSuccess: (data) => qc.setQueryData([KEY], data),
  });
}
