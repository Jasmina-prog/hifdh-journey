const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  profile: { fullName: string | null; dailyGoalPages: number | null } | null;
};

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function login() {
  window.location.href = `${API_URL}/api/auth/google`;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } finally {
    setAccessToken(null);
  }
}

export async function logoutAll(): Promise<void> {
  try {
    const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    await fetch(`${API_URL}/api/auth/logout-all`, { method: 'POST', credentials: 'include', headers });
  } finally {
    setAccessToken(null);
  }
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      setAccessToken(null);
      return null;
    }
    const json = await res.json();
    const token: string | null = json?.data?.accessToken ?? null;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  }
}

// Refresh token rotation invalidates the previous token on every call, so
// concurrent 401s must share one in-flight refresh or the backend treats
// reuse of the rotated-out token as theft and kills every session.
export function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
