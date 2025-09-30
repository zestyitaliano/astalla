import { AuthMeResponse } from '@shared/api';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function fetchBackendProfile(userId: string): Promise<AuthMeResponse | null> {
  if (!userId) return null;
  try {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthMeResponse;
  } catch (error) {
    return null;
  }
}
