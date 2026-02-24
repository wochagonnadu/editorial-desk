// PATH: services/api/src/routes/drafts.ts
// WHAT: Draft endpoints used in onboarding voice-rating flow
// WHY:  Allows experts to confirm voice fidelity from email links
// RELEVANT: services/api/src/core/voice.ts,services/api/src/core/email-templates/rating.ts

import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { AppError } from '../core/errors';
import { recordSelfRating } from '../core/voice';
import { draftTable, expertTable, notificationTable } from '../providers/db';
import type { RouteDeps } from './deps';

const readScore = (queryScore: string | undefined, bodyScore: unknown): number => {
  const raw = queryScore ?? (typeof bodyScore === 'number' ? String(bodyScore) : undefined);
  const score = Number(raw);
  if (!Number.isInteger(score) || score < 1 || score > 10) throw new AppError(400, 'VALIDATION_ERROR', 'score must be 1-10');
  return score;
};

export const buildDraftRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  const handleVoiceRating = async (context: Context) => {
    const draftId = context.req.param('id');
    const body = (await context.req.json().catch(() => ({}))) as { score?: number; token?: string };
    const score = readScore(context.req.query('score'), body.score);
    const token = context.req.query('token') ?? body.token;
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'token is required');

    const [notification] = await deps.db
      .select()
      .from(notificationTable)
      .where(and(eq(notificationTable.emailToken, token), eq(notificationTable.referenceId, draftId)))
      .limit(1);
    if (!notification) throw new AppError(403, 'FORBIDDEN', 'invalid token');

    const [draft] = await deps.db.select().from(draftTable).where(eq(draftTable.id, draftId)).limit(1);
    if (!draft) throw new AppError(404, 'NOT_FOUND', 'draft not found');
    const [expert] = await deps.db.select().from(expertTable).where(eq(expertTable.id, draft.expertId)).limit(1);
    if (!expert || expert.email !== notification.recipientEmail) {
      throw new AppError(403, 'FORBIDDEN', 'only assigned expert can rate');
    }

    const result = await recordSelfRating(deps.db, { draftId, expertId: expert.id, score });
    return context.json({ recorded: result.recorded, below_threshold: result.belowThreshold, revision_offered: result.revisionOffered });
  };

  router.post('/:id/voice-rating', handleVoiceRating);
  router.get('/:id/voice-rating', handleVoiceRating);

  return router;
};
