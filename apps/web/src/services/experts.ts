// PATH: apps/web/src/services/experts.ts
// WHAT: Experts API adapter for list/detail/create/ping flows
// WHY:  Centralizes DTO mapping and request payload contracts for experts UI
// RELEVANT: apps/web/src/pages/Experts.tsx,apps/web/src/pages/ExpertProfile.tsx

import { apiRequest } from './api/client';

export type ExpertItem = {
  id: string;
  name: string;
  roleTitle: string;
  email: string;
  status: string;
  onboardingProgress: number;
  voiceProfileStatus: string;
};

export type ExpertDetail = ExpertItem & {
  domain: string;
  publicTextUrls: string[];
  profileData: Record<string, unknown>;
};

type ExpertListResponse = {
  data: Array<{
    id: string;
    name: string;
    roleTitle: string;
    email: string;
    status: string;
    onboarding_progress: number;
    voice_profile_status: string;
  }>;
};

type ExpertDetailResponse = {
  id: string;
  name: string;
  roleTitle: string;
  email: string;
  domain: string;
  status: string;
  publicTextUrls: string[];
  voice_profile_status: string;
  voice_profile_data: Record<string, unknown>;
};

export type CreateExpertInput = {
  name: string;
  roleTitle: string;
  email: string;
  domain: 'medical' | 'legal' | 'education' | 'business';
  publicTextUrls: string[];
};

export const fetchExperts = async (token: string): Promise<ExpertItem[]> => {
  const response = await apiRequest<ExpertListResponse>('/api/v1/experts', { token });
  return response.data.map((item) => ({
    id: item.id,
    name: item.name,
    roleTitle: item.roleTitle,
    email: item.email,
    status: item.status,
    onboardingProgress: item.onboarding_progress,
    voiceProfileStatus: item.voice_profile_status,
  }));
};

export const fetchExpertDetail = async (token: string, id: string): Promise<ExpertDetail> => {
  const data = await apiRequest<ExpertDetailResponse>(`/api/v1/experts/${id}`, { token });
  return {
    id: data.id,
    name: data.name,
    roleTitle: data.roleTitle,
    email: data.email,
    domain: data.domain,
    status: data.status,
    publicTextUrls: data.publicTextUrls,
    onboardingProgress: 0,
    voiceProfileStatus: data.voice_profile_status,
    profileData: data.voice_profile_data,
  };
};

export const createExpert = async (token: string, input: CreateExpertInput): Promise<string> => {
  const result = await apiRequest<{ id: string }>('/api/v1/experts', {
    method: 'POST',
    token,
    body: {
      name: input.name,
      role_title: input.roleTitle,
      email: input.email,
      domain: input.domain,
      public_text_urls: input.publicTextUrls,
    },
  });
  return result.id;
};

export const requestExpertPing = async (token: string, id: string): Promise<void> => {
  await apiRequest<{ ok: boolean }>(`/api/v1/experts/${id}/ping`, {
    method: 'POST',
    token,
  });
};
