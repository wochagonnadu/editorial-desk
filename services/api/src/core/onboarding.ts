// PATH: services/api/src/core/onboarding.ts
// WHAT: Email-driven expert onboarding flow primitives
// WHY:  Implements 5-step voice profiling lifecycle for experts
// RELEVANT: services/api/src/routes/experts.ts,services/api/src/routes/webhooks.ts

import { and, eq } from 'drizzle-orm';
import type { EmailPort } from '@newsroom/shared';
import type { Database } from '../providers/db';
import { expertTable, onboardingSequenceTable, userTable } from '../providers/db';
import { getOnboardingTemplate } from './email-templates/onboarding';

export interface OnboardingContext {
  db: Database;
  email: EmailPort;
}

export const buildOnboardingReplyAddress = (expertId: string, step: number, inboundAddress: string): string => {
  const [local, domain] = inboundAddress.split('@');
  return `${local}+onb_exp_${expertId}_step_${step}@${domain}`;
};

export const parseOnboardingReplyAddress = (to: string): { expertId: string; step: number } | null => {
  const local = to.split('@')[0] ?? '';
  const token = local.split('+')[1] ?? '';
  const match = token.match(/^onb_exp_(.+)_step_(\d)$/);
  if (!match) return null;
  return { expertId: match[1], step: Number(match[2]) };
};

const sendStepEmail = async (context: OnboardingContext, expertId: string, step: number) => {
  const [expert] = await context.db.select().from(expertTable).where(eq(expertTable.id, expertId)).limit(1);
  if (!expert) throw new Error('expert not found');
  const template = getOnboardingTemplate(step, expert.name);
  const inbound = process.env.EMAIL_INBOUND_ADDRESS ?? 'reply@inbound.newsroom.dev';
  const replyTo = buildOnboardingReplyAddress(expertId, step, inbound);
  await context.email.sendEmail({ to: expert.email, ...template, replyTo, metadata: { step: String(step) } });
  await context.db
    .update(onboardingSequenceTable)
    .set({ status: 'sent', sentAt: new Date() })
    .where(and(eq(onboardingSequenceTable.expertId, expertId), eq(onboardingSequenceTable.stepNumber, step)));
};

export const startOnboarding = async (context: OnboardingContext, expertId: string) => {
  await context.db.delete(onboardingSequenceTable).where(eq(onboardingSequenceTable.expertId, expertId));
  await context.db.insert(onboardingSequenceTable).values([1, 2, 3, 4, 5].map((step) => ({ expertId, stepNumber: step })));
  await context.db.update(expertTable).set({ status: 'onboarding' }).where(eq(expertTable.id, expertId));
  await sendStepEmail(context, expertId, 1);
};

export const processReply = async (context: OnboardingContext, expertId: string, step: number, responseData: string) => {
  await context.db
    .update(onboardingSequenceTable)
    .set({ status: 'replied', repliedAt: new Date(), responseData: { text: responseData } })
    .where(and(eq(onboardingSequenceTable.expertId, expertId), eq(onboardingSequenceTable.stepNumber, step)));
  if (step < 5) {
    await sendStepEmail(context, expertId, step + 1);
    return { completed: false, nextStep: step + 1 };
  }
  return { completed: true };
};

export const checkStalled = async (context: OnboardingContext, expertId: string) => {
  const pending = await context.db
    .select()
    .from(onboardingSequenceTable)
    .where(and(eq(onboardingSequenceTable.expertId, expertId), eq(onboardingSequenceTable.status, 'sent')));
  const stalled = pending.some((step) => step.reminderCount >= 3);
  if (!stalled) return false;

  const [expert] = await context.db.select().from(expertTable).where(eq(expertTable.id, expertId)).limit(1);
  if (!expert) return true;
  const managers = await context.db.select().from(userTable).where(eq(userTable.companyId, expert.companyId));
  await Promise.all(managers.map((manager) => context.email.sendEmail({
    to: manager.email,
    subject: `Onboarding stalled for ${expert.name}`,
    textBody: `Expert ${expert.name} has missed 3 reminders.`,
    html: `<p>Expert ${expert.name} has missed 3 reminders.</p>`,
  })));
  return true;
};
