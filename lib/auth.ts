const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  profile: { fullName: string | null; dailyGoalPages: number | null } | null;
};

// A guest has no session cookie, so asking the API to refresh it only costs a failed
// request. This hint ('1' signed in, '0' known guest, unset = not known yet) lets
// guests skip that wait. The cookie itself is httpOnly, so the page can't read it.
const SESSION_HINT_KEY = 'hifdh-session';

function readSessionHint(): string | null {
  try {
    return localStorage.getItem(SESSION_HINT_KEY);
  } catch {
    return null;
  }
}

function writeSessionHint(value: '0' | '1') {
  try {
    localStorage.setItem(SESSION_HINT_KEY, value);
  } catch {
    // storage unavailable: every load then checks the session, as before
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) writeSessionHint('1');
}

export function login() {
  window.location.href = `${API_URL}/api/auth/google`;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } finally {
    setAccessToken(null);
    writeSessionHint('0');
  }
}

export async function logoutAll(): Promise<void> {
  try {
    const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    await fetch(`${API_URL}/api/auth/logout-all`, { method: 'POST', credentials: 'include', headers });
  } finally {
    setAccessToken(null);
    writeSessionHint('0');
  }
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      setAccessToken(null);
      if (res.status === 401) writeSessionHint('0');
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
  if (!accessToken && readSessionHint() === '0') return Promise.resolve(null);
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
