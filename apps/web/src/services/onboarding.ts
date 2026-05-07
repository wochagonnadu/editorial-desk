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
  currentStep: OnboardingStep | null;
  startedAt?: string | null;
  skippedAt?: string | null;
  completedAt?: string | null;
};

type OnboardingResponse = {
  status: OnboardingStatus;
  currentStep?: OnboardingStep | null;
  startedAt?: string | null;
  skippedAt?: string | null;
  completedAt?: string | null;
};

const onboardingStatuses: OnboardingStatus[] = [
  'not_started',
  'in_progress',
  'skipped',
  'completed',
];

const onboardingSteps: OnboardingStep[] = [
  'welcome',
  'workspace_basics',
  'team_setup',
  'experts_and_first_workflow',
];

const isOnboardingStatus = (value: unknown): value is OnboardingStatus =>
  typeof value === 'string' && onboardingStatuses.includes(value as OnboardingStatus);

const isOnboardingStep = (value: unknown): value is OnboardingStep =>
  typeof value === 'string' && onboardingSteps.includes(value as OnboardingStep);

const parseOnboardingState = (raw: unknown): OnboardingState => {
  const state = mapDto<OnboardingResponse>(raw);
  if (!isOnboardingStatus(state.status)) {
    throw new Error('Invalid onboarding status');
  }
  if (state.currentStep !== null && state.currentStep !== undefined && !isOnboardingStep(state.currentStep)) {
    throw new Error('Invalid onboarding step');
  }
  if (state.status !== 'completed' && !isOnboardingStep(state.currentStep)) {
    throw new Error('Invalid onboarding step');
  }
  return {
    ...state,
    currentStep: state.currentStep ?? null,
  };
};

export const fetchOnboardingState = async (token: string): Promise<OnboardingState> => {
  const raw = await apiRequest<unknown>('/api/v1/users/me/onboarding', { token });
  return parseOnboardingState(raw);
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
  return parseOnboardingState(raw);
};
