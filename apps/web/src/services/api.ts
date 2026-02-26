// PATH: apps/web/src/services/api.ts
// WHAT: Typed API client for auth, company, and expert onboarding
// WHY:  Centralizes HTTP calls and auth header handling
// RELEVANT: apps/web/src/context/AuthContext.tsx,apps/web/src/pages/ExpertsPage.tsx

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1';

export interface SessionUser {
  id: string;
  email: string;
  role: 'owner' | 'manager';
  company_id: string;
}

export interface ExpertListItem {
  id: string;
  name: string;
  roleTitle: string;
  status: string;
  voiceProfileStatus: string;
  onboardingProgress: number;
  voiceReadiness?: number;
  lastResponseAt?: string;
  draftsInProgress?: number;
}

export interface ExpertDetail {
  id: string;
  name: string;
  roleTitle: string;
  status: string;
  voiceProfileStatus: string;
  email: string;
  domain: string;
  publicTextUrls: string[];
  voiceProfileData: Record<string, unknown>;
}

export interface OnboardingStep {
  stepNumber: number;
  status: string;
}

const authHeaders = (token: string): Record<string, string> => ({
  authorization: `Bearer ${token}`,
});

const mapExpert = (value: Record<string, unknown>): ExpertListItem => ({
  id: String(value.id),
  name: String(value.name),
  roleTitle: String(value.roleTitle ?? value.role_title ?? ''),
  status: String(value.status),
  voiceProfileStatus: String(value.voice_profile_status ?? value.voiceProfileStatus ?? 'draft'),
  onboardingProgress: Number(value.onboarding_progress ?? value.onboardingProgress ?? 0),
  voiceReadiness: Number(value.voice_readiness ?? value.voiceReadiness ?? 0),
  lastResponseAt: value.last_response_at ? String(value.last_response_at) : undefined,
  draftsInProgress: Number(value.drafts_in_progress ?? value.draftsInProgress ?? 0),
});

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
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
  getCompanyMe(
    token: string,
  ): Promise<{ id: string; name: string; domain: string; language: string }> {
    return request('/companies/me', { headers: authHeaders(token) });
  },
  async getExperts(token: string): Promise<{ data: ExpertListItem[] }> {
    const response = await request<{ data: Record<string, unknown>[] }>('/experts', {
      headers: authHeaders(token),
    });
    return { data: response.data.map(mapExpert) };
  },
  async getExpert(token: string, id: string): Promise<ExpertDetail> {
    const response = await request<Record<string, unknown>>(`/experts/${id}`, {
      headers: authHeaders(token),
    });
    const rawUrls = response.publicTextUrls ?? response.public_text_urls;
    const publicTextUrls = Array.isArray(rawUrls) ? rawUrls.map(String) : [];
    return {
      ...mapExpert(response),
      email: String(response.email),
      domain: String(response.domain),
      publicTextUrls,
      voiceProfileData:
        typeof response.voice_profile_data === 'object' && response.voice_profile_data
          ? (response.voice_profile_data as Record<string, unknown>)
          : {},
    };
  },
  getExpertOnboarding(
    token: string,
    id: string,
  ): Promise<{ expert_id: string; steps: OnboardingStep[] }> {
    return request(`/experts/${id}/onboarding`, { headers: authHeaders(token) });
  },
  createExpert(
    token: string,
    payload: {
      name: string;
      role_title: string;
      email: string;
      domain: string;
      public_text_urls?: string[];
    },
  ): Promise<{ id: string; status: string }> {
    return request('/experts', {
      method: 'POST',
      headers: { ...authHeaders(token), 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  pingExpert(token: string, id: string): Promise<{ ok: boolean }> {
    return request(`/experts/${id}/ping`, { method: 'POST', headers: authHeaders(token) });
  },
};
