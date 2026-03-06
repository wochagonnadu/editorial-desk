// PATH: apps/web/src/services/onboarding.ts
// WHAT: Web adapter for manager onboarding state fetch and updates
// WHY:  Keeps first-run routing and actions tied to a server-side source of truth
// RELEVANT: apps/web/src/pages/ManagerOnboarding.tsx,apps/web/src/pages/Home.tsx

import { apiRequest } from './api/client';
import { mapDto } from './api/mapper';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'skipped' | 'completed';
export type OnboardingStep =
  | 'welcome'
  | 'workspace_basics'
  | 'team_setup'
  | 'experts_and_first_workflow';

export type OnboardingState = {
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  startedAt?: string | null;
  skippedAt?: string | null;
  completedAt?: string | null;
};

type OnboardingResponse = {
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  startedAt?: string | null;
  skippedAt?: string | null;
  completedAt?: string | null;
};

export const fetchOnboardingState = async (token: string): Promise<OnboardingState> => {
  const raw = await apiRequest<unknown>('/api/v1/users/me/onboarding', { token });
  return mapDto<OnboardingResponse>(raw);
};

export const updateOnboardingState = async (
  token: string,
  input: { status: OnboardingStatus; current_step?: OnboardingStep },
): Promise<OnboardingState> => {
  const raw = await apiRequest<unknown>('/api/v1/users/me/onboarding', {
    method: 'PATCH',
    token,
    body: input,
  });
  return mapDto<OnboardingResponse>(raw);
};
