// PATH: apps/web/src/services/first-run.ts
// WHAT: Shared first-run route resolver for setup and onboarding tour
// WHY:  Keeps post-verify and guarded page redirects consistent across web entrypoints
// RELEVANT: apps/web/src/pages/Login.tsx,apps/web/src/pages/ManagerSetup.tsx,apps/web/src/services/user.ts

import { fetchOnboardingState } from './onboarding';
import { fetchSetupStatus } from './user';

export const resolveFirstRunPath = async (token: string, fallbackPath = '/app') => {
  const setup = await fetchSetupStatus(token).catch(() => null);
  if (setup?.setupRequired) return '/app/setup';

  const onboarding = await fetchOnboardingState(token).catch(() => null);
  if (onboarding && ['not_started', 'in_progress'].includes(onboarding.status)) {
    return '/app/onboarding';
  }

  return fallbackPath;
};
