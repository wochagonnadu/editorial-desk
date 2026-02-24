// PATH: services/api/src/core/voice.ts
// WHAT: Voice profile build, scoring, test generation, and rating logic
// WHY:  Centralizes fidelity behavior required by Constitution II
// RELEVANT: services/api/src/core/onboarding-finalize.ts,services/api/src/routes/drafts.ts

import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../providers/db';
import { draftTable, draftVersionTable, expertTable, voiceProfileTable } from '../providers/db';

export const buildVoiceProfile = (responses: string[]): Record<string, unknown> => {
  const joined = responses.join(' ').trim();
  const words = joined.split(/\s+/).filter((token) => token.length > 4).slice(0, 30);
  return {
    descriptive_words: words.slice(0, 5),
    signature_phrases: words.slice(5, 10),
    source_count: responses.length,
  };
};

export const calculateVoiceScore = (profile: Record<string, unknown>, text: string): number => {
  const phrases = Array.isArray(profile.signature_phrases) ? profile.signature_phrases : [];
  const matches = phrases.filter((phrase) => typeof phrase === 'string' && text.includes(phrase)).length;
  const raw = phrases.length === 0 ? 0.6 : matches / phrases.length;
  return Number(Math.max(0.1, Math.min(1, raw + 0.2)).toFixed(2));
};

export const generateVoiceTest = (profile: Record<string, unknown>): string => {
  const words = Array.isArray(profile.descriptive_words) ? profile.descriptive_words.join(', ') : 'clear, practical';
  return `Voice test draft: this short editorial sample mirrors your style: ${words}. ` +
    'It keeps a calm tone, practical structure, and clear next steps for readers.';
};

interface RatingInput {
  draftId: string;
  expertId: string;
  score: number;
}

export const recordSelfRating = async (db: Database, input: RatingInput) => {
  if (input.score < 1 || input.score > 10) throw new Error('score must be from 1 to 10');

  const [draft] = await db.select().from(draftTable).where(eq(draftTable.id, input.draftId)).limit(1);
  if (!draft || draft.expertId !== input.expertId) throw new Error('expert is not assigned to this draft');

  const [latest] = await db
    .select()
    .from(draftVersionTable)
    .where(eq(draftVersionTable.draftId, draft.id))
    .orderBy(desc(draftVersionTable.versionNumber))
    .limit(1);
  if (!latest) throw new Error('draft has no versions');

  const metadata = { ...(latest.diffFromPrevious as Record<string, unknown> | null), voice_rating: input.score };
  await db.update(draftVersionTable).set({ diffFromPrevious: metadata }).where(eq(draftVersionTable.id, latest.id));

  const belowThreshold = input.score < 7;
  if (!belowThreshold) {
    await db
      .update(voiceProfileTable)
      .set({ status: 'confirmed', confirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(voiceProfileTable.expertId, input.expertId));
    await db.update(expertTable).set({ status: 'active' }).where(eq(expertTable.id, input.expertId));
  }

  return { recorded: true, belowThreshold, revisionOffered: belowThreshold };
};
