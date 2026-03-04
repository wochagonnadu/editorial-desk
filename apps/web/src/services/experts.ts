// PATH: apps/web/src/services/experts.ts
// WHAT: Experts API adapter for list/detail/create/ping flows
// WHY:  Centralizes DTO mapping and request payload contracts for experts UI
// RELEVANT: apps/web/src/pages/Experts.tsx,apps/web/src/pages/ExpertProfile.tsx

import { apiRequest } from './api/client';
import { mapDto } from './api/mapper';

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
  onboardingStatus: 'active' | 'stalled' | 'completed';
  currentStep: number | null;
  lastEventAt: string | null;
  stalledReason: string | null;
};

type ExpertListResponse = {
  data: Array<{
    id: string;
    name: string;
    roleTitle: string;
    email: string;
    status: string;
    onboardingProgress: number;
    voiceProfileStatus: string;
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
  voiceProfileStatus: string;
  voiceProfileData: Record<string, unknown>;
};

type OnboardingStatusResponse = {
  onboardingStatus: 'active' | 'stalled' | 'completed';
  currentStep: number | null;
  lastEventAt: string | null;
  stalledReason: string | null;
  steps: Array<{ status: string }>;
};

export type CreateExpertInput = {
  name: string;
  roleTitle: string;
  email: string;
  domain: 'medical' | 'legal' | 'education' | 'business';
  publicTextUrls: string[];
};

export const fetchExperts = async (token: string): Promise<ExpertItem[]> => {
  const raw = await apiRequest<unknown>('/api/v1/experts', { token });
  const response = mapDto<ExpertListResponse>(raw);
  return response.data.map((item) => ({
    id: item.id,
    name: item.name,
    roleTitle: item.roleTitle,
    email: item.email,
    status: item.status,
    onboardingProgress: item.onboardingProgress,
    voiceProfileStatus: item.voiceProfileStatus,
  }));
};

export const fetchExpertDetail = async (token: string, id: string): Promise<ExpertDetail> => {
  const [rawDetail, rawOnboarding] = await Promise.all([
    apiRequest<unknown>(`/api/v1/experts/${id}`, { token }),
    apiRequest<unknown>(`/api/v1/experts/${id}/onboarding`, { token }),
  ]);
  const data = mapDto<ExpertDetailResponse>(rawDetail);
  const onboarding = mapDto<OnboardingStatusResponse>(rawOnboarding);
  return {
    id: data.id,
    name: data.name,
    roleTitle: data.roleTitle,
    email: data.email,
    domain: data.domain,
    status: data.status,
    publicTextUrls: data.publicTextUrls,
    onboardingProgress: onboarding.steps.filter((step) => step.status === 'replied').length,
    voiceProfileStatus: data.voiceProfileStatus,
    profileData: data.voiceProfileData,
    onboardingStatus: onboarding.onboardingStatus,
    currentStep: onboarding.currentStep,
    lastEventAt: onboarding.lastEventAt,
    stalledReason: onboarding.stalledReason,
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
