import { getAccessToken, refreshAccessToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type ListMeta = { page: number; limit: number; total: number; totalPages: number };
export type ErrorDetail = { field: string; message: string };

export class ApiError extends Error {
  status: number;
  details?: ErrorDetail[];
  constructor(message: string, status: number, details?: ErrorDetail[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  allowRetry = true,
): Promise<{ data: T; meta?: ListMeta }> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (init.body != null) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && allowRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, init, false);
    if (typeof window !== 'undefined') window.location.href = '/';
    throw new ApiError('Session expired', 401);
  }

  if (res.status === 204) {
    return { data: undefined as T };
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    throw new ApiError(json?.message ?? 'Request failed', res.status, json?.details);
  }

  return { data: json.data as T, meta: json.meta as ListMeta | undefined };
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' }).then((r) => r.data);
}

export function apiGetList<T>(path: string): Promise<{ data: T[]; meta: ListMeta }> {
  return request<T[]>(path, { method: 'GET' }).then((r) => ({ data: r.data, meta: r.meta! }));
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined }).then(
    (r) => r.data,
  );
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }).then((r) => r.data);
}

export function apiDelete(path: string): Promise<void> {
  return request<void>(path, { method: 'DELETE' }).then(() => undefined);
}
