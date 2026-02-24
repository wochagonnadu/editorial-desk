// PATH: services/api/src/routes/drafts/voice-rating.ts
// WHAT: Handler for expert voice rating from email links
// WHY:  Finalizes voice test approval without requiring dashboard login
// RELEVANT: services/api/src/core/voice.ts,services/api/src/routes/drafts.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { AppError } from '../../core/errors';
import { recordSelfRating } from '../../core/voice';
import { draftTable, expertTable, notificationTable } from '../../providers/db';
import type { RouteDeps } from '../deps';

const parseScore = (queryScore: string | undefined, bodyScore: unknown): number => {
  const raw = queryScore ?? (typeof bodyScore === 'number' ? String(bodyScore) : undefined);
  const score = Number(raw);
  if (!Number.isInteger(score) || score < 1 || score > 10) throw new AppError(400, 'VALIDATION_ERROR', 'score must be 1-10');
  return score;
};

export const handleVoiceRating = (deps: RouteDeps) => async (context: Context) => {
  const draftId = context.req.param('id');
  const body = (await context.req.json().catch(() => ({}))) as { score?: number; token?: string };
  const score = parseScore(context.req.query('score'), body.score);
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
  if (!expert || expert.email !== notification.recipientEmail) throw new AppError(403, 'FORBIDDEN', 'only assigned expert can rate');

  const result = await recordSelfRating(deps.db, { draftId, expertId: expert.id, score });
  return context.json({ recorded: result.recorded, below_threshold: result.belowThreshold, revision_offered: result.revisionOffered });
};
