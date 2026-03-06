// PATH: services/api/src/routes/user-onboarding-contract.ts
// WHAT: Parsing and mapping helpers for manager onboarding state
// WHY:  Keeps user onboarding route small and explicit about allowed states
// RELEVANT: services/api/src/routes/users.ts,services/api/src/providers/db/schema/company-user.ts

import { AppError } from '../core/errors.js';
import { userTable } from '../providers/db/index.js';

const statuses = ['not_started', 'in_progress', 'skipped', 'completed'] as const;
const steps = ['welcome', 'workspace_basics', 'team_setup', 'experts_and_first_workflow'] as const;

export type OnboardingStatus = (typeof statuses)[number];
export type OnboardingStep = (typeof steps)[number];
type UserRow = typeof userTable.$inferSelect;
type UserPatch = Partial<typeof userTable.$inferInsert>;

export const mapOnboardingState = (user: UserRow) => ({
  status: (user.onboardingStatus as OnboardingStatus) || 'not_started',
  current_step: user.onboardingCurrentStep || 'welcome',
  started_at: user.onboardingStartedAt,
  skipped_at: user.onboardingSkippedAt,
  completed_at: user.onboardingCompletedAt,
});

const parseStatus = (value: unknown): OnboardingStatus => {
  if (typeof value === 'string' && statuses.includes(value as OnboardingStatus)) {
    return value as OnboardingStatus;
  }
  throw new AppError(400, 'VALIDATION_ERROR', 'Invalid onboarding status');
};

const parseStep = (value: unknown): OnboardingStep => {
  if (typeof value === 'string' && steps.includes(value as OnboardingStep))
    return value as OnboardingStep;
  throw new AppError(400, 'VALIDATION_ERROR', 'Invalid onboarding step');
};

export const buildOnboardingUpdate = (body: Record<string, unknown>, user: UserRow): UserPatch => {
  const status = parseStatus(body.status);
  const fallbackStep = (user.onboardingCurrentStep as OnboardingStep | null) || 'welcome';
  const currentStep = body.current_step === undefined ? fallbackStep : parseStep(body.current_step);
  const startedAt = user.onboardingStartedAt || new Date();

  if (status === 'not_started') {
    return {
      onboardingStatus: status,
      onboardingCurrentStep: 'welcome',
      onboardingStartedAt: null,
      onboardingSkippedAt: null,
      onboardingCompletedAt: null,
    };
  }
  if (status === 'in_progress') {
    return {
      onboardingStatus: status,
      onboardingCurrentStep: currentStep,
      onboardingStartedAt: startedAt,
      onboardingSkippedAt: null,
      onboardingCompletedAt: null,
    };
  }
  if (status === 'skipped') {
    return {
      onboardingStatus: status,
      onboardingCurrentStep: currentStep,
      onboardingStartedAt: startedAt,
      onboardingSkippedAt: new Date(),
      onboardingCompletedAt: null,
    };
  }
  return {
    onboardingStatus: status,
    onboardingCurrentStep: null,
    onboardingStartedAt: startedAt,
    onboardingSkippedAt: null,
    onboardingCompletedAt: new Date(),
  };
};
