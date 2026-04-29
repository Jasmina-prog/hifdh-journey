const CONTENT_BASE = 'https://api.quran.foundation/content/api/v4';
const USER_BASE = process.env.NEXT_PUBLIC_QF_USER_BASE_URL || 'https://api.quran.foundation/v1';
const AUTH_HEADERS = process.env.NEXT_PUBLIC_QF_CLIENT_ID && process.env.NEXT_PUBLIC_QF_AUTH_TOKEN
  ? {
      'x-client-id': process.env.NEXT_PUBLIC_QF_CLIENT_ID,
      'x-auth-token': process.env.NEXT_PUBLIC_QF_AUTH_TOKEN,
      'Content-Type': 'application/json',
    }
  : undefined;

async function fetchQuranFoundation<T>(url: string, init?: RequestInit) {
  if (!AUTH_HEADERS) return null;
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...AUTH_HEADERS,
        ...init?.headers,
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error('Quran Foundation fetch error:', error);
    return null;
  }
}

export async function getQFChapters() {
  return fetchQuranFoundation<{ chapters: Array<{ id: number; chapter_number: number; name_simple: string; name_arabic: string }> }>(
    `${CONTENT_BASE}/chapters`
  );
}

export async function getRandomQFVerse() {
  return fetchQuranFoundation<{ verse: { verse_key: string; text_uthmani: string; translations?: Array<{ text: string }> } }>(
    `${CONTENT_BASE}/verses/random`
  );
}

export async function getHadithsByAyah(ayahKey: string) {
  return fetchQuranFoundation<{ hadiths: Array<{ hadith_text: string; hadith_number: string }> }>(
    `${CONTENT_BASE}/hadith_references/by_ayah/${encodeURIComponent(ayahKey)}/hadiths`
  );
}

export async function getQFUserGoalPlan() {
  if (!AUTH_HEADERS) return null;
  return fetchQuranFoundation<{ data: any }>(`${USER_BASE}/goals/get-todays-plan`);
}

export async function getQFCurrentStreak() {
  if (!AUTH_HEADERS) return null;
  return fetchQuranFoundation<{ data: any }>(`${USER_BASE}/streaks/current-streak-days`);
}

export async function getQFActivityDays() {
  if (!AUTH_HEADERS) return null;
  return fetchQuranFoundation<{ data: any }>(`${USER_BASE}/activity-days`);
}
