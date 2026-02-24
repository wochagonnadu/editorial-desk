// PATH: apps/web/src/services/api.ts
// WHAT: Typed API client for auth and company endpoints
// WHY:  Centralizes HTTP calls and auth header handling
// RELEVANT: apps/web/src/context/AuthContext.tsx,apps/web/src/App.tsx

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1';

export interface SessionUser {
  id: string;
  email: string;
  role: 'owner' | 'manager';
  company_id: string;
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? 'Request failed');
  }
  return (await response.json()) as T;
};

export const apiClient = {
  login(email: string): Promise<{ message: string }> {
    return request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },
  verify(token: string): Promise<{ token: string; user: SessionUser }> {
    return request(`/auth/verify?token=${encodeURIComponent(token)}`);
  },
  getCompanyMe(token: string): Promise<{ id: string; name: string; domain: string; language: string }> {
    return request('/companies/me', { headers: { authorization: `Bearer ${token}` } });
  },
};
