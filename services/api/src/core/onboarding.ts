// PATH: services/api/src/core/onboarding.ts
// WHAT: Email-driven expert onboarding flow primitives
// WHY:  Implements 5-step voice profiling lifecycle for experts
// RELEVANT: services/api/src/routes/experts.ts,services/api/src/routes/webhooks.ts

import { and, eq } from 'drizzle-orm';
import type { EmailPort } from '@newsroom/shared';
import type { Database } from '../providers/db/index.js';
import { expertTable, onboardingSequenceTable, userTable } from '../providers/db/index.js';
import { logAudit } from './audit.js';
import { getOnboardingTemplate } from './email-templates/onboarding.js';

export interface OnboardingContext {
  db: Database;
  email: EmailPort;
}

export type ProcessReplyCode = 'PROCESSED' | 'MISSING_STEP' | 'INVALID_ORDER' | 'ALREADY_PROCESSED';

export interface ProcessReplyResult {
  status: 'processed' | 'ignored';
  code: ProcessReplyCode;
  completed: boolean;
  nextStep?: number;
}

interface OverdueOnboardingStep {
  id: string;
  expertId: string;
  stepNumber: number;
  reminderCount: number;
  sentAt: Date | null;
}

export interface OnboardingReminderCycleResult {
  remindersSent: number;
  escalationsSent: number;
  stalledExperts: number;
}

const FIRST_REMINDER_DELAY_HOURS = 48;
const SECOND_REMINDER_DELAY_HOURS = 96;
const MAX_REMINDER_COUNT = 2;

const hoursSince = (date: Date, now: Date): number => {
  return (now.getTime() - date.getTime()) / (60 * 60 * 1000);
};

const isReminderDue = (step: OverdueOnboardingStep, now: Date): boolean => {
  if (!step.sentAt) return false;
  const ageHours = hoursSince(step.sentAt, now);
  if (step.reminderCount <= 0) return ageHours >= FIRST_REMINDER_DELAY_HOURS;
  if (step.reminderCount === 1) return ageHours >= SECOND_REMINDER_DELAY_HOURS;
  return false;
};

export const buildOnboardingReplyAddress = (
  expertId: string,
  step: number,
  inboundAddress: string,
): string => {
  const [local, domain] = inboundAddress.split('@');
  return `${local}+onb_exp_${expertId}_step_${step}@${domain}`;
};

export const parseOnboardingReplyAddress = (
  to: string,
): { expertId: string; step: number } | null => {
  const local = to.split('@')[0] ?? '';
  const token = local.split('+')[1] ?? '';
  const match = token.match(/^onb_exp_(.+)_step_(\d)$/);
  if (!match) return null;
  return { expertId: match[1], step: Number(match[2]) };
};

const sendStepEmail = async (context: OnboardingContext, expertId: string, step: number) => {
  const [expert] = await context.db
    .select()
    .from(expertTable)
    .where(eq(expertTable.id, expertId))
    .limit(1);
  if (!expert) throw new Error('expert not found');
  const template = getOnboardingTemplate(step, expert.name);
  const inbound = process.env.EMAIL_INBOUND_ADDRESS ?? 'reply@mail-dev.vschernyshev.ru';
  const replyTo = buildOnboardingReplyAddress(expertId, step, inbound);
  await context.email.sendEmail({
    to: expert.email,
    ...template,
    replyTo,
    metadata: { step: String(step) },
  });
  await context.db
    .update(onboardingSequenceTable)
    .set({ status: 'sent', sentAt: new Date() } as Partial<
      typeof onboardingSequenceTable.$inferInsert
    >)
    .where(
      and(
        eq(onboardingSequenceTable.expertId, expertId),
        eq(onboardingSequenceTable.stepNumber, step),
      ),
    );
};

const incrementReminderCount = async (context: OnboardingContext, stepId: string) => {
  const [step] = await context.db
    .select()
    .from(onboardingSequenceTable)
    .where(eq(onboardingSequenceTable.id, stepId))
    .limit(1);
  if (!step) return;

  await context.db
    .update(onboardingSequenceTable)
    .set({ reminderCount: step.reminderCount + 1 } as Partial<
      typeof onboardingSequenceTable.$inferInsert
    >)
    .where(eq(onboardingSequenceTable.id, stepId));
};

const markStalled = async (context: OnboardingContext, expertId: string, stepId: string) => {
  await context.db
    .update(expertTable)
    .set({ status: 'stalled' } as Partial<typeof expertTable.$inferInsert>)
    .where(eq(expertTable.id, expertId));
  await context.db
    .update(onboardingSequenceTable)
    .set({ status: 'stalled' } as Partial<typeof onboardingSequenceTable.$inferInsert>)
    .where(eq(onboardingSequenceTable.id, stepId));
};

const escalateToManagers = async (
  context: OnboardingContext,
  expertId: string,
  stepNumber: number,
  reminderCount: number,
) => {
  const [expert] = await context.db
    .select()
    .from(expertTable)
    .where(eq(expertTable.id, expertId))
    .limit(1);
  if (!expert) return false;

  const managers = await context.db
    .select()
    .from(userTable)
    .where(eq(userTable.companyId, expert.companyId));
  if (managers.length === 0) return false;

  await Promise.all(
    managers.map((manager) =>
      context.email.sendEmail({
        to: manager.email,
        subject: `Onboarding stalled for ${expert.name}`,
        textBody: `Expert ${expert.name} is stalled on step ${stepNumber} after ${reminderCount} reminders.`,
        html: `<p>Expert <strong>${expert.name}</strong> is stalled on step <strong>${stepNumber}</strong> after ${reminderCount} reminders.</p>`,
      }),
    ),
  );

  await logAudit(context.db, {
    companyId: expert.companyId,
    actorType: 'system',
    action: 'onboarding.escalated',
    entityType: 'expert',
    entityId: expert.id,
    metadata: { step: stepNumber, reminder_count: reminderCount },
  });

  return true;
};

