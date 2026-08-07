'use client';

import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';

type FeedbackInput = { type?: string; message: string; name?: string; email?: string };

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (body: FeedbackInput) => apiPost<void>('/api/feedback', body),
  });
}
