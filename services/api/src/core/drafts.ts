// PATH: services/api/src/core/drafts.ts
// WHAT: Draft lifecycle orchestration helpers and state transitions
// WHY:  Keeps generation/factcheck/revision flow idempotent and explicit
// RELEVANT: services/api/src/routes/drafts.ts,services/api/src/providers/db/draft-store.ts

import { and, eq } from 'drizzle-orm';
import type { DraftStore } from '@newsroom/shared';
import { AppError } from './errors';
import type { Database } from '../providers/db';
import { draftTable, expertTable, topicTable } from '../providers/db';

const allowedTransitions: Record<string, string[]> = {
  drafting: ['factcheck', 'revisions'],
  factcheck: ['needs_review', 'drafting'],
  needs_review: ['approved', 'revisions'],
  revisions: ['drafting'],
  approved: [],
};

export const createDraft = async (db: Database, draftStore: DraftStore, companyId: string, topicId: string) => {
  const [topic] = await db
    .select()
    .from(topicTable)
    .where(and(eq(topicTable.id, topicId), eq(topicTable.companyId, companyId)))
    .limit(1);
  if (!topic) throw new AppError(404, 'NOT_FOUND', 'Topic not found');
  if (topic.status !== 'approved') throw new AppError(400, 'INVALID_STATE', 'Topic must be approved');
  if (!topic.expertId) throw new AppError(400, 'INVALID_STATE', 'Topic must have assigned expert');

  const [expert] = await db.select().from(expertTable).where(eq(expertTable.id, topic.expertId)).limit(1);
  if (!expert || expert.status !== 'active') {
    throw new AppError(400, 'INVALID_STATE', 'Expert must be active');
  }

  const [existing] = await db.select().from(draftTable).where(eq(draftTable.topicId, topicId)).limit(1);
  if (existing) {
    return { id: existing.id, topicId: existing.topicId, expertId: existing.expertId, status: existing.status };
  }

  return draftStore.create({ topicId, expertId: topic.expertId, companyId, status: 'drafting' });
};

export const createVersion = async (
  draftStore: DraftStore,
  draftId: string,
  content: string,
  summary: string,
  voiceScore: number,
  createdBy: 'system' | 'revision',
) => {
  return draftStore.createVersion({ draftId, content, summary, voiceScore, createdBy, diffFromPrevious: { summary } });
};

export const transitionDraftStatus = async (db: Database, draftId: string, nextStatus: string) => {
  const [draft] = await db.select().from(draftTable).where(eq(draftTable.id, draftId)).limit(1);
  if (!draft) throw new AppError(404, 'NOT_FOUND', 'Draft not found');
  if (draft.status === nextStatus) return draft;

  const allowed = allowedTransitions[draft.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(422, 'INVALID_STATE', `Cannot move from ${draft.status} to ${nextStatus}`);
  }

  const [updated] = await db
    .update(draftTable)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(draftTable.id, draftId))
    .returning();
  return updated;
};
