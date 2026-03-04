// PATH: services/api/src/core/onboarding-finalize.ts
// WHAT: Finalization of onboarding into voice profile and voice test draft
// WHY:  Transitions expert from onboarding steps to measurable voice confirmation
// RELEVANT: services/api/src/core/onboarding.ts,services/api/src/routes/webhooks.ts

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { EmailPort } from '@newsroom/shared';
import { buildRatingTemplate } from './email-templates/rating.js';
import { buildVoiceProfile, calculateVoiceScore, generateVoiceTest } from './voice.js';
import type { Database } from '../providers/db/index.js';
import {
  DrizzleDraftStore,
  expertTable,
  notificationTable,
  onboardingSequenceTable,
  topicTable,
  voiceProfileTable,
} from '../providers/db/index.js';

interface FinalizeContext {
  db: Database;
  email: EmailPort;
}

export const finalizeOnboardingVoiceTest = async (context: FinalizeContext, expertId: string) => {
  const [expert] = await context.db
    .select()
    .from(expertTable)
    .where(eq(expertTable.id, expertId))
    .limit(1);
  if (!expert) throw new Error('expert not found');
  if (expert.status !== 'onboarding') {
    return { skipped: true as const, reason: 'already_finalized' as const };
  }

  const steps = await context.db
    .select()
    .from(onboardingSequenceTable)
    .where(eq(onboardingSequenceTable.expertId, expertId));
  const responses = steps
    .filter(
      (step) =>
        step.responseData && typeof (step.responseData as { text?: unknown }).text === 'string',
    )
    .map((step) => (step.responseData as { text: string }).text);

  const profileData = buildVoiceProfile(responses);
  const [existingProfile] = await context.db
    .select()
    .from(voiceProfileTable)
    .where(eq(voiceProfileTable.expertId, expertId))
    .limit(1);
  if (existingProfile) {
    await context.db
      .update(voiceProfileTable)
      .set({ profileData, updatedAt: new Date() } as Partial<typeof voiceProfileTable.$inferInsert>)
      .where(eq(voiceProfileTable.id, existingProfile.id));
  } else {
    await context.db.insert(voiceProfileTable).values({
      expertId,
      status: 'draft',
      profileData,
      publicTextsData: {},
      voiceTestFeedback: [],
    } as unknown as typeof voiceProfileTable.$inferInsert);
  }

  const [topic] = await context.db
    .insert(topicTable)
    .values({
      companyId: expert.companyId,
      expertId: expert.id,
      title: `Voice test: ${expert.name}`,
      sourceType: 'manual',
      status: 'approved',
      proposedBy: 'system',
    } as unknown as typeof topicTable.$inferInsert)
    .returning();
  const draftStore = new DrizzleDraftStore(context.db);
  const draft = await draftStore.create({
    topicId: topic.id,
    expertId: expert.id,
    companyId: expert.companyId,
    status: 'drafting',
  });

  const content = generateVoiceTest(profileData);
  const version = await draftStore.createVersion({
    draftId: draft.id,
    content,
    summary: 'Voice test draft',
    voiceScore: calculateVoiceScore(profileData, content),
    createdBy: 'system',
    diffFromPrevious: { type: 'voice_test' },
  });

  const emailToken = randomUUID();
  await context.db.insert(notificationTable).values({
    companyId: expert.companyId,
    recipientEmail: expert.email,
    notificationType: 'voice_test',
    referenceType: 'draft',
    referenceId: draft.id,
    emailToken,
    status: 'sent',
    sentAt: new Date(),
  } as unknown as typeof notificationTable.$inferInsert);

  const template = buildRatingTemplate(
    expert.name,
    draft.id,
    emailToken,
    process.env.APP_URL ?? 'http://localhost:5173',
  );
  await context.email.sendEmail({ to: expert.email, ...template });
  await context.db
    .update(expertTable)
    .set({ status: 'voice_testing' } as Partial<typeof expertTable.$inferInsert>)
    .where(eq(expertTable.id, expert.id));
  return { draftId: draft.id, versionNumber: version.versionNumber };
};
