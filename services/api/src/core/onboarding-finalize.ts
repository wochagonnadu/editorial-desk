// PATH: services/api/src/core/onboarding-finalize.ts
// WHAT: Finalization of onboarding into voice profile and voice test draft
// WHY:  Transitions expert from onboarding steps to measurable voice confirmation
// RELEVANT: services/api/src/core/onboarding.ts,services/api/src/routes/webhooks.ts

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { ContentPort, EmailPort } from '@newsroom/shared';
import { buildRatingTemplate } from './email-templates/rating.js';
import { findSenderNameByUserId } from './email-sender.js';
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
  content: ContentPort;
}

const buildHeuristicVoiceProfile = (
  responses: string[],
  publicTextUrls: string[],
): Record<string, unknown> => {
  const base = buildVoiceProfile(responses);
  return {
    ...base,
    profile_version: '1.0.0',
    tone_tags: ['calm', 'practical'],
    vocabulary_do: [],
    vocabulary_avoid: ['100% guarantee', 'zero risk'],
    sentence_style: { length: 'medium', cadence: 'steady', paragraph_density: 'balanced' },
    boundaries: ['no absolute guarantees', 'no unsupported stats'],
    confidence: 0.35,
    source_coverage: {
      onboarding_steps_replied: responses.length,
      links_processed: publicTextUrls.length,
      samples_used: 0,
      edit_diffs_used: 0,
    },
    generated_at: new Date().toISOString(),
  };
};

const synthesizeVoiceProfile = async (
  context: FinalizeContext,
  input: { responses: string[]; publicTextUrls: string[]; domain: string },
): Promise<Record<string, unknown>> => {
  const fallback = buildHeuristicVoiceProfile(input.responses, input.publicTextUrls);
  try {
    const result = await context.content.generateObject<{ profile: Record<string, unknown> }>({
      meta: {
        useCase: 'expert.voice.synthesize',
        promptId: 'expert.voice.synthesize.base',
        promptVersion: '1.0.0',
      },
      promptVars: {
        onboarding_replies_json: JSON.stringify(input.responses),
        public_text_urls_json: JSON.stringify(input.publicTextUrls),
        public_text_samples_json: JSON.stringify([]),
        expert_edit_diffs_json: JSON.stringify([]),
        domain: input.domain,
      },
      schema: {
        type: 'object',
        properties: {
          profile: { type: 'object' },
        },
        required: ['profile'],
      },
    });
    const profile = result.profile;
    if (!profile || typeof profile !== 'object') return fallback;
    return {
      ...fallback,
      ...profile,
      profile_version: String(
        (profile as { profile_version?: unknown }).profile_version ?? '1.0.0',
      ),
      confidence: Number((profile as { confidence?: unknown }).confidence ?? 0.55),
      generated_at: new Date().toISOString(),
    };
  } catch {
    return fallback;
  }
};

const collectStreamText = async (stream: AsyncIterable<string>): Promise<string> => {
  const chunks: string[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks.join('').trim();
};

const generateVoiceTestDraft = async (
  context: FinalizeContext,
  input: {
    expertName: string;
    domain: string;
    profileData: Record<string, unknown>;
    responses: string[];
    publicTextUrls: string[];
  },
): Promise<string> => {
  const fallback = generateVoiceTest(input.profileData);
  try {
    const stream = await context.content.streamText({
      meta: {
        useCase: 'expert.voice.test.generate',
        promptId: 'expert.voice.test.generate.base',
        promptVersion: '1.0.0',
      },
      promptVars: {
        expert_name: input.expertName,
        domain: input.domain,
        voice_profile_json: JSON.stringify(input.profileData),
        onboarding_replies_json: JSON.stringify(input.responses),
        public_text_urls_json: JSON.stringify(input.publicTextUrls),
      },
    });
    const generated = await collectStreamText(stream);
    return generated.length > 0 ? generated : fallback;
  } catch {
    return fallback;
  }
};

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

  const publicTextUrls = Array.isArray(expert.publicTextUrls)
    ? expert.publicTextUrls.filter((item): item is string => typeof item === 'string')
    : [];
  const profileData = await synthesizeVoiceProfile(context, {
    responses,
    publicTextUrls,
    domain: expert.domain,
  });
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

  const content = await generateVoiceTestDraft(context, {
    expertName: expert.name,
    domain: expert.domain,
    profileData,
    responses,
    publicTextUrls,
  });
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
    process.env.API_URL ?? process.env.APP_URL ?? 'http://localhost:3000',
    content,
  );
  const fromName = await findSenderNameByUserId(context.db, expert.managerUserId);
  await context.email.sendEmail({ to: expert.email, fromName, ...template });
  await context.db
    .update(expertTable)
    .set({ status: 'voice_testing' } as Partial<typeof expertTable.$inferInsert>)
    .where(eq(expertTable.id, expert.id));
  return { draftId: draft.id, versionNumber: version.versionNumber };
};
