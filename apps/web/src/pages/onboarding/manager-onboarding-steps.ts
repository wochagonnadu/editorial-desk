// PATH: apps/web/src/pages/onboarding/manager-onboarding-steps.ts
// WHAT: Static step definitions for manager first-run onboarding
// WHY:  Keeps onboarding page focused on state changes instead of copy wiring
// RELEVANT: apps/web/src/pages/ManagerOnboarding.tsx,apps/web/src/services/onboarding.ts

import type { OnboardingStep } from '../../services/onboarding';

export const managerOnboardingSteps: Array<{
  id: OnboardingStep;
  title: string;
  body: string;
  actionLabel: string;
  actionPath?: string;
}> = [
  {
    id: 'welcome',
    title: 'Start your newsroom setup',
    body: 'We will point you to the few places that matter first: workspace basics, team setup, experts, and your first workflow action.',
    actionLabel: 'Continue',
  },
  {
    id: 'workspace_basics',
    title: 'Set workspace basics',
    body: 'Open Settings to review the core workspace setup before your team starts using the editorial system.',
    actionLabel: 'Open Settings',
    actionPath: '/app/settings#workspace-settings',
  },
  {
    id: 'team_setup',
    title: 'Check team roles',
    body: 'Invite teammates or review roles in Team Management so the manager workflow starts from a clear owner setup.',
    actionLabel: 'Open Team Management',
    actionPath: '/app/settings#team-management',
  },
  {
    id: 'experts_and_first_workflow',
    title: 'Move into the first workflow',
    body: 'Add or review experts, then use Suggest topics or Create draft to start the first real editorial action.',
    actionLabel: 'Open Experts',
    actionPath: '/app/experts',
  },
];

export const nextOnboardingStep = (step: OnboardingStep): OnboardingStep | null => {
  const index = managerOnboardingSteps.findIndex((item) => item.id === step);
  return managerOnboardingSteps[index + 1]?.id ?? null;
};
