// PATH: services/api/src/worker/job-key.ts
// WHAT: Helpers for deterministic worker idempotency keys
// WHY:  Avoids duplicated side effects from repeated cron/webhook triggers
// RELEVANT: services/api/src/worker/types.ts,services/api/src/worker/runtime.ts

export const approvalReminderJobKey = (stepId: string, nextReminderCount: number): string => {
  return `approval_step:${stepId}:reminder:${nextReminderCount}`;
};

export const approvalEscalationJobKey = (stepId: string, nextReminderCount: number): string => {
  return `approval_step:${stepId}:escalation:${nextReminderCount}`;
};

export const onboardingReminderJobKey = (stepId: string, nextReminderCount: number): string => {
  return `onboarding_step:${stepId}:reminder:${nextReminderCount}`;
};

export const onboardingEscalationJobKey = (stepId: string, nextReminderCount: number): string => {
  return `onboarding_step:${stepId}:escalation:${nextReminderCount}`;
};

export const digestJobKey = (companyId: string, ownerId: string, period: string): string => {
  return `digest:${companyId}:${ownerId}:${period}`;
};