export const listOverdueSentSteps = async (
  context: OnboardingContext,
  now: Date = new Date(),
): Promise<OverdueOnboardingStep[]> => {
  const sentSteps = await context.db
    .select({
      id: onboardingSequenceTable.id,
      expertId: onboardingSequenceTable.expertId,
      stepNumber: onboardingSequenceTable.stepNumber,
      reminderCount: onboardingSequenceTable.reminderCount,
      sentAt: onboardingSequenceTable.sentAt,
    })
    .from(onboardingSequenceTable)
    .where(eq(onboardingSequenceTable.status, 'sent'));

  return sentSteps.filter((step) => isReminderDue(step, now));
};

export const runOnboardingReminderCycle = async (
  context: OnboardingContext,
): Promise<OnboardingReminderCycleResult> => {
  const overdue = await listOverdueSentSteps(context);
  let remindersSent = 0;
  let escalationsSent = 0;
  let stalledExperts = 0;

  for (const step of overdue) {
    await sendStepEmail(context, step.expertId, step.stepNumber);
    await incrementReminderCount(context, step.id);
    remindersSent += 1;

    const nextReminderCount = step.reminderCount + 1;
    if (nextReminderCount < MAX_REMINDER_COUNT) continue;

    const escalated = await escalateToManagers(
      context,
      step.expertId,
      step.stepNumber,
      nextReminderCount,
    );
    if (!escalated) continue;

    escalationsSent += 1;
    await markStalled(context, step.expertId, step.id);
    stalledExperts += 1;
  }

  return { remindersSent, escalationsSent, stalledExperts };
};

export const startOnboarding = async (context: OnboardingContext, expertId: string) => {
  await context.db
    .delete(onboardingSequenceTable)
    .where(eq(onboardingSequenceTable.expertId, expertId));
  await context.db
    .insert(onboardingSequenceTable)
    .values([1, 2, 3, 4, 5].map((step) => ({ expertId, stepNumber: step })));
  await context.db
    .update(expertTable)
    .set({ status: 'onboarding' } as Partial<typeof expertTable.$inferInsert>)
    .where(eq(expertTable.id, expertId));
  await sendStepEmail(context, expertId, 1);
};

export const processReply = async (
  context: OnboardingContext,
  expertId: string,
  step: number,
  responseData: string,
): Promise<ProcessReplyResult> => {
  if (step < 1 || step > 5) {
    return { status: 'ignored', code: 'INVALID_ORDER', completed: false };
  }

  const steps = await context.db
    .select()
    .from(onboardingSequenceTable)
    .where(eq(onboardingSequenceTable.expertId, expertId));
  const currentStep = steps.find((row) => row.stepNumber === step);
  if (!currentStep) {
    return { status: 'ignored', code: 'MISSING_STEP', completed: false };
  }

  const hasIncompletePreviousStep = steps
    .filter((row) => row.stepNumber < step)
    .some((row) => row.status !== 'replied');
  if (hasIncompletePreviousStep) {
    return { status: 'ignored', code: 'INVALID_ORDER', completed: false };
  }

  if (currentStep.status === 'replied') {
    if (step === 5) {
      return { status: 'ignored', code: 'ALREADY_PROCESSED', completed: true };
    }
    const nextStep = step + 1;
    const nextRow = steps.find((row) => row.stepNumber === nextStep);
    if (!nextRow) {
      return { status: 'ignored', code: 'MISSING_STEP', completed: false };
    }
    if (nextRow.status === 'pending') {
      await sendStepEmail(context, expertId, nextStep);
      return { status: 'processed', code: 'PROCESSED', completed: false, nextStep };
    }
    return { status: 'ignored', code: 'ALREADY_PROCESSED', completed: false };
  }

  if (currentStep.status !== 'sent') {
    return { status: 'ignored', code: 'INVALID_ORDER', completed: false };
  }

  const [updated] = await context.db
    .update(onboardingSequenceTable)
    .set({
      status: 'replied',
      repliedAt: new Date(),
      responseData: { text: responseData },
    } as Partial<typeof onboardingSequenceTable.$inferInsert>)
    .where(
      and(
        eq(onboardingSequenceTable.expertId, expertId),
        eq(onboardingSequenceTable.stepNumber, step),
        eq(onboardingSequenceTable.status, 'sent'),
      ),
    )
    .returning({ id: onboardingSequenceTable.id });

  if (!updated) {
    return {
      status: 'ignored',
      code: 'ALREADY_PROCESSED',
      completed: step === 5,
    };
  }

  if (step < 5) {
    const nextStep = step + 1;
    await sendStepEmail(context, expertId, nextStep);
    return { status: 'processed', code: 'PROCESSED', completed: false, nextStep };
  }
  return { status: 'processed', code: 'PROCESSED', completed: true };
};

export const checkStalled = async (context: OnboardingContext, expertId: string) => {
  const [expert] = await context.db
    .select()
    .from(expertTable)
    .where(eq(expertTable.id, expertId))
    .limit(1);
  if (!expert) return false;
  if (expert.status === 'stalled') return true;

  const pending = await context.db
    .select()
    .from(onboardingSequenceTable)
    .where(
      and(
        eq(onboardingSequenceTable.expertId, expertId),
        eq(onboardingSequenceTable.status, 'sent'),
      ),
    );
  return pending.some((step) => step.reminderCount >= MAX_REMINDER_COUNT);
};
